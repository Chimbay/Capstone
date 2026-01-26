import { invoke } from '@tauri-apps/api/core'

type BufferType = 'Original' | 'Add'
interface Piece {
  buffer: BufferType
  start: number
  len: number
}

interface FileMetadata {
  uuid: string
  display_name: string
  path: string
  created: string
  modified: string
}

export const DocumentAPI = {
  // --- For library component ---
  async library_list(): Promise<FileMetadata[]> {
    return await invoke('library_list')
  },

  // --- For editor purposes ---
  async init_document(text: string): Promise<void> {
    await invoke('init_document', { text })
  },
  async insert_text(position: number, text: string): Promise<void> {
    await invoke('insert_text', { position: position, text: text })
  },
  async get_table(): Promise<[string, string, Piece[]]> {
    return await invoke('get_table')
  },

  // --- For backend purposes ---
  // Converts file into an array buffer to pass to R
  async file_upload(file: FileList): Promise<void> {
    // Checks if there are multiple files
    for (const f of file) {
      const arrayBuffer = new Uint8Array(await f.arrayBuffer())
      const data = {
        bytes: Array.from(arrayBuffer),
        title: f.name
      }
      void (await invoke('file_upload', data))
    }
  },
  async file_read_by_uuid(uuid: string): Promise<string> {
    return await invoke<string>('file_read_by_uuid', { uuid })
  }
}
