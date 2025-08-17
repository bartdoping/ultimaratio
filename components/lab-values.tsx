"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { useEffect, useState } from "react"

type Lab = { id: string; name: string; refRange: string; unit: string; category: string }

export function LabValuesButton() {
  const [open, setOpen] = useState(false)
  const [labs, setLabs] = useState<Lab[]>([])

  useEffect(() => {
    if (!open || labs.length) return
    fetch("/api/labs").then(r => r.json()).then(d => setLabs(d.labs || [])).catch(() => {})
  }, [open, labs.length])

  const byCat = labs.reduce((acc: Record<string, Lab[]>, l) => {
    acc[l.category] = acc[l.category] || []
    acc[l.category].push(l)
    return acc
  }, {})

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="btn">Laborwerte</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed inset-0 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl bg-white rounded-md p-4 space-y-4">
            <div className="flex justify-between items-center">
              <Dialog.Title className="text-lg font-semibold">Laborwerte – Referenzbereiche</Dialog.Title>
              <Dialog.Close className="btn">Schließen</Dialog.Close>
            </div>
            {Object.entries(byCat).map(([cat, list]) => (
              <div key={cat}>
                <h3 className="font-medium mb-2">{cat}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {list.map(l => (
                    <div key={l.id} className="rounded border p-2 text-sm">
                      <div className="font-medium">{l.name}</div>
                      <div className="text-muted-foreground">{l.refRange} {l.unit}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!labs.length && <p className="text-sm text-muted-foreground">Lade…</p>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
