import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Transparenzhinweis für KI-generierte Inhalte.
 *
 * Zweck:
 *  - Art. 50 KI-VO (EU AI Act): Offenlegung, dass Inhalte durch KI erzeugt sind.
 *  - Stützt den medizinischen Haftungsausschluss aus § 10 der AGB und den
 *    Hinweis in der Datenschutzerklärung (Abschnitt 7).
 *
 * Der Hinweis muss dauerhaft sichtbar sein — nicht hinter einem Aufklapper.
 */
export function AiDisclaimer({
  className,
  variant = "inline",
}: {
  className?: string
  /** "inline" = dezente Zeile, "card" = abgesetzter Kasten. */
  variant?: "inline" | "card"
}) {
  const text = (
    <>
      Diese Fragen wurden mit künstlicher Intelligenz generiert und können Fehler
      enthalten. Sie dienen ausschließlich der Prüfungsvorbereitung und ersetzen
      keine Lehrbücher, Leitlinien oder ärztliche Beratung.
    </>
  )

  if (variant === "card") {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-lg border bg-muted/30 px-3 py-2.5",
          className
        )}
      >
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
      </div>
    )
  }

  return (
    <p className={cn("text-center text-xs leading-relaxed text-muted-foreground", className)}>
      {text}
    </p>
  )
}
