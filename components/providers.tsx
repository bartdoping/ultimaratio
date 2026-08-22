"use client"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { LoadingProvider } from "@/components/loading-spinner"
import { AutoLoading } from "@/components/auto-loading"
import { FeedbackWidget } from "@/components/feedback/feedback-widget"
import { ConsentBanner } from "@/components/consent/consent-banner"
import { GoogleTags } from "@/components/analytics/google-tags"
import { Toaster } from "sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <LoadingProvider>
          <AutoLoading />
          {children}
          <FeedbackWidget />
          {/* Lädt GA/Ads ausschließlich nach aktiver Einwilligung. */}
          <GoogleTags />
          <ConsentBanner />
          <Toaster />
        </LoadingProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
