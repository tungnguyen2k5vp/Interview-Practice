/// <reference types="vite/client" />
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

const maxText = 32000
const tooLong = () => new Error('Văn bản vượt 32.000 ký tự. Hãy chọn một phần tài liệu.')

async function pdfText(file: File, signal: AbortSignal) {
  const pdf = await import('pdfjs-dist')
  pdf.GlobalWorkerOptions.workerSrc = pdfWorker
  const task = pdf.getDocument({data:new Uint8Array(await file.arrayBuffer()), disableFontFace:true, useSystemFonts:false,
    useWorkerFetch:false, useWasm:false, enableXfa:false, maxImageSize:0, stopAtErrors:true})
  const stop = () => { void task.destroy() }
  signal.addEventListener('abort',stop,{once:true})
  try {
    signal.throwIfAborted()
    const doc = await task.promise
    if (doc.numPages > 20) throw new Error('Chọn tối đa 20 trang PDF.')
    let text = ''
    for (let i=1;i<=doc.numPages;i++) {
      const page = await doc.getPage(i)
      const reader = page.streamTextContent().getReader()
      try {
        for (;;) {
          signal.throwIfAborted()
          const {value,done} = await reader.read()
          if (done) break
          for (const item of value.items) if (typeof item.str === 'string') {
            text += item.str + (item.hasEOL ? '\n' : ' ')
            if (text.length > maxText) throw tooLong()
          }
        }
      } finally { reader.releaseLock();page.cleanup() }
      text+='\n'
    }
    return text
  } finally { signal.removeEventListener('abort',stop);await task.destroy() }
}

async function wordText(file: File, signal: AbortSignal) {
  const {ZipReader,BlobReader} = await import('@zip.js/zip.js')
  const zip = new ZipReader(new BlobReader(file),{useWebWorkers:false})
  let count=0, total=0, types=false, xml:Uint8Array | undefined
  try {
    for await (const entry of zip.getEntriesGenerator()) {
      signal.throwIfAborted()
      if (++count>512 || (total+=entry.uncompressedSize)>16*1024*1024) throw new Error('Cấu trúc DOCX vượt giới hạn.')
      if(entry.filename==='[Content_Types].xml') types=true
      if(entry.directory || entry.filename!=='word/document.xml') continue
      if (xml || entry.encrypted || entry.uncompressedSize>1024*1024) throw new Error('Phần văn bản DOCX bị khóa hoặc vượt 1 MiB.')
      const bytes = new Uint8Array(entry.uncompressedSize)
      let offset=0
      await entry.getData(new WritableStream<Uint8Array>({write(chunk) {
        if(offset+chunk.length>bytes.length) throw new Error('Kích thước DOCX không khớp.')
        bytes.set(chunk,offset);offset+=chunk.length
      }}),{checkSignature:true,signal})
      if(offset!==bytes.length) throw new Error('Tệp DOCX chưa đầy đủ.')
      xml=bytes
    }
  } finally { await zip.close() }
  if (!types || !xml) throw new Error('Tệp không có phần văn bản của Word.')
  const encoding=xml[0]===255 && xml[1]===254?'utf-16le':xml[0]===254 && xml[1]===255?'utf-16be':'utf-8'
  const source=new TextDecoder(encoding,{fatal:true}).decode(xml)
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('Định dạng XML này không được hỗ trợ.')
  const doc=new DOMParser().parseFromString(source,'application/xml')
  const ns=doc.documentElement.namespaceURI
  if(doc.documentElement.localName!=='document' || !['http://schemas.openxmlformats.org/wordprocessingml/2006/main','http://purl.oclc.org/ooxml/wordprocessingml/main'].includes(ns??''))
    throw new Error('Phần văn bản Word không hợp lệ.')
  return Array.from(doc.getElementsByTagNameNS(ns,'p'),p=>Array.from(p.getElementsByTagNameNS(ns,'t'),t=>t.textContent).join('')).join('\n')
}

export async function extractText(file:File, cancel:AbortSignal) {
  const ext=file.name.split('.').pop()?.toLowerCase()
  if(!file.size || file.size>2*1024*1024 || !['txt','pdf','docx'].includes(ext??'')) throw new Error('Chọn TXT, PDF hoặc DOCX từ 1 byte đến 2 MiB.')
  const allowed=ext==='txt'?['text/plain']:ext==='pdf'?['application/pdf']:['application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/zip']
  if(file.type && file.type!=='application/octet-stream' && !allowed.includes(file.type)) throw new Error('Loại tệp không khớp phần mở rộng.')
  const header=await file.slice(0,8).text()
  if(ext==='pdf' && !header.startsWith('%PDF-') || ext==='docx' && !header.startsWith('PK')) throw new Error('Nội dung tệp không khớp định dạng.')
  const signal=AbortSignal.any([cancel,AbortSignal.timeout(15000)])
  const text=(ext==='pdf'?await pdfText(file,signal):ext==='docx'?await wordText(file,signal):
    new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer())).trim()
  signal.throwIfAborted()
  if (!text) throw new Error('Chưa tìm thấy văn bản. Với bản scan, hãy dán phần chữ đã nhận dạng.')
  if (text.length>maxText) throw tooLong()
  if (Array.from(text).some(c=>c.charCodeAt(0)<32 && !'\t\r\n'.includes(c))) throw new Error('Văn bản chứa ký tự không hợp lệ.')
  return text
}
