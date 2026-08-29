import { Stack } from './stack'
import { Snap, StackVersion } from './type'

export class Snapshot {
  /* @internal */
  private __past: Stack = new Stack()
  private __future: Stack = new Stack()
  private __currentSnap: Snap | undefined = undefined
  // Debounce delay befoe committng a burst to __past.
  private __time: number = 500

  /*
   * Records a pre-mutation snapshot. Same block structure resets the burst timer;
   * structure changes commit the current burst and start a ew one.
   * @param version:
   */
  public insert(version: StackVersion): void {
    if (!this.__currentSnap) {
      this.__currentSnap = { version, timer: this.setTimer() }
      this.__future.clear()
      return
    }

    const sameStructure =
      version.blockOrder.join(',') === this.__currentSnap.version.blockOrder.join(',')

    if (sameStructure) {
      // Case: burst — reset timer, keep original pre-edit state
      clearTimeout(this.__currentSnap.timer)
      this.__currentSnap = { ...this.__currentSnap, timer: this.setTimer() }
    } else {
      // Case: block structure changed — commit burst, start new snap
      clearTimeout(this.__currentSnap.timer)
      this.__past.push(this.__currentSnap.version)
      this.__currentSnap = { version, timer: this.setTimer() }
    }
  }

  // Pops past, pushes current to future, returns past version to restore.
  public undo(current: StackVersion): StackVersion | undefined {
    const v = this.__past.pop()
    if (!v) return undefined
    this.__future.push(current)
    return v
  }

  // Pops future, pushes current to past, returns future version to restore.
  public redo(current: StackVersion): StackVersion | undefined {
    const v = this.__future.pop()
    if (!v) return undefined
    this.__past.push(current)
    return v
  }

  private setTimer(): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      if (!this.__currentSnap) return
      this.__past.push(this.__currentSnap.version)
      this.__currentSnap = undefined
    }, this.time)
  }
}
