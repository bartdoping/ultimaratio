import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const examId = formData.get("examId") as string
    const questionId = formData.get("questionId") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validiere Dateityp
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    // Validiere Dateigröße (10MB Limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large" }, { status: 400 })
    }

    // Konvertiere zu Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generiere eindeutigen Dateinamen
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `upload_${timestamp}.${extension}`

    // Speichere in public/media/ (für Entwicklung)
    // In Produktion würde man hier einen Cloud-Service wie AWS S3 verwenden
    const fs = require('fs')
    const path = require('path')
    
    const uploadDir = path.join(process.cwd(), 'public', 'media', 'uploads')
    
    // Erstelle Upload-Verzeichnis falls es nicht existiert
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const filePath = path.join(uploadDir, filename)
    fs.writeFileSync(filePath, buffer)

    // Erstelle URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const url = `${baseUrl}/media/uploads/${filename}`

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

    return NextResponse.json({ 
      success: true, 
      url: asset.url,
      id: asset.id,
      alt: asset.alt 
    })

  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
