import { NodeResizer, useSolidFlow, type NodeProps } from '@dschz/solid-flow'
import type { FrameData } from '../boardFile'
import { useBoard } from '../context'
import Editable from '../Editable'

// A titled section. No handles: connectors join cards, not sections. Only the title and resize
// controls take the pointer (board.css), so cards and connectors inside stay clickable.
export default function FrameNode(props: NodeProps<FrameData, 'frame'>) {
  const flow = useSolidFlow()
  const board = useBoard()
  return (
    <div
      class={`h-full w-full rounded-[10px] border-[1.5px] border-dashed ${props.selected ? 'border-blue-500 dark:border-indigo-400' : 'border-zinc-950/40 dark:border-white/40'}`}
    >
      <NodeResizer
        visible={props.selected}
        minWidth={200}
        minHeight={120}
        onResizeEnd={() => board.commit()}
      />
      <div class="pointer-events-auto absolute top-2 left-3 max-w-[calc(100%-1.5rem)] font-sans text-xl font-bold text-zinc-950 uppercase dark:text-white">
        <Editable
          value={props.data.title}
          onSave={title => {
            flow.updateNodeData(props.id, { title })
            board.commit()
          }}
        >
          <span class="block truncate">[{props.data.title}]</span>
        </Editable>
      </div>
    </div>
  )
}
