import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { SiteHeader } from "@/components/site-header"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "UltimaRatio – IMPP Coach",
  description: "Übe IMPP-Fragen für das 2. Staatsexamen – UltimaRatio",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-dvh flex flex-col">
            <SiteHeader />
            <main className="flex-1 container py-6">{children}</main>
            <footer className="border-t py-4 text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} UltimaRatio
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}
