import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import Logo from "@/components/logo"

export default async function ComingSoonPage() {
  const session = await getServerSession(authOptions)
  
  // Wenn eingeloggt, prüfe ob Admin
  if (session?.user?.email) {
    // Admin-E-Mails definieren
    const adminEmails = [
      "info@ultima-rat.io",
      "admin@fragenkreuzen.de"
    ]
    
    // Wenn Admin, weiterleiten zur App
    if (adminEmails.includes(session.user.email)) {
      redirect("/")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Logo />
        </div>
        
        {/* Hauptinhalt */}
        <div className="space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white">
            fragenkreuzen.de
          </h1>
          
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-700 dark:text-gray-300">
            Coming Soon
          </h2>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
            Die Fragenbank für dein Medizinstudium ist bald verfügbar. 
            Wir arbeiten hart daran, dir die beste Lernplattform zu bieten.
          </p>
        </div>
        
        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="text-3xl mb-3">📚</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Prüfungsfragen
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Übe mit realistischen Single-Choice-Fragen für deine Prüfungen.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="text-3xl mb-3">🧠</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Spaced Repetition
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Intelligente Wiederholung für optimales Lernen
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Auswertung
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Detaillierte Statistiken und Fortschrittsverfolgung
            </p>
          </div>
        </div>
        
        
        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-12">
          <p>© 2025 fragenkreuzen.de - Alle Rechte vorbehalten</p>
          <p className="mt-2">
            <a href="https://www.ultima-rat.io" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
              by ultima-rat.io
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
