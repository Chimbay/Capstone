import type { ParsedBlock } from '@editor/types'
import { headingRule } from './rules/heading'
import { listRule } from './rules/list'
import { breakRule } from './rules/break'
import { paragraphRule } from './rules/paragraph'

const blockRules = [
  headingRule,
  listRule,
  breakRule,
  paragraphRule
]

export function parseBlock(line: string): ParsedBlock {
  for (const rule of blockRules) {
    if (rule.match(line)) return rule.parse(line)
  }
  return paragraphRule.parse(line)
}
