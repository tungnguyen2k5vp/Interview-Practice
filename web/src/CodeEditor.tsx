import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import { indentRange, StreamLanguage } from '@codemirror/language'
import { useEffect, useRef, useState } from 'react'
import { autocompletion, completeAnyWord } from '@codemirror/autocomplete'
import { Button } from './ui'
import { csharp } from '@codemirror/legacy-modes/mode/clike'
import { MSSQL, sql } from '@codemirror/lang-sql'
import type { ExerciseKind } from './types'

const languages = { coding: StreamLanguage.define(csharp), sql: sql({ dialect: MSSQL }) }
const accessibility = EditorView.contentAttributes.of({ 'aria-label': 'Mã trả lời', 'aria-multiline': 'true' })
const editorTheme = EditorView.theme({
  '&': { backgroundColor: 'var(--surface)', color: 'var(--ink)', fontSize: '14px' },
  '.cm-scroller': { fontFamily: 'Consolas, "SFMono-Regular", monospace', lineHeight: '1.6' },
  '.cm-gutters': { backgroundColor: 'var(--ground)', border: 'none', color: 'var(--muted)', minWidth: '38px' },
  '.cm-activeLineGutter, .cm-activeLine': { backgroundColor: 'var(--accent-soft)' },
  '.cm-content': { padding: '14px 0' },
})

export default function CodeEditor({ kind, value, change, readOnly, save }: {
  kind: ExerciseKind; value: string; change: (value: string) => void; readOnly: boolean; save: () => void
}) {
  const editor = useRef<EditorView | null>(null)
  const isDark = () => document.documentElement.dataset.theme === 'dark' ||
    (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)
  const [dark, setDark] = useState(isDark)
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setDark(isDark())
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] })
    media.addEventListener('change', sync)
    return () => { observer.disconnect(); media.removeEventListener('change',sync) }
  }, [])
  return <div className="editor-shell" onKeyDown={e => {
    if (!readOnly && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      save()
    }
  }}>
    {!readOnly && <Button tone="quiet" onClick={() => { const view = editor.current; if (view) {
      view.dispatch({ changes: indentRange(view.state, 0, view.state.doc.length) }); view.focus()
    } }}>Căn lề mã</Button>}
    <CodeMirror theme={dark ? 'dark' : 'light'} value={value} onCreateEditor={view => { editor.current = view }} onChange={text => change(text.slice(0, 32000))} minHeight="290px" maxHeight="540px"
      readOnly={readOnly} indentWithTab={false} basicSetup={{ foldGutter: false }}
      extensions={[languages[kind], ...(kind === 'coding' ? [autocompletion({override:[completeAnyWord]})] : []), accessibility, editorTheme, EditorView.lineWrapping]} />
  </div>
}
