import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import { StreamLanguage } from '@codemirror/language'
import { csharp } from '@codemirror/legacy-modes/mode/clike'
import { MSSQL, sql } from '@codemirror/lang-sql'
import type { ExerciseKind } from './types'

const languages = { coding: StreamLanguage.define(csharp), sql: sql({ dialect: MSSQL }) }
const accessibility = EditorView.contentAttributes.of({ 'aria-label': 'Mã trả lời', 'aria-multiline': 'true' })
const editorTheme = EditorView.theme({
  '&': { backgroundColor: '#fbfcff', color: '#0f172a', fontSize: '14px' },
  '.cm-scroller': { fontFamily: 'Consolas, "SFMono-Regular", monospace', lineHeight: '1.6' },
  '.cm-gutters': { backgroundColor: '#f3f5fa', border: 'none', color: '#576680', minWidth: '38px' },
  '.cm-activeLineGutter, .cm-activeLine': { backgroundColor: '#eef0fc' },
  '.cm-content': { padding: '14px 0' },
})

export default function CodeEditor({ kind, value, change, readOnly, save }: {
  kind: ExerciseKind; value: string; change: (value: string) => void; readOnly: boolean; save: () => void
}) {
  return <div className="editor-shell" onKeyDown={e => {
    if (!readOnly && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      save()
    }
  }}>
    <CodeMirror value={value} onChange={text => change(text.slice(0, 32000))} minHeight="290px" maxHeight="540px"
      readOnly={readOnly} indentWithTab={false} basicSetup={{ foldGutter: false }}
      extensions={[languages[kind], accessibility, editorTheme, EditorView.lineWrapping]} />
  </div>
}
