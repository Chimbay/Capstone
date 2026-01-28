import { DocumentAPI } from "@api/document"

function file_input(event: Event) {
  const target = event.target as HTMLInputElement  
  const uploaded_files = target.files

  if (!uploaded_files) return
  void DocumentAPI.file_upload(uploaded_files)
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
