"use client"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { LoadingProvider } from "@/components/loading-spinner"
import { AutoLoading } from "@/components/auto-loading"
import { LoadingTest } from "@/components/loading-test"

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
          <LoadingTest />
          {children}
        </LoadingProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
