import { NodeResizer, useSolidFlow, type NodeProps } from '@dschz/solid-flow'
import type { TextData } from '../boardFile'
import { useBoard } from '../context'
import Editable from '../Editable'
import { applyHeading, headingPrefix, stripHeading } from '../markdown'
import FormatToolbar from './FormatToolbar'
import Markdown, { blockClass } from './Markdown'
import ShapeBox, { shapeOf } from './Shape'
import Sides from './Sides'

export default function TextNode(props: NodeProps<TextData, 'text'>) {
  const flow = useSolidFlow()
  const board = useBoard()
  // A plain card starting with `# ` is a heading: edited without its #s, styled as that heading
  const prefix = () =>
    props.data.shape === 'plain' ? headingPrefix(props.data.text) : ''
  return (
    // [overflow-wrap:anywhere]: a long word with no spaces wraps instead of running out of the card
    <ShapeBox
      shape={props.data.shape}
      class="group h-full w-full overflow-hidden [overflow-wrap:anywhere]"
    >
      <NodeResizer
        visible={props.selected}
        minWidth={80}
        minHeight={40}
        onResizeEnd={() => board.commit()}
      />
      <Sides />
      <div class={shapeOf(props.data.shape).text}>
        <Editable
          value={stripHeading(props.data.text, prefix())}
          multiline
          textClass={prefix() ? blockClass[`h${prefix().length - 1}`] : undefined}
          toolbar={el => <FormatToolbar el={el} id={props.id} heading={!!prefix()} />}
          onSave={text => {
            flow.updateNodeData(props.id, { text: applyHeading(text, prefix()) })
            board.commit()
          }}
        >
          <Markdown text={props.data.text} />
        </Editable>
      </div>
    </ShapeBox>
  )
}
