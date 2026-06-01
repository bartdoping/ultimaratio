"use client"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { LoadingProvider } from "@/components/loading-spinner"
import { AutoLoading } from "@/components/auto-loading"
import { FeedbackWidget } from "@/components/feedback/feedback-widget"
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
          <Toaster />
        </LoadingProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
