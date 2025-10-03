"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type User = {
  id: string
  email: string
  name: string
  surname: string
  role: "user" | "admin"
  emailVerifiedAt: string | null
  createdAt: string
  _count: {
    attempts: number
    purchases: number
    decks: number
  }
}

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch("/api/admin/users")
        if (!response.ok) {
          throw new Error("Failed to fetch users")
        }
        const data = await response.json()
        setUsers(data.users)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registrierte User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Lade User...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registrierte User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">Fehler: {error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrierte User ({users.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">
                      {user.name} {user.surname}
                    </h3>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                    {user.emailVerifiedAt ? (
                      <Badge variant="outline" className="text-green-600">
                        Verifiziert
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600">
                        Nicht verifiziert
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Registriert: {new Date(user.createdAt).toLocaleDateString("de-DE")}</span>
                    <span>•</span>
                    <span>Versuche: {user._count.attempts}</span>
                    <span>•</span>
                    <span>Käufe: {user._count.purchases}</span>
                    <span>•</span>
                    <span>Decks: {user._count.decks}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
