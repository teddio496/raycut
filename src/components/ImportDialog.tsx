import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FileKey2, LockKeyhole, Upload, X } from 'lucide-react';
import { MAX_FILE_SIZE, type Keymap } from '../lib/raycast';
interface Props { onClose:()=>void; onImport:(map:Keymap)=>void }
export function ImportDialog({onClose,onImport}:Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker|null>(null);
  const [file,setFile]=useState<File|null>(null);
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [dragging,setDragging]=useState(false);
  useEffect(()=>{dialog.current?.showModal();return()=>{worker.current?.terminate();};},[]);
  function choose(next:File|undefined) {
    if(!next)return;
    worker.current?.terminate();setBusy(false);setPassword('');setError('');
    if(!next.name.toLowerCase().endsWith('.rayconfig')){setError('Choose a .rayconfig export from Raycast.');return;}
    if(next.size>MAX_FILE_SIZE){setError('Choose an export smaller than 64 MB. Export settings only to reduce its size.');return;}
    setFile(next);
  }
  async function unlock() {
    if(!file||busy)return;setBusy(true);setError('');
    const current = new Worker(new URL('../lib/import.worker.ts',import.meta.url),{type:'module'});worker.current=current;
    current.onmessage=(event:MessageEvent<{keymap?:Keymap;error?:string}>)=>{
      current.terminate();worker.current=null;setBusy(false);
      if(event.data.error)setError(event.data.error);
      else if(event.data.keymap){setPassword('');onImport(event.data.keymap);}
    };
    current.onerror=()=>{current.terminate();worker.current=null;setBusy(false);setError('The importer couldn’t start. Reload this page and try again.');};
    try {const bytes=new Uint8Array(await file.arrayBuffer()); if(worker.current!==current)return;current.postMessage({bytes,password,name:file.name.replace(/\.rayconfig$/i,'')},[bytes.buffer]);}
    catch {current.terminate();worker.current=null;setBusy(false);setError('This file couldn’t be opened. Choose it again.');}
  }
  return <dialog ref={dialog} className="import-dialog" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}} aria-labelledby="import-title">
    <div className="dialog-content">
      <button className="icon-button dialog-close" aria-label="Close import" onClick={onClose}><X size={18}/></button>
      <div className="import-symbol"><FileKey2 size={29} strokeWidth={1.5}/></div>
      <h2 id="import-title">Make room for your keys.</h2><p className="dialog-subtitle">Your Raycast setup, in a different light.</p>
      <form onSubmit={e=>{e.preventDefault();void unlock();}}>
        <input ref={input} type="file" accept=".rayconfig" className="visually-hidden" aria-label="Raycast config file" onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}}/>
        <button type="button" className={`dropzone ${dragging?'dragging':''}`} onClick={()=>input.current?.click()} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);choose(e.dataTransfer.files[0]);}}>
          <Upload size={23} strokeWidth={1.5}/><strong>{file?file.name:'Drop your .rayconfig here'}</strong><span>{file?`${(file.size/1024).toFixed(0)} KB · Click to replace`:'or click to choose a file'}</span>
        </button>
        {file&&<label className="password-label">Export password<div className="password-input"><LockKeyhole size={16}/><input type="password" autoComplete="off" placeholder="Your Raycast export password" value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></div></label>}
        {file&&<p className="password-hint">Raycast Settings → Extensions → Export Settings & Data</p>}
        {error&&<p role="alert" className="import-error">{error}</p>}
        <button type="submit" className="primary-button import-submit" disabled={!file||busy}>{busy?<><span className="spinner"/>Unlocking…</>:<>Explore my shortcuts<ArrowRight size={17}/></>}</button>
      </form>
      <p className="privacy-note"><LockKeyhole size={12}/> Opens on your device. Nothing uploaded.</p>
    </div>
  </dialog>;
}
