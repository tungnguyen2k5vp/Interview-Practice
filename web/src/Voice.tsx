import { useEffect, useRef, useState } from 'react'
import { Mic, Volume2 } from 'lucide-react'
import { Button } from './ui'

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; abort(): void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null
}
type VoiceWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }

export function Voice({ prompt, language, disabled, append }: { prompt: string; language: string; disabled: boolean; append: (text: string) => void }) {
  const browser = window as VoiceWindow
  const Engine = browser.SpeechRecognition ?? browser.webkitSpeechRecognition
  const current = useRef<Recognition | null>(null)
  const add = useRef(append)
  add.current = append
  const [listening, setListening] = useState(false)
  const [notice, setNotice] = useState('')
  const recorder = useRef<MediaRecorder | null>(null)
  const recordingId = useRef(0)
  const [recording, setRecording] = useState(false)
  const [audio, setAudio] = useState('')
  useEffect(() => () => { if (audio) URL.revokeObjectURL(audio) }, [audio])
  const lang = language === 'en' ? 'en-US' : 'vi-VN'
  useEffect(() => () => {
    const r = current.current
    if (r) { r.onresult = r.onerror = r.onend = null; r.abort(); current.current = null }
    recordingId.current++
    const rec = recorder.current
    if (rec) { rec.onstop = null; if (rec.state !== 'inactive') rec.stop(); rec.stream.getTracks().forEach(t=>t.stop()) }
    window.speechSynthesis?.cancel()
  }, [prompt, disabled])
  function dictate() {
    if (current.current) { current.current.stop(); return }
    if (!Engine || disabled) return
    const r = new Engine()
    const started = performance.now()
    let words = 0, fillers = 0, failed = false
    r.lang = lang; r.continuous = true; r.interimResults = false
    r.onresult = event => {
      const text = Array.from(event.results).slice(event.resultIndex).filter(x => x.isFinal).map(x => x[0].transcript.trim()).join(' ')
      if (text) {
        const tokens = text.toLocaleLowerCase(lang).match(/[\p{L}]+/gu) ?? []
        words += tokens.length; fillers += tokens.filter(w => (language === 'en' ? ['um','uh'] : ['ờ','ừm']).includes(w)).length
        add.current(text)
      }
    }
    r.onerror = e => { failed = true; setNotice(e.error === 'not-allowed' ? 'Microphone chưa được cấp quyền. Bạn có thể gõ câu trả lời.' :
      'Nhận giọng nói bị gián đoạn. Kiểm tra micro, kết nối hoặc tiếp tục gõ.') }
    r.onend = () => {
      current.current = null; setListening(false)
      const seconds = Math.round((performance.now() - started) / 1000)
      if (!failed) setNotice(words ? 'Đã nhập bản chép lời · ' + seconds + ' giây' +
        (seconds >= 15 && words >= 10 ? ' · ' + fillers + ' từ đệm trong bản chép lời' +
          (language === 'en' ? ' · khoảng ' + Math.round(words * 60 / seconds) + ' từ/phút.' : '.') : '.') : 'Chưa nhận được lời nói.')
    }
    try { window.speechSynthesis?.cancel(); r.start(); current.current = r; setListening(true); setNotice('Đang nghe…') }
    catch { setNotice('Không mở được microphone. Bạn có thể gõ câu trả lời.') }
  }
  async function record() {
    if (recorder.current?.state === 'recording') { recorder.current.stop(); return }
    const id = ++recordingId.current
    let stream: MediaStream | undefined
    try {
      stream = await navigator.mediaDevices.getUserMedia({audio:true})
      if (id !== recordingId.current) { stream.getTracks().forEach(t=>t.stop()); return }
      const r = new MediaRecorder(stream)
      const parts: Blob[] = []
      let bytes = 0
      r.ondataavailable = event => {
        if (!event.data.size) return
        bytes += event.data.size
        if (bytes <= 12*1024*1024) parts.push(event.data)
        else if (r.state === 'recording') r.stop()
      }
      r.onstop = () => {
        r.stream.getTracks().forEach(t=>t.stop()); recorder.current=null; setRecording(false)
        if (parts.length) setAudio(URL.createObjectURL(new Blob(parts,{type:r.mimeType})))
      }
      recorder.current=r; r.start(1000); setRecording(true); setNotice('Đang ghi âm để nghe lại trên thiết bị.')
    } catch { stream?.getTracks().forEach(t=>t.stop()); setNotice('Không ghi âm được. Kiểm tra quyền micro hoặc dùng câu trả lời văn bản.') }
  }
  return <details className="details"><summary>Phỏng vấn bằng giọng nói</summary>
    <p className="small muted">{Engine ? 'Trình duyệt có thể gửi âm thanh tới dịch vụ nhận dạng của nó. Bạn có thể sửa bản chép lời trước khi nộp.' :
      'Trình duyệt này chưa hỗ trợ nhập bằng giọng nói. Bạn có thể gõ câu trả lời.'}</p>
    <div className="action-row">{'speechSynthesis' in window && <Button disabled={disabled || listening} onClick={() => {
      window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(prompt); speech.lang = lang
      speech.onerror = () => setNotice('Thiết bị chưa đọc được câu hỏi bằng ngôn ngữ đã chọn.')
      window.speechSynthesis.speak(speech)
    }}><Volume2 size={16} /> Đọc câu hỏi</Button>}
    {Engine && <Button disabled={disabled} aria-pressed={listening} onClick={dictate}><Mic size={16} />{listening ? 'Dừng micro' : 'Dùng microphone'}</Button>}</div>
    {typeof MediaRecorder !== 'undefined' && navigator.mediaDevices && <div className="action-row"><Button disabled={disabled} aria-pressed={recording}
      onClick={()=>void record()}>{recording?'Dừng ghi âm':'Cho phép ghi âm để nghe lại'}</Button>
      {audio && <><audio controls src={audio} aria-label="Nghe lại câu trả lời"/><Button onClick={()=>setAudio('')}>Xóa bản ghi</Button></>}</div>}
    <span className="small muted" role="status">{notice}</span>
  </details>
}
