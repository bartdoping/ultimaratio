import { SettingsNav } from "@/components/settings/settings-nav"

type SettingsShellProps = {
  title: string
  description: string
  children: React.ReactNode
}

export function SettingsShell({ title, description, children }: SettingsShellProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-12 pt-4 sm:space-y-6 sm:px-6 sm:pt-8">
      {/* Hero: auf Mobile kompakt */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Einstellungen
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SettingsNav />
        </aside>
        <div className="min-w-0 space-y-4 sm:space-y-6">{children}</div>
      </div>
    </div>
  )
}
