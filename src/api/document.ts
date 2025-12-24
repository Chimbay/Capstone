import { invoke } from '@tauri-apps/api/core'

type BufferType = 'Original' | 'Add'
interface Piece {
  buffer: BufferType
  start: number
  len: number
}

export const DocumentAPI = {
  async init_document(text: string): Promise<void> {
    await invoke('init_document', { text })
  },
  async insert_text(position: number, text: string): Promise<void> {
    await invoke('insert_text', { position: position, text: text })
  },
  async get_table(): Promise<[string, string, Piece[]]> {
    return await invoke('get_table')
  },

  async md_to_text(file: string): Promise<string> {
    return await invoke<string>('md_to_text', { path: file })
  },
  async debug_pdf_to_text(selected_file: string): Promise<void> {
    await invoke('debug_pdf_to_text', { file: selected_file })
  },
  async pdf_to_text(selected_file: File): Promise<void> {
    // Converts file into an array buffer to pass to R
    const arrayBuffer = new Uint8Array(await selected_file.arrayBuffer())
    const fileName = selected_file.name
    void invoke('pdf_to_text', {
      fileBytes: Array.from(arrayBuffer),
      fileName: fileName
    })
  },
  async library_list(): Promise<string[]> {
    return await invoke<string[]>('library_list')
  }
}
