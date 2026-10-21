import { createContext, useContext } from 'solid-js'

// Board-wide actions for cards and connectors, provided by Board.
export interface BoardActions {
  // Records a user change: an undo step plus a save shortly after.
  commit: () => void
}

export const BoardContext = createContext<BoardActions>({ commit: () => {} })

export const useBoard = () => useContext(BoardContext)
