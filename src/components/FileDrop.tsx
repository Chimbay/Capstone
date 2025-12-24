import { DocumentAPI } from "@api/document"

function file_input(event: Event) {
  const target = event.target as HTMLInputElement
  // This needs to be changed
  const selected_file = target.files?.[0]

  if (!selected_file) return
  void DocumentAPI.pdf_to_text(selected_file)
}

export default function FileDrop() {
  return (
    <div>
      <input
        class="box-border border p-1"
        type="file"
        id="text_file"
        onChange={e => {
          void file_input(e)
        }}
      />
    </div>
  )
}
