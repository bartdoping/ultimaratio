"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Plus } from "lucide-react"
import BulkAddByTags from "./bulk-add-by-tags"

interface BulkAddSectionProps {
  deckId: string
  onItemsAdded?: (added: number, total: number, alreadyExists: number) => void
  className?: string
}

export default function BulkAddSection({
  deckId,
  onItemsAdded,
  className = ""
}: BulkAddSectionProps) {
  const [open, setOpen] = useState(false)

  const handleSuccess = (added: number, total: number, alreadyExists: number) => {
    if (onItemsAdded) {
      onItemsAdded(added, total, alreadyExists)
    }
    // Nach erfolgreichem Hinzufügen schließen
    setOpen(false)
  }

  return (
    <Card className={className}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Fragen nach Tags hinzufügen
              </CardTitle>
              {open ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <BulkAddByTags
              deckId={deckId}
              onSuccess={handleSuccess}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
