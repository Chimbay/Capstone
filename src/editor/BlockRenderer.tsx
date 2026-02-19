import { Dynamic } from 'solid-js/web'
import { ElementNode } from './types'

// Renders a single document block as a DOM element.
// Empty blocks get a <br> placeholder so they maintain height
// and remain clickable in contenteditable.
export default function BlockRenderer(props: { node: ElementNode }) {
  const text = () => props.node.pieceTable.formatText()

  return (
    <Dynamic component={props.node.tag} id={props.node.uuid}>
      {text() || <br/>}
    </Dynamic>
  )
}
