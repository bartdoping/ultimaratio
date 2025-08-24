// components/admin/attach-image-by-url.tsx
"use client"

import { useState } from "react"

export function AttachImageByUrl({ questionId }: { questionId: string }) {
  const [url, setUrl] = useState("")
  const [alt, setAlt] = useState("")
  const [order, setOrder] = useState(0)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function onAttach(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null); setErr(null)
    try {
      const mRes = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, alt }),
      })
      const mJson = await mRes.json()
      if (!mRes.ok || !mJson?.media?.id) throw new Error(mJson?.error || "media create failed")

      const aRes = await fetch(`/api/admin/questions/${encodeURIComponent(questionId)}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: mJson.media.id, order }),
      })
      if (!aRes.ok) {
        const j = await aRes.json().catch(()=> ({}))
        throw new Error(j?.error || "attach failed")
      }
      setMsg("Bild verknüpft.")
      setUrl(""); setAlt(""); setOrder(0)
    } catch (e:any) {
      setErr(e.message || "Fehler")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onAttach} className="space-y-2 border rounded p-3">
      <div className="text-sm font-medium">Bild per URL anhängen</div>
      <input className="w-full border rounded px-3 h-9" placeholder="/media/foo.jpg oder https://…" value={url} onChange={e=>setUrl(e.target.value)} required />
      <input className="w-full border rounded px-3 h-9" placeholder="Alt-Text (optional)" value={alt} onChange={e=>setAlt(e.target.value)} />
      <div className="flex items-center gap-2">
        <label className="text-sm">Reihenfolge</label>
        <input type="number" className="w-24 border rounded px-2 h-9" value={order} onChange={e=>setOrder(parseInt(e.target.value||"0",10))}/>
      </div>
      <button className="btn" disabled={busy}>{busy ? "Speichern…" : "Anhängen"}</button>
      {msg && <p className="text-green-600 text-sm">{msg}</p>}
      {err && <p className="text-red-600 text-sm">{err}</p>}
    </form>
  )
}