import { useSolidFlow, type NodeProps } from '@dschz/solid-flow'
import type { TextData } from '../boardFile'
import { useBoard } from '../context'
import Editable from '../Editable'
import Sides from './Sides'

export default function TextNode(props: NodeProps<TextData, 'text'>) {
  const flow = useSolidFlow()
  const board = useBoard()
  return (
    <div class="min-h-[48px] w-[180px] rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm">
      <Sides />
      <Editable
        value={props.data.text}
        multiline
        onSave={text => {
          flow.updateNodeData(props.id, { text })
          board.commit()
        }}
      >
        <span class="whitespace-pre-wrap">
          {props.data.text || 'Double-click to edit'}
        </span>
      </Editable>
    </div>
  )
}
