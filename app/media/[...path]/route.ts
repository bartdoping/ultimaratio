import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const filename = path.join('/')
    
    // Hole Base64-Daten aus temporärem Speicher
    const tempStorage = global as any
    if (!tempStorage.uploadCache) {
      return NextResponse.json({ error: "No data found" }, { status: 404 })
    }
    
    const base64Data = tempStorage.uploadCache.get(`/media/${filename}`)
    if (!base64Data) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    
    // Bestimme Content-Type basierend auf Dateiendung
    const extension = filename.split('.').pop()?.toLowerCase()
    let contentType = 'image/jpeg'
    
    switch (extension) {
      case 'png':
        contentType = 'image/png'
        break
      case 'gif':
        contentType = 'image/gif'
        break
      case 'webp':
        contentType = 'image/webp'
        break
      case 'svg':
        contentType = 'image/svg+xml'
        break
      default:
        contentType = 'image/jpeg'
    }
    
    // Konvertiere Base64 zu Buffer
    const buffer = Buffer.from(base64Data, 'base64')
    
    // Gib Bild zurück
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // 1 Jahr Cache
      },
    })
    
  } catch (error) {
    console.error("Error serving media:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
