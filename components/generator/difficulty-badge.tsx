import { cn } from "@/lib/utils"
import { difficultyLabel, difficultyTone } from "@/lib/generator-difficulty"

type Props = {
  level: number
  className?: string
}

const TONE_CLASSES: Record<ReturnType<typeof difficultyTone>, string> = {
  muted: "border-border bg-muted text-foreground",
  emerald:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  amber:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  rose:
    "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
}

export function DifficultyBadge({ level, className }: Props) {
  const tone = difficultyTone(level)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className
      )}
      title={difficultyLabel(level)}
    >
      <span className="font-semibold tabular-nums">{Math.round(level)}/5</span>
      <span className="hidden sm:inline">·</span>
      <span className="hidden sm:inline">{difficultyLabel(level)}</span>
    </span>
  )
}
