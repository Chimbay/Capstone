// shortcut: hand-typed subset of bun:test (no @types/bun to keep the lockfile untouched); swap for @types/bun when deps can change
declare module 'bun:test' {
  interface Matchers {
    toBe(expected: unknown): void
    toEqual(expected: unknown): void
  }
  export function test(name: string, fn: () => void | Promise<void>): void
  export function expect(actual: unknown): Matchers
}
