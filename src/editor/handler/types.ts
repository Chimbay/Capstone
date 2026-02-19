import { ElementNode } from '@editor/types'

// Handlers
export type CaretInputHandler = (
  block: ElementNode,
  offset: number,
  data?: string
) => void
export type CaretCursorHandler = (offset: number, data?: string) => number

export type SelectionInputHandler = (
  block: ElementNode,
  start: number,
  end: number,
  data?: string
) => void
export type SelectionCursorHandler = (start: number, end: number, data?: string) => number
