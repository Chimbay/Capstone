import { invoke } from '@tauri-apps/api/core'
import { FileInfo, TreeNode } from './types'

// Folder arguments are paths relative to the library root; '' is the root.
export const DocumentAPI = {
  // --- Library location ---
  async library_location(): Promise<string | null> {
    return await invoke('library_location')
  },
  // Opens the native folder picker; resolves to the new location, or null if cancelled.
  async choose_library(): Promise<string | null> {
    return await invoke('choose_library')
  },

  // --- For library component ---
  async library_tree(): Promise<TreeNode[]> {
    return await invoke('library_tree')
  },
  async create_folder(folder: string, name: string): Promise<void> {
    return await invoke('create_folder', { folder, name })
  },
  async delete_folder(path: string): Promise<void> {
    return await invoke('delete_folder', { path })
  },
  async delete_file(uuid: string): Promise<void> {
    return await invoke('delete_file', { uuid })
  },
  async create_new_file(folder: string, title: string): Promise<void> {
    return await invoke('create_new_file', { folder, title })
  },
  async create_board(folder: string, title: string): Promise<void> {
    return await invoke('create_board', { folder, title })
  },

  // --- For backend purposes ---
  // Sends each file as raw bytes; title and folder ride in headers (URI-encoded, headers are ASCII-only)
  async file_upload(file: FileList, folder: string): Promise<void> {
    for (const f of file) {
      await invoke('file_upload', new Uint8Array(await f.arrayBuffer()), {
        headers: { title: encodeURIComponent(f.name), folder: encodeURIComponent(folder) }
      })
    }
  },
  async file_read_by_uuid(uuid: string): Promise<string> {
    return await invoke('file_read_by_uuid', { uuid })
  },
  // Current name and contents, for cards that link to a note.
  async file_info(uuid: string): Promise<FileInfo> {
    return await invoke('file_info', { uuid })
  },
  async file_save(uuid: string, content: string): Promise<void> {
    return await invoke('file_save', { uuid, content })
  }
}
