import { NextResponse } from "next/server"

export const runtime = "nodejs"

// DELETE: Alle User außer Admin löschen
export async function DELETE() {
  return NextResponse.json(
    { error: "disabled", message: "Bulk-Löschungen von Nutzern sind über diese API deaktiviert." },
    { status: 410 }
  )
}
