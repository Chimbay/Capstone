import { invoke } from '@tauri-apps/api/core'
import { CreatedFile, FileMetadata, Piece } from './types'


export const DocumentAPI = {
  // --- For library component ---
  async library_list(): Promise<FileMetadata[]> {
    return await invoke('library_list')
  },
  async delete_file(file: FileMetadata): Promise<void> {
    return await invoke('delete_file', { file: file })
  },
  async create_new_file(data: CreatedFile): Promise<void> {
    return await invoke('create_new_file', {data: data})
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
