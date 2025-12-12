import { invoke } from '@tauri-apps/api/core'
import { warn } from '@tauri-apps/plugin-log'

async function read_file(selected_file: File): Promise<void> {
  // Converts file into an array buffer to pass to R
  const arrayBuffer = new Uint8Array(await selected_file.arrayBuffer())
  void invoke('pdf_to_text', {
    fileBytes: Array.from(arrayBuffer)
  }).catch((err: string) => {
    void warn(`Error loading file: ${err}`)
  })
}

export function file_input(event: Event) {
  const target = event.target as HTMLInputElement
  // This needs to be changed
  const selected_file = target.files?.[0]

  if (!selected_file) return
  void read_file(selected_file)
}
