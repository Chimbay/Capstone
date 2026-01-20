import { invoke } from '@tauri-apps/api/core'

type BufferType = 'Original' | 'Add'
interface Piece {
  buffer: BufferType
  start: number
  len: number
}

interface FileMetadata {
    id: string,
    display_name: string,
    created: string,
    modified: string,
}
interface Items {
  meta_data: FileMetadata[]
  paths: string[]
} 

export const DocumentAPI = {
  // --- For library component ---
  async library_list(): Promise<Items> {
    return await invoke<Items>('library_list')    
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
  async md_to_text(file: string): Promise<string> {
    return await invoke<string>('md_to_text', { path: file })
  }
}
