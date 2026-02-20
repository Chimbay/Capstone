import { RenderDocument } from '@editor/render'
import { CursorTarget, ElementNode } from '@editor/types'

export type InputHandler = (
  editor: RenderDocument,
  block: ElementNode,
  start: number,
  end: number,
  data?: string
) => CursorTarget