import {
  BaseEdge,
  EdgeLabel,
  getSmoothStepPath,
  useNodes,
  useSolidFlow,
  type EdgeProps
} from '@dschz/solid-flow'
import { createMemo, Show } from 'solid-js'
import type { EdgeData } from '../boardFile'
import { useBoard } from '../context'
import Editable from '../Editable'
import { absRect } from '../geometry'
import { route, toPath } from '../route'

const nextArrow = { end: 'both', both: 'none', none: 'end' } as const

export default function LabeledEdge(props: EdgeProps<EdgeData, 'labeled'>) {
  const flow = useSolidFlow()
  const board = useBoard()
  const nodes = useNodes()
  // shortcut: every edge reroutes on any card move, O(edges × cards²); fine for tens of cards, add a spatial index or route only nearby cards past a few hundred
  const path = createMemo(() => {
    // A self-loop has no clear path to find
    if (props.source === props.target) return getSmoothStepPath(props)
    // Sections aren't obstacles: connectors cross their borders
    const obstacles = nodes()
      .filter(n => n.type !== 'frame' && n.id !== props.source && n.id !== props.target)
      .map(n => absRect(n, nodes()))
    const start = { x: props.sourceX, y: props.sourceY }
    const end = { x: props.targetX, y: props.targetY }
    return toPath(
      route(start, props.sourcePosition, end, props.targetPosition, obstacles),
      3
    )
  })
  // Unknown values from a hand-edited file fall back to the end arrow
  const arrow = () =>
    props.data?.arrow === 'both' || props.data?.arrow === 'none'
      ? props.data.arrow
      : 'end'
  const save = (fields: Partial<EdgeData>) => {
    flow.updateEdge(props.id, e => ({ data: { ...e.data, ...fields } }))
    board.commit()
  }
  const button =
    'nodrag nopan rounded border bg-white px-1 hover:bg-slate-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-indigo-400 dark:hover:bg-indigo-900/40'
  return (
    <>
      {/* Holding anywhere on the line (incl. BaseEdge's wide invisible hit path) opens the insert ring; nopan keeps the press from panning */}
      <g class="nopan" on:pointerdown={e => board.holdEdge(props.id, e)}>
        <BaseEdge
          path={path()[0]}
          // The library's arrow marker is orient="auto-start-reverse", so the end marker also works as a start arrow
          markerStart={arrow() === 'both' ? props.markerEnd : undefined}
          markerEnd={arrow() === 'none' ? undefined : props.markerEnd}
          style={{
            // board.css sets --edge-stroke per theme
            stroke: 'var(--edge-stroke)',
            'stroke-width': '1.5px',
            'stroke-dasharray': props.data?.dashed === true ? '6 4' : undefined
          }}
        />
      </g>
      <EdgeLabel x={path()[1]} y={path()[2]}>
        {/* nopan: holding the label must not pan the canvas (native listener, as below) */}
        <div class="nodrag nopan" on:pointerdown={e => board.holdEdge(props.id, e)}>
          <Editable value={props.data?.text ?? ''} onSave={text => save({ text })}>
            {/* Empty labels stay double-clickable as a small dot; select-none: selected label text would be dragged natively (🚫) on the next hold */}
            <span class="inline-block min-h-2 min-w-2 rounded bg-(--xy-background-color) px-1 font-mono text-xs text-zinc-950 select-none dark:text-white">
              {props.data?.text}
            </span>
          </Editable>
        </div>
        <Show when={props.selected}>
          {/* Native listeners: Solid's delegated events don't reach elements inside the flow's layers */}
          <div class="absolute top-1/2 left-full ml-1 flex -translate-y-1/2 gap-0.5 text-xs">
            <button
              class={button}
              title="Arrow"
              aria-label="Arrow"
              on:click={() => save({ arrow: nextArrow[arrow()] })}
            >
              {{ end: '→', both: '↔', none: '—' }[arrow()]}
            </button>
            <button
              class={button}
              title="Line"
              aria-label="Line"
              on:click={() => save({ dashed: props.data?.dashed !== true })}
            >
              {props.data?.dashed === true ? '┄' : '─'}
            </button>
          </div>
        </Show>
      </EdgeLabel>
    </>
  )
}
