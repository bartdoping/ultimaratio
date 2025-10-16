import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    console.log("Upload API called")
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.log("No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Session found for:", session.user.email)

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (!user || user.role !== "admin") {
      console.log("User not admin:", user?.role)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const examId = formData.get("examId") as string
    const questionId = formData.get("questionId") as string

    console.log("FormData received:", { 
      hasFile: !!file, 
      fileName: file?.name, 
      fileSize: file?.size,
      examId, 
      questionId 
    })

    if (!file) {
      console.log("No file provided")
      return NextResponse.json({ 
        success: false,
        error: "No file provided" 
      }, { status: 400 })
    }

    // Validiere Dateityp
    if (!file.type.startsWith('image/')) {
      console.log("Invalid file type:", file.type)
      return NextResponse.json({ 
        success: false,
        error: "Invalid file type" 
      }, { status: 400 })
    }

    // Validiere Dateigröße (10MB Limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      console.log("File too large:", file.size)
      return NextResponse.json({ 
        success: false,
        error: "File too large" 
      }, { status: 400 })
    }

    // Konvertiere zu Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generiere eindeutigen Dateinamen
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `upload_${timestamp}.${extension}`

    // Für Produktion: Verwende Base64-Encoding statt Dateisystem
    // In einer echten Anwendung würde man hier einen Cloud-Service wie AWS S3 verwenden
    const base64 = buffer.toString('base64')
    
    // Erstelle eine kürzere URL für die Datenbank
    const url = `/media/upload_${timestamp}.${extension}`
    
    // Speichere Base64-Daten in einem separaten Feld oder externen Service
    // Für jetzt verwenden wir eine einfache URL-Struktur

    console.log("Creating media asset with URL:", url.substring(0, 50) + "...")

    // Temporärer Speicher für Base64-Daten (in Produktion würde man Redis oder ähnliches verwenden)
    const tempStorage = global as any
    if (!tempStorage.uploadCache) tempStorage.uploadCache = new Map()
    tempStorage.uploadCache.set(url, base64)
    
    // Speichere in Datenbank
    const asset = await prisma.mediaAsset.upsert({
      where: { url },
      update: { alt: file.name },
      create: { 
        url, 
        alt: file.name, 
        kind: "image" 
      },
    })

    console.log("Media asset created:", asset.id)

    // Verknüpfe mit Frage falls questionId vorhanden
    if (questionId) {
      const agg = await prisma.questionMedia.aggregate({
        where: { questionId },
        _max: { order: true },
      })
      const nextOrder = (agg._max.order ?? 0) + 1

      const existing = await prisma.questionMedia.findUnique({
        where: { questionId_mediaId: { questionId, mediaId: asset.id } },
      })
      
      if (!existing) {
        await prisma.questionMedia.create({
          data: { questionId, mediaId: asset.id, order: nextOrder },
        })
      }
    }

    console.log("Upload successful, returning response")

    return NextResponse.json({ 
      success: true, 
      url: asset.url,
      id: asset.id,
      alt: asset.alt 
    })

  } catch (error) {
    console.error("Upload error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ 
      success: false,
      error: "Upload failed", 
      details: errorMessage 
    }, { status: 500 })
  }
}
