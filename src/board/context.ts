import { createContext, useContext } from 'solid-js'

// Board-wide actions for cards and connectors, provided by Board.
export interface BoardActions {
  // Records a user change: an undo step plus a save shortly after.
  commit: () => void
  // A press on a connector's label: held still, it opens the shape ring to insert a card there.
  holdEdge: (id: string, e: PointerEvent) => void
}

export const BoardContext = createContext<BoardActions>({
  commit: () => {},
  holdEdge: () => {}
})

export const useBoard = () => useContext(BoardContext)
