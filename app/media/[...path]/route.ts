import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const filename = path.join('/')

    const media = await prisma.mediaAsset.findUnique({
      where: { url: `/media/${filename}` },
      select: { dataBase64: true, mimeType: true }
    })
    if (!media?.dataBase64) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Konvertiere Base64 zu Buffer
    const buffer = Buffer.from(media.dataBase64, 'base64')
    
    // Gib Bild zurück
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': media.mimeType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000', // 1 Jahr Cache
      },
    })
    
  } catch (error) {
    console.error("Error serving media:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
