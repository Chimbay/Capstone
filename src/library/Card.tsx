import { JSXElement } from 'solid-js'

export default function Card(props: { children: JSXElement; onClick?: () => void }) {
  return (
    <button
      onClick={props.onClick}
      class="btn-ghost relative aspect-square h-40 w-40 overflow-hidden shadow transition-all"
    >
      {props.children}
    </button>
  )
}
