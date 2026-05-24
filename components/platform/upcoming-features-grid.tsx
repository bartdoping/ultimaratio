import { UPCOMING_FEATURES } from "@/lib/platform-access"

type Props = {
  compact?: boolean
}

export function UpcomingFeaturesGrid({ compact = false }: Props) {
  return (
    <div
      className={
        compact
          ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
          : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      }
    >
      {UPCOMING_FEATURES.map((feature) => (
        <div
          key={feature.title}
          className="rounded-xl border bg-card p-5 shadow-sm space-y-2 relative overflow-hidden"
        >
          <span className="absolute top-3 right-3 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Bald
          </span>
          <div className="text-2xl" aria-hidden>
            {feature.icon}
          </div>
          <h3 className="font-semibold pr-12">{feature.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
        </div>
      ))}
    </div>
  )
}
