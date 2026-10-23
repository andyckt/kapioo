"use client"

import { useEffect, useState } from 'react'
import { ArrowUpRight, Check, Copy, Maximize2, Monitor, Smartphone } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { finalists, isHomeVariant, type HomeVariant } from './variants'
import './finalist-gallery.css'

export function FinalistGallery() {
  const [selected, setSelected] = useState<HomeVariant>('linen')
  const [phone, setPhone] = useState(false)
  const [focus, setFocus] = useState(false)
  const [notice, setNotice] = useState('')
  const current = finalists.find(item => item.id === selected)!
  useEffect(() => {
    const sync = () => { const id = location.hash.slice(1); if (isHomeVariant(id)) setSelected(id) }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  const select = (id: string) => {
    if (!isHomeVariant(id)) return
    setSelected(id); setNotice(''); history.replaceState(null, '', `#${id}`)
  }
  const choose = async () => {
    const choice = `My Kapioo choice is ${current.number} — ${current.name}. ${location.origin}/design-finalists/${current.id}`
    try { await navigator.clipboard.writeText(choice); setNotice(`Copied your choice: ${current.number} — ${current.name}`) }
    catch { setNotice(`Your choice: ${current.number} — ${current.name}. Tell me this name to continue.`) }
  }
  return <main className={`kf-gallery ${phone ? 'kf-phone' : ''} ${focus ? 'kf-focus' : ''}`}>
    <header className="kf-header"><div><span className="kf-brand">kapioo.</span><span className="kf-divider" /><div><p>Almost Shared / The final five</p><span>One identity. Five considered expressions.</span></div></div><a className="kf-open" href={`/design-finalists/${selected}`} target="_blank" rel="noreferrer">Open full page<ArrowUpRight size={17} /></a></header>
    <Tabs value={selected} onValueChange={select} className="kf-tabs">
      <div className="kf-toolbar"><TabsList className="kf-tab-list" aria-label="Choose a Kapioo design">{finalists.map(item => <TabsTrigger key={item.id} value={item.id}><span>{item.number}</span>{item.name}</TabsTrigger>)}</TabsList><div className="kf-view-controls"><button onClick={() => setPhone(false)} aria-label="Desktop view" title="Desktop view" aria-pressed={!phone}><Monitor size={19} /></button><button onClick={() => setPhone(true)} aria-label="Phone view" title="Phone view" aria-pressed={phone}><Smartphone size={19} /></button><button onClick={() => setFocus(!focus)} aria-label={focus ? 'Show design notes' : 'Focus on the page'} title={focus ? 'Show design notes' : 'Focus on the page'} aria-pressed={focus}><Maximize2 size={18} /></button></div></div>
      <div className="kf-notes"><div><p className="kf-note-title">{current.number} / {current.name}<span>{current.note}</span></p><p>{current.description}</p></div><div className="kf-motion-note"><span>As you scroll</span><p>{current.motion}</p></div><button className="kf-choose" onClick={choose}>{notice ? <Check size={16} /> : <Copy size={16} />}Copy my choice</button></div>
      {finalists.map(item => <TabsContent className="kf-panel" key={item.id} value={item.id}><div className="kf-frame-surround"><iframe title={`Kapioo ${item.name} — complete homepage`} src={`/design-finalists/${item.id}`} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen /></div></TabsContent>)}
    </Tabs><div className="kf-status" role="status">{notice || 'Explore the page below. The kitchen film has sound and full-screen controls. Your live homepage stays unchanged until you choose.'}</div>
  </main>
}
