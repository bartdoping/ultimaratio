import * as Sentry from "@sentry/nextjs"
import { SENTRY_BASIS } from "@/lib/sentry-scrub"

Sentry.init(SENTRY_BASIS)
