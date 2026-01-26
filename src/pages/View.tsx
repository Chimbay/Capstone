import { DocumentAPI } from '@api/document'
import { useParams } from '@solidjs/router'
import { useToast } from '@ui/toast/ToastContext'
import { createResource, Show } from 'solid-js'

export default function View() {
  const params: { uuid: string } = useParams<{
    uuid: string
  }>()
  const { error } = useToast()
  const [data] = createResource(async () => {
    try {
      return DocumentAPI.file_read_by_uuid(params.uuid)
    } catch (err: unknown) {
      error(String(err))
    }
  })

  return (
    <div>
      <Show when={data()} fallback={<>Loading...</>}>
        {text => text()}
      </Show>
    </div>
  )
}
