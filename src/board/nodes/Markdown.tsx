import {
  BookOpen,
  Calendar,
  ChartColumn,
  Check,
  Clock,
  Code,
  DollarSign,
  File,
  Flag,
  Folder,
  Globe,
  Heart,
  Layers,
  LayoutGrid,
  Lightbulb,
  Mail,
  MessageSquare,
  Phone,
  Rocket,
  Shield,
  Star,
  Target,
  Users,
  Wrench,
  Zap
} from 'lucide-solid'
import { For, Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { cardBlocks, splitIcon, splitInline } from '../markdown'

// Headings are sans over the card's own (mono) body font
const HEADING = 'font-sans font-bold uppercase text-zinc-900 dark:text-white'
const LABEL = `${HEADING} mt-1 text-xs`
// In a plain card headings are canvas titles, stepping down from `# ` to `#### `
export const blockClass: Record<string, string> = {
  h1: `${HEADING} text-base leading-tight tracking-wide in-data-[shape=plain]:text-4xl`,
  h2: `${LABEL} in-data-[shape=plain]:text-2xl in-data-[shape=plain]:leading-tight`,
  h3: `${HEADING} mt-1 text-[11px] in-data-[shape=plain]:text-xl in-data-[shape=plain]:leading-tight`,
  h4: `${HEADING} mt-1 text-[10px] in-data-[shape=plain]:text-lg in-data-[shape=plain]:leading-tight`,
  h5: LABEL,
  h6: LABEL,
  sub: 'font-sans text-[10px] text-zinc-500 dark:text-zinc-400',
  li: "pl-3 before:-ml-3 before:content-['•_']"
}

// Heading icons, written `# :layers: Tools` or `## :target: Objective`
export const ICONS = {
  layers: Layers,
  target: Target,
  grid: LayoutGrid,
  calendar: Calendar,
  users: Users,
  chart: ChartColumn,
  rocket: Rocket,
  lightbulb: Lightbulb,
  check: Check,
  star: Star,
  flag: Flag,
  book: BookOpen,
  mail: Mail,
  phone: Phone,
  globe: Globe,
  code: Code,
  wrench: Wrench,
  tools: Wrench,
  dollar: DollarSign,
  clock: Clock,
  heart: Heart,
  shield: Shield,
  zap: Zap,
  file: File,
  folder: Folder,
  message: MessageSquare
}
export const ICON_NAMES = Object.keys(ICONS) as (keyof typeof ICONS)[]

// Card text as formatted blocks. Text only ever goes in as JSX text nodes, never as HTML.
export default function Markdown(props: { text: string }) {
  return (
    <div class="whitespace-pre-wrap">
      <For each={cardBlocks(props.text)}>
        {block => {
          const line = block.tag.startsWith('h')
            ? splitIcon(block.text, ICON_NAMES)
            : { text: block.text }
          return (
            // A blank line is a small gap
            <p class={block.text ? (blockClass[block.tag] ?? '') : 'h-2'}>
              <Show when={line.icon}>
                {icon => (
                  // Lowered so the icon centres on the uppercase letters
                  <span title={icon()} class="mr-1.5 inline-block align-[-0.2em]">
                    <Dynamic
                      component={ICONS[icon() as keyof typeof ICONS]}
                      size="1.1em"
                      stroke-width={2}
                    />
                  </span>
                )}
              </Show>
              <For each={splitInline(line.text)}>
                {part => {
                  let el: JSX.Element = part.text
                  if (part.underline) el = <u>{el}</u>
                  if (part.italic) el = <em>{el}</em>
                  return part.bold ? <strong>{el}</strong> : el
                }}
              </For>
            </p>
          )
        }}
      </For>
    </div>
  )
}
