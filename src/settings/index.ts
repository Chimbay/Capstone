import { createSignal } from 'solid-js'

// 0 means Off: the shape ring never opens
export const RING_DELAYS = [0, 200, 300, 400, 600, 800, 1000]
const KEY = 'ringDelay'

// Compared as strings so a missing, empty or unlisted value falls back to the default
export const parseRingDelay = (raw: string | null) =>
  RING_DELAYS.map(String).includes(raw ?? '') ? Number(raw) : 400

const read = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null // storage blocked
  }
}

const [ringDelay, setSignal] = createSignal(parseRingDelay(read()))
export { ringDelay }

export function setRingDelay(ms: number) {
  setSignal(ms)
  try {
    localStorage.setItem(KEY, String(ms))
  } catch {
    // storage blocked: the choice lasts until reload
  }
}
