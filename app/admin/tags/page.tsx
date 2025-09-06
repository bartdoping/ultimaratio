// app/admin/tags/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import TagManager from "./_client-tag-manager"

export const runtime = "nodejs"

export default async function AdminTagsPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") {
    redirect("/dashboard")
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
      },
      _count: {
        select: { questionLinks: true }
      }
    }
  })

  // Simuliere isSuper basierend auf parentId
  const tagsWithIsSuper = tags.map(tag => ({
    ...tag,
    isSuper: !tag.parentId,
    children: tag.children?.map(child => ({
      ...child,
      isSuper: false
    })) || []
  }))

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tag-Management</h1>
      </div>

      <TagManager initialTags={tagsWithIsSuper} />
    </div>
  )
}
