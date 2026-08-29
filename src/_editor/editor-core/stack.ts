import { StackVersion } from './type'

export class Stack {
  /* @internal */
  private __elements: StackVersion[]

  constructor() {
    this.__elements = []
  }

  /*
   * Pushes an element
   * @param version - A stack version
   */
  public push(version: StackVersion): void {
    this.__elements.push(version)
  }
  /*
   * Pops an element from the stacks and returns. Undefined if stack is empty.
   */
  public pop(): StackVersion | undefined {
    return this.__elements.pop()
  }
  /*
   * Returns the top. Undefined if stack is empty.
   */
  public peek(): StackVersion | undefined {
    return this.__elements.at(-1)
  }
  /*
   * Clears the stack
   */
  public clear(): void {
    this.__elements = []
  }
}
