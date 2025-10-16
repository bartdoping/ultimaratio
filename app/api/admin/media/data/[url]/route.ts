import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ url: string }> }
) {
  try {
    const { url } = await params
    const decodedUrl = decodeURIComponent(url)
    
    // Hole Base64-Daten aus temporärem Speicher
    const tempStorage = global as any
    if (!tempStorage.uploadCache) {
      return NextResponse.json({ error: "No data found" }, { status: 404 })
    }
    
    const base64Data = tempStorage.uploadCache.get(decodedUrl)
    if (!base64Data) {
      return NextResponse.json({ error: "Data not found" }, { status: 404 })
    }
    
    // Erstelle Data URL
    const dataUrl = `data:image/jpeg;base64,${base64Data}`
    
    return NextResponse.json({ dataUrl })
    
  } catch (error) {
    console.error("Error retrieving media data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
