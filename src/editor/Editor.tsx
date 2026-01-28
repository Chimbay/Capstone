import { PieceTable } from './PieceTable'
import { Piece } from './types'

function SpanPiece(props: { p: Piece }) {
  return <span>{props.p.buffer}</span>
}
export default function Editor(props: { table: PieceTable }) {
  
  function handleInput(e: InputEvent) {
    e.preventDefault()
    const input = e.inputType
    props.table.setStroke(e)
    switch (input) {
      case 'insertText':
        break;
      
    }
  }
  
  return (
    <span onBeforeInput={handleInput}>
      {props.table.getText()}
    </span>
  )
}
