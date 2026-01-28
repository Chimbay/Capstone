import type { PieceTable } from './PieceTable'

export default function Debug(props: { table: PieceTable }) {
  const table = () => JSON.stringify(props.table.getTable(), null, 2)
  const strokes = () => props.table.getStrokes()

  return (
    <>
      <pre class="bg-gray-100 text-xs font-mono p-3 rounded border overflow-auto max-h-60">
        {table()}
      </pre>
    </>
  )
}

