import { For } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { RenderDocument } from './render'
import { DomNode } from './types'

function RenderNode(props: { el: DomNode }) {
  return <Dynamic component={props.el.tag}>{props.el.content}</Dynamic>
}
export default function Editor(props: { doc: RenderDocument }) {
  const parsedDocument = props.doc.renderText()
  return (
    <>
      <For each={parsedDocument}>{node => <RenderNode el={node} />}</For>
    </>
  )
}
