import { invoke } from '@tauri-apps/api/core'
import { CreatedFile, FileMetadata } from './types'

export const DocumentAPI = {
  // --- For library component ---
  async library_list(): Promise<FileMetadata[]> {
    return await invoke('library_list')
  },
  async delete_file(uuid: string): Promise<void> {
    return await invoke('delete_file', { uuid })
  },
  async create_new_file(data: CreatedFile): Promise<void> {
    return await invoke('create_new_file', { data: data })
  },

  // --- For backend purposes ---
  // Sends each file as raw bytes; the title rides in a header (URI-encoded, headers are ASCII-only)
  async file_upload(file: FileList): Promise<void> {
    for (const f of file) {
      await invoke('file_upload', new Uint8Array(await f.arrayBuffer()), {
        headers: { title: encodeURIComponent(f.name) }
      })
    }
  },
  async file_read_by_uuid(uuid: string): Promise<string> {
    return await invoke('file_read_by_uuid', { uuid })
  },
  async file_save(uuid: string, content: string): Promise<void> {
    return await invoke('file_save', { uuid, content })
  }
}
