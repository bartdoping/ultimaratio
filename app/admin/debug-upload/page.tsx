import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/authz"

export default async function DebugUploadPage() {
  await requireAdmin()
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Upload Debug</h1>
      
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <h2 className="font-semibold text-yellow-800">Debug-Informationen</h2>
          <p className="text-sm text-yellow-700 mt-2">
            Diese Seite zeigt Upload-Logs an. Öffne die Browser-Entwicklertools (F12) 
            und schaue in die Konsole für detaillierte Fehlermeldungen.
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h2 className="font-semibold text-blue-800">Upload testen</h2>
          <p className="text-sm text-blue-700 mt-2">
            Versuche ein Bild hochzuladen und schaue in die Konsole für Logs.
          </p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <h2 className="font-semibold text-green-800">Server-Logs</h2>
          <p className="text-sm text-green-700 mt-2">
            Server-Logs findest du in der Vercel-Konsole oder im Terminal.
          </p>
        </div>
      </div>
    </div>
  )
}
