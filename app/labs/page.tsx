import type { Metadata } from "next"
import Link from "next/link"
import prisma from "@/lib/db"
import { ensureLaborH24InDb } from "@/lib/import-labor-h24"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Laborwerte – Referenzbereiche (H24)",
  description:
    "Laborparameter-Tabellen mit Referenzbereichen (IMPP H24): Erwachsene und Kinder, gruppiert nach Kategorie.",
}

export default async function LabsReferencePage() {
  await ensureLaborH24InDb()
  const labs = await prisma.labValue.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Laborwerte – Referenzbereiche</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Orientierung an den bundeseinheitlichen schriftlichen Prüfungen (2. Abschnitt der Ärztlichen Prüfung).
          Die Tabellen entsprechen der strukturierten Einteilung in der App (Kategorie → Parameter).
        </p>
        <Link href="/" className="text-sm text-primary underline underline-offset-4">
          Zur Startseite
        </Link>
      </div>

      {labs.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded border p-4">
          Es sind noch keine Laborwerte in der Datenbank. Ein Administrator kann unter{" "}
          <Link href="/admin/labs" className="underline">
            Admin → Laborwerte
          </Link>{" "}
          die H24-Referenz importieren.
        </p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="max-h-[min(80vh,1200px)] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-secondary/95 backdrop-blur border-b">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Kategorie</th>
                  <th className="px-3 py-2 font-medium min-w-[12rem]">Parameter</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Einheit</th>
                  <th className="px-3 py-2 font-medium min-w-[16rem]">Referenzbereich</th>
                </tr>
              </thead>
              <tbody>
                {labs.map((l) => (
                  <tr key={l.id} className="odd:bg-muted/30 border-b border-border/60 align-top">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap text-xs max-w-[14rem]">
                      {l.category.replace(/^\d+\s+/, "")}
                    </td>
                    <td className="px-3 py-2 font-medium">{l.name}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{l.unit || "—"}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{l.refRange}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground px-3 py-2 border-t bg-muted/20">
            {labs.length} Einträge · Stand entspricht <code className="text-xs">data/laborwerte-h24.json</code> nach
            letztem Import
          </p>
        </div>
      )}
    </div>
  )
}
