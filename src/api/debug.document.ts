import { invoke } from '@tauri-apps/api/core'

export const DebugDocumentAPI = {
  async debug_obtain_inputs(): Promise<string[]> {
    return await invoke('debug_obtain_inputs')
  },
  async debug_pdf_to_text(selected_file: string): Promise<void> {
    await invoke('debug_pdf_to_text', { file: selected_file })
  }
}
