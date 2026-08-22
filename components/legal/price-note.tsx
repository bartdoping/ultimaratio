import { cn } from "@/lib/utils"

/**
 * Pflichtangabe zum Gesamtpreis (§ 3 PAngV).
 *
 * Gegenüber Verbrauchern ist der Endpreis anzugeben. Der sonst übliche Zusatz
 * „inkl. MwSt." wäre hier FALSCH, weil die Anbieterin die
 * Kleinunternehmer­regelung nach § 19 UStG anwendet und keine Umsatzsteuer
 * erhebt oder ausweist. Diese Komponente hält die Formulierung an einer
 * einzigen Stelle, damit sie überall identisch erscheint.
 */
export function PriceNote({
  className,
  variant = "full",
}: {
  className?: string
  /** "full" = vollständiger Satz, "short" = knapper Zusatz direkt am Preis. */
  variant?: "full" | "short"
}) {
  return (
    <p className={cn("text-[11px] leading-relaxed text-muted-foreground", className)}>
      {variant === "short" ? (
        <>Endpreis, keine USt. (§ 19 UStG)</>
      ) : (
        <>
          Endpreis. Gemäß § 19 UStG erheben wir als Kleinunternehmer keine
          Umsatzsteuer und weisen daher keine aus.
        </>
      )}
    </p>
  )
}
