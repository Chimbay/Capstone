import { invoke } from '@tauri-apps/api/core'

type BufferType = 'Original' | 'Add'
interface Piece {
  buffer: BufferType
  start: number
  len: number
}

export const DocumentAPI = {
  // For library component
  async library_list(): Promise<string[]> {
    return await invoke('library_list')
  },

  // For editor purposes
  async init_document(text: string): Promise<void> {
    await invoke('init_document', { text })
  },
  async insert_text(position: number, text: string): Promise<void> {
    await invoke('insert_text', { position: position, text: text })
  },
  async get_table(): Promise<[string, string, Piece[]]> {
    return await invoke('get_table')
  },

  // For backend purposes
  async file_upload(file: File): Promise<void> {
    // Converts file into an array buffer to pass to R
    const arrayBuffer = new Uint8Array(await file.arrayBuffer())
    void await invoke('file_upload', {bytes: Array.from(arrayBuffer), title:file.name})
  },
  async md_to_text(file: string): Promise<string> {
    return await invoke<string>('md_to_text', { path: file })
  },
}
