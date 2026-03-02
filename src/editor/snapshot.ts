import { ElementNode, Piece } from './types'

interface StackVersion {
  uuid: string
  pieces: Piece[]
}
class Stack {
  stack: StackVersion[]

  constructor() {
    this.stack = []
  }

  public push(uuid: string, pieces: Piece[]): void {
    this.stack.push({ uuid, pieces })
  }

  public pop(): StackVersion | undefined {
    return this.stack.pop()
  }

  public getLength(): number {
    return this.stack.length
  }
  public getStack(): StackVersion[] {
    return this.stack
  }

  public setLength(length: number): void {
    this.stack.length = length
  }
  public peek(): StackVersion {
    return this.stack.at(-1)
  }
  public clear(): void {
    this.stack = []
  }
}
interface Snap {
  block: ElementNode
  pieces: Piece[]
  timer?: ReturnType<typeof setTimeout>
}
export class Snapshot {
  private past: Stack
  private future: Stack
  // Cached boundary state: avoids re-copying pieces on repeated undo/redo.
  private intersection: StackVersion
  private currentSnap: Snap | undefined
  // Debounce delay before committing a snapshot to past.
  private time: number = 500

  constructor() {
    this.past = new Stack()
    this.future = new Stack()
    this.currentSnap = undefined
  }

  public insert(block: ElementNode): void {
    if (!this.currentSnap) {
      const pieces = block.pieceTable.pieces.map(p => ({ ...p }))
      this.currentSnap = { block, pieces, timer: this.setTimer() }
      this.future.clear()
      this.intersection = null
      return
    }

    if (this.currentSnap.block === block) {
      clearTimeout(this.currentSnap.timer)
      this.currentSnap = { ...this.currentSnap, timer: this.setTimer() }
    }
  }
  public undo(block: ElementNode): void {
    const v = this.past.pop()
    if (!v) return
    if (!this.intersection) {
      const pieces = block.pieceTable.pieces.map(p => ({ ...p }))
      this.future.push(block.uuid, pieces)
      this.intersection = { uuid: v.uuid, pieces: v.pieces }
    } else {
      this.future.push(this.intersection.uuid, this.intersection.pieces)
      this.intersection = { uuid: v.uuid, pieces: v.pieces }
    }
  }
  public redo(): void {
    const v = this.future.pop()
    if (this.intersection) {
      this.past.push(this.intersection.uuid, this.intersection.pieces)
      this.intersection = { uuid: v.uuid, pieces: v.pieces }
    }
  }
  public bottom(): StackVersion | undefined {
    const v = this.past.peek()
    if (!v) return
    return v
  }
  public top(): StackVersion | undefined {
    const v = this.future.peek()
    if (!v) return
    return v
  }

  private setTimer(): NodeJS.Timeout {
    return setTimeout(() => {
      const { block, pieces } = this.currentSnap
      this.past.push(block.uuid, pieces)
      this.currentSnap = null
    }, this.time)
  }
}
