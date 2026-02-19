import { createSignal, For, Show } from 'solid-js'
import { ElementNode } from './types'

export default function PieceTableDebug(props: { blocks: ElementNode[] }) {
  return (
    <div style="font-family: monospace; font-size: 11px; padding: 8px; background: #1e1e1e; color: #d4d4d4; overflow-y: auto; max-height: 100vh;">
      <For each={props.blocks}>
        {block => {
          const text = () => block.pieceTable.formatText()
          const [expanded, setExpanded] = createSignal(false)

          return (
            <div style="border-bottom: 1px solid #333;">
              <div
                style="display: flex; align-items: baseline; gap: 8px; padding: 2px 0; cursor: pointer;"
                onClick={() => setExpanded(v => !v)}
              >
                <span style="color: #569cd6; min-width: 40px;">
                  {'<'}
                  {block.tag}
                  {'>'}
                </span>
                <span style="color: #666; min-width: 60px;">
                  {block.uuid.slice(0, 8)}
                </span>
                <span>
                  {() => {
                    text()
                    return block.pieceTable.pieces.map((p, i) => {
                      const buf =
                        p.buffer === 'Original'
                          ? block.pieceTable.original
                          : block.pieceTable.add
                      const slice = buf.substring(p.start, p.start + p.len)
                      const color = p.buffer === 'Original' ? '#b5cea8' : '#dcdcaa'
                      return (
                        <span
                          style={`color: ${color}; ${i > 0 ? 'margin-left: 2px;' : ''}`}
                        >
                          [{slice}]
                        </span>
                      )
                    })
                  }}
                </span>
              </div>

              <Show when={expanded()}>
                {() => {
                  text()
                  const pt = block.pieceTable
                  return (
                    <div style="padding: 8px 0 8px 48px;">
                      <div style="color: #569cd6; margin-bottom: 4px;">
                        Original: "<span style="color: #b5cea8;">{pt.original}</span>"
                      </div>
                      <div style="color: #569cd6; margin-bottom: 8px;">
                        Add: "<span style="color: #dcdcaa;">{pt.add}</span>"
                      </div>

                      <div style="color: #569cd6; margin-bottom: 4px;">
                        pieces[{pt.pieces.length}]:
                      </div>
                      <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        {pt.pieces.map((p, i) => {
                          const buf = p.buffer === 'Original' ? pt.original : pt.add
                          const slice = buf.substring(p.start, p.start + p.len)
                          const color = p.buffer === 'Original' ? '#b5cea8' : '#dcdcaa'
                          const borderColor =
                            p.buffer === 'Original' ? '#4e6e3e' : '#6e5e2e'
                          return (
                            <div
                              style={`border: 1px solid ${borderColor}; border-radius: 3px; padding: 4px 6px; background: #252525;`}
                            >
                              <div style="color: #666; font-size: 9px; margin-bottom: 2px;">
                                [{i}] {p.buffer}
                              </div>
                              <div style="color: #9cdcfe; font-size: 9px;">
                                start:{p.start} len:{p.len}
                              </div>
                              <div
                                style={`color: ${color}; margin-top: 2px; border-top: 1px solid #333; padding-top: 2px;`}
                              >
                                "{slice}"
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                }}
              </Show>
            </div>
          )
        }}
      </For>
    </div>
  )
}
