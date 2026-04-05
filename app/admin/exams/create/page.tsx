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
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">Neue Prüfung</h1>
      {errorMessage ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <form action={createExamAction} className="space-y-3">
        <div>
          <Label htmlFor="title">Titel</Label>
          <Input id="title" name="title" required />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" required />
        </div>
        <div>
          <Label htmlFor="description">Beschreibung</Label>
          <Input id="description" name="description" />
        </div>
        <div>
          <Label htmlFor="passPercent">Bestehensgrenze (%)</Label>
          <Input id="passPercent" name="passPercent" type="number" defaultValue={60} />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            ✓ Sofort-Feedback global ist automatisch aktiviert
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isPublished" /> Veröffentlicht
          </label>
        </div>
        <Button type="submit">Anlegen</Button>
      </form>
    </div>
  )
}
