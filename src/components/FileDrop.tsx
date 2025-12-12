import { file_input } from '@components/file_input'

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
