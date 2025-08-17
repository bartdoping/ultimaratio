"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { useState } from "react"

export function ImageGallery({ images }: { images: { url: string; alt?: string }[] }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  if (!images?.length) return null

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {images.map((img, i) => (
          <button
            key={img.url + i}
            className="border rounded-md overflow-hidden h-20 w-28"
            onClick={() => { setActive(i); setOpen(true) }}
            aria-label={`Bild ${i + 1} anzeigen`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.alt ?? ""} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60" />
          <Dialog.Content className="fixed inset-0 flex items-center justify-center p-6">
            <div className="max-h-[90vh] max-w-[90vw] bg-white rounded-md p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[active].url} alt={images[active].alt ?? ""} className="max-h-[80vh] object-contain" />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
