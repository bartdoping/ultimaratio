import { requireAdmin } from "@/lib/authz"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createExamAction } from "./actions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ERROR_TEXT: Record<string, string> = {
  "slug-taken":
    "Dieser Slug ist bereits vergeben. Bitte einen anderen Slug wählen.",
  missing: "Titel und Slug sind Pflichtfelder.",
  "create-failed":
    "Die Prüfung konnte nicht angelegt werden. Bitte später erneut versuchen oder Support informieren.",
}

type Props = { searchParams: Promise<{ error?: string }> }

export default async function NewExamPage({ searchParams }: Props) {
  await requireAdmin()
  const { error: errorKey } = await searchParams
  const errorMessage = errorKey ? ERROR_TEXT[errorKey] ?? null : null

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Neue Prüfung anlegen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Erstelle zuerst die Prüfung. Fragen, Fälle, Tags und Import verwaltest du danach im Editor.
        </p>
      </div>
      {errorMessage ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <form action={createExamAction} className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="space-y-1">
          <Label htmlFor="title">Titel</Label>
          <Input id="title" name="title" placeholder="z. B. Innere Medizin Probeexamen" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" placeholder="z. B. innere-medizin-probeexamen" required />
          <p className="text-xs text-muted-foreground">Der Slug erscheint später in URLs und sollte eindeutig sein.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="description">Beschreibung</Label>
          <Input id="description" name="description" placeholder="Kurze Beschreibung für Admin und Nutzeransicht" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="passPercent">Bestehensgrenze (%)</Label>
          <Input id="passPercent" name="passPercent" type="number" defaultValue={60} />
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="text-sm text-muted-foreground">
            Sofort-Feedback ist global automatisch aktiviert.
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublished" />
            Direkt veröffentlichen
          </label>
        </div>
        <Button type="submit">Prüfung anlegen</Button>
      </form>
    </div>
  )
}
