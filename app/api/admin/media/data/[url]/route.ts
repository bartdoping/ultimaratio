import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ url: string }> }
) {
  try {
    const { url } = await params
    const decodedUrl = decodeURIComponent(url)

    const media = await prisma.mediaAsset.findUnique({
      where: { url: decodedUrl },
      select: { dataBase64: true, mimeType: true },
    })
    if (!media?.dataBase64) {
      return NextResponse.json({ error: "Data not found" }, { status: 404 })
    }
    
    // Erstelle Data URL
    const dataUrl = `data:${media.mimeType || "image/jpeg"};base64,${media.dataBase64}`
    
    return NextResponse.json({ dataUrl })
    
  } catch (error) {
    console.error("Error retrieving media data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
