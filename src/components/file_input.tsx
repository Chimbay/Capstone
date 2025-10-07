import { info, warn} from '@tauri-apps/plugin-log'
import { createEffect, createSignal } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'



export default function FileInput() {
  const [file, setFile] = createSignal<File | null>(null);
  const [text, setText] = createSignal<string | null>(null);

  const readFile = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const selected_file = target.files?.[0]
    if (!selected_file) return

    setFile(selected_file)
    await info(
      `File: ${selected_file.name}, Size: ${selected_file.size}, Type: ${selected_file.type}`
    )
  }

  createEffect(() => {
    const loadFile = async() => {
      const current_file = file();
      if(current_file) {

      const array_buffer = new Uint8Array(await current_file.arrayBuffer());
        invoke('pdf_to_text', {fileBytes: Array.from(array_buffer)})
        .then((return_value: string) => {
          setText(return_value)
        })
        .catch((err) => {
          void warn(`Error: ${err}`)
        });
      }
    }
  });

  return (
    <div class="flex flex-col">
      <label for="text_file">Input your file</label>
      <input
        class="box-border border p-1"
        type="file"
        id="text_file"
        onChange={e => {
          void readFile(e)
        }}
      />
  {text() != null && (
    <>{text()}</>
  )}
    </div>
  )
}
