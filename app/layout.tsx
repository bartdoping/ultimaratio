// app/layout.tsx
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { SiteHeader } from "@/components/site-header"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: "UltimaRatio – IMPP Coach",
  description: "Übe IMPP-Fragen für das 2. Staatsexamen – UltimaRatio",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full">
      <body className={`${inter.className} min-h-dvh flex flex-col bg-background text-foreground antialiased`}>
        <Providers>
          <div className="flex min-h-dvh flex-1 flex-col">
            <SiteHeader />
            <main className="container mx-auto max-w-5xl px-4 py-6">
              {children}
            </main>
            <footer className="border-t py-4 text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} UltimaRatio
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}