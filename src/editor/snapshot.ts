import { Snap, StackVersion } from './types'

class Stack {
  private elements: StackVersion[]

  constructor() {
    this.elements = []
  }

  public push(v: StackVersion): void {
    this.elements.push(v)
  }

  public pop(): StackVersion | undefined {
    return this.elements.pop()
  }

  public peek(): StackVersion | undefined {
    return this.elements.at(-1)
  }

  public clear(): void {
    this.elements = []
  }
}

export class Snapshot {
  private past: Stack
  private future: Stack
  private currentSnap: Snap | undefined
  // Debounce delay before committing a burst to past.
  private time: number = 500

  constructor() {
    this.past = new Stack()
    this.future = new Stack()
    this.currentSnap = undefined
  }

  // Records a pre-mutation snapshot. Same block structure resets the burst timer;
  // structure changes commit the current burst and start a new one.
  public insert(version: StackVersion): void {
    if (!this.currentSnap) {
      this.currentSnap = { version, timer: this.setTimer() }
      this.future.clear()
      return
    }

    const sameStructure =
      version.blockOrder.join(',') === this.currentSnap.version.blockOrder.join(',')

    if (sameStructure) {
      // Case: burst — reset timer, keep original pre-edit state
      clearTimeout(this.currentSnap.timer)
      this.currentSnap = { ...this.currentSnap, timer: this.setTimer() }
    } else {
      // Case: block structure changed — commit burst, start new snap
      clearTimeout(this.currentSnap.timer)
      this.past.push(this.currentSnap.version)
      this.currentSnap = { version, timer: this.setTimer() }
    }
  }

  // Pops past, pushes current to future, returns past version to restore.
  public undo(current: StackVersion): StackVersion | undefined {
    const v = this.past.pop()
    if (!v) return undefined
    this.future.push(current)
    return v
  }

  // Pops future, pushes current to past, returns future version to restore.
  public redo(current: StackVersion): StackVersion | undefined {
    const v = this.future.pop()
    if (!v) return undefined
    this.past.push(current)
    return v
  }

  private setTimer(): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      if (!this.currentSnap) return
      this.past.push(this.currentSnap.version)
      this.currentSnap = undefined
    }, this.time)
  }
}
