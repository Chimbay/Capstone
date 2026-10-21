import {
  BaseEdge,
  EdgeLabel,
  getSmoothStepPath,
  useSolidFlow,
  type EdgeProps
} from '@dschz/solid-flow'
import type { EdgeData } from '../boardFile'
import { useBoard } from '../context'
import Editable from '../Editable'

export default function LabeledEdge(props: EdgeProps<EdgeData, 'labeled'>) {
  const flow = useSolidFlow()
  const board = useBoard()
  const path = () => getSmoothStepPath(props)
  return (
    <>
      <BaseEdge
        path={path()[0]}
        markerEnd={props.markerEnd}
        style={{ stroke: '#64748b', 'stroke-width': '1.5px' }}
      />
      <EdgeLabel x={path()[1]} y={path()[2]}>
        <Editable
          value={props.data?.text ?? ''}
          onSave={text => {
            // Merge, so connector fields added later survive a label edit
            flow.updateEdge(props.id, e => ({ data: { ...e.data, text } }))
            board.commit()
          }}
        >
          {/* Empty labels stay double-clickable as a small dot */}
          <span class="inline-block min-h-2 min-w-2 rounded bg-white px-1 text-xs">
            {props.data?.text}
          </span>
        </Editable>
      </EdgeLabel>
    </>
  )
}
