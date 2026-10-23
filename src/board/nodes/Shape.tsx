import { Show, type ParentProps } from 'solid-js'
import type { TextData } from '../boardFile'

// Outline only: the canvas shows through the card
const BOX =
  'border-[1.5px] border-zinc-950 focus-within:border-blue-500 dark:border-white dark:focus-within:border-indigo-400'
// Each shape's outline, and where its text sits. Ellipse and diamond keep the text in the box
// inscribed in the shape (top/bottom % are of the height, so inset-[25%] fits any diamond).
const SHAPES = {
  rect: { card: `${BOX} rounded-[10px]`, text: 'h-full p-2' },
  rounded: { card: `${BOX} rounded-2xl`, text: 'h-full px-3 py-2' },
  ellipse: {
    card: `${BOX} rounded-[50%]`,
    text: 'absolute inset-[15%] overflow-hidden text-center'
  },
  diamond: { card: '', text: 'absolute inset-[25%] overflow-hidden text-center' },
  // Free text, like a canvas title: the faint outline shows only while editing, selected, or as the ring's ghost
  plain: {
    card: 'rounded-[10px] border-[1.5px] border-dashed border-zinc-950/30 not-focus-within:[[aria-roledescription=node]:not(.selected)_&]:border-transparent dark:border-white/30',
    text: 'h-full p-2'
  }
}

// The file is user-editable, so an unknown shape falls back to rect
export const shapeOf = (shape: TextData['shape']) =>
  SHAPES[shape ?? 'rect'] ?? SHAPES.rect

// A text card's outline, shared by TextNode and the shape ring's ghost preview.
export default function ShapeBox(
  props: ParentProps<{ shape: TextData['shape']; class: string }>
) {
  return (
    <div
      data-shape={props.shape}
      class={`font-mono text-sm text-zinc-950 dark:text-white ${props.class} ${shapeOf(props.shape).card}`}
    >
      {/* A border can't follow a diamond, so its outline is an SVG stretched over the box */}
      <Show when={props.shape === 'diamond'}>
        <svg
          class="absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polygon
            points="50,0 100,50 50,100 0,50"
            vector-effect="non-scaling-stroke"
            stroke-linejoin="round"
            class="fill-none stroke-zinc-950 stroke-[1.5px] group-focus-within:stroke-blue-500 dark:stroke-white dark:group-focus-within:stroke-indigo-400"
          />
        </svg>
      </Show>
      {props.children}
    </div>
  )
}
