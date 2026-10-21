// Undo/redo over snapshots of the board as file text. Plain logic, so it can be unit-tested.
export function createHistory(initial: string, restore: (snapshot: string) => void) {
  let current = initial
  const undoStack: string[] = []
  let redoStack: string[] = []

  function step(from: string[], to: string[]): boolean {
    const snapshot = from.pop()
    if (snapshot === undefined) return false
    to.push(current)
    current = snapshot
    restore(snapshot)
    return true
  }

  return {
    // Records `next` as a new undo step. Returns false when nothing changed
    // (arrow-key releases and similar commit even when nothing moved).
    record(next: string): boolean {
      if (next === current) return false
      undoStack.push(current)
      redoStack = []
      current = next
      return true
    },
    undo: () => step(undoStack, redoStack),
    redo: () => step(redoStack, undoStack)
  }
}
