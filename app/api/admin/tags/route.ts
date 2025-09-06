// app/api/admin/tags/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

// GET: Alle Tags mit Hierarchie laden
export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const tags = await prisma.tag.findMany({
    orderBy: [
      { parentId: "asc" },
      { name: "asc" }
    ],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      parent: {
        select: { id: true, name: true, slug: true }
      },
      children: {
        select: { id: true, name: true, slug: true }
      }
    }
  })

  // Simuliere isSuper basierend auf parentId (Tags ohne parentId sind Supertags)
  const tagsWithIsSuper = tags.map(tag => ({
    ...tag,
    isSuper: !tag.parentId,
    children: tag.children?.map(child => ({
      ...child,
      isSuper: false
    })) || []
  }))

  return NextResponse.json({ tags: tagsWithIsSuper })
}

// POST: Neuen Tag erstellen
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { name, slug, isSuper, parentId } = await req.json().catch(() => ({}))
  
  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug required" }, { status: 400 })
  }

  // Validierung: Normale Tags müssen einen Parent haben
  if (!isSuper && !parentId) {
    return NextResponse.json({ error: "normal tags must have a parent" }, { status: 400 })
  }

  // Validierung: Supertags dürfen keinen Parent haben
  if (isSuper && parentId) {
    return NextResponse.json({ error: "supertags cannot have a parent" }, { status: 400 })
  }

  try {
    const tag = await prisma.tag.create({
      data: {
        name,
        slug,
        parentId: isSuper ? null : parentId
      }
    })

    // Füge isSuper und _count zur Antwort hinzu
    const tagWithIsSuper = {
      ...tag,
      isSuper: !!isSuper,
      _count: { questionLinks: 0 }
    }

    return NextResponse.json({ tag: tagWithIsSuper })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "slug already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "failed to create tag" }, { status: 500 })
  }
}

// PUT: Tag aktualisieren
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id, name, slug, isSuper, parentId } = await req.json().catch(() => ({}))
  
  if (!id || !name || !slug) {
    return NextResponse.json({ error: "id, name and slug required" }, { status: 400 })
  }

  // Validierung: Normale Tags müssen einen Parent haben
  if (!isSuper && !parentId) {
    return NextResponse.json({ error: "normal tags must have a parent" }, { status: 400 })
  }

  // Validierung: Supertags dürfen keinen Parent haben
  if (isSuper && parentId) {
    return NextResponse.json({ error: "supertags cannot have a parent" }, { status: 400 })
  }

  try {
    const tag = await prisma.tag.update({
      where: { id },
      data: {
        name,
        slug,
        parentId: isSuper ? null : parentId
      }
    })

    // Füge isSuper und _count zur Antwort hinzu
    const tagWithIsSuper = {
      ...tag,
      isSuper: !!isSuper,
      _count: { questionLinks: 0 }
    }

    return NextResponse.json({ tag: tagWithIsSuper })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "slug already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "failed to update tag" }, { status: 500 })
  }
}

// DELETE: Tag löschen
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await req.json().catch(() => ({}))
  
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 })
  }

  try {
    // Prüfen ob Tag noch verwendet wird
    const usage = await prisma.questionTag.count({
      where: { tagId: id }
    })

    if (usage > 0) {
      return NextResponse.json({ error: "tag is still in use" }, { status: 400 })
    }

    await prisma.tag.delete({
      where: { id }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "failed to delete tag" }, { status: 500 })
  }
}
