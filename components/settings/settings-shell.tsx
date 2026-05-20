import { SettingsNav } from "@/components/settings/settings-nav"

type SettingsShellProps = {
  title: string
  description: string
  children: React.ReactNode
}

export function SettingsShell({ title, description, children }: SettingsShellProps) {
  return (
    <div className="container mx-auto max-w-5xl py-8 space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Einstellungen
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SettingsNav />
        </aside>
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </div>
  )
}
