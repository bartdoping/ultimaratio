"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

type User = {
  id: string
  email: string
  name: string
  surname: string
  role: "user" | "admin"
  emailVerifiedAt: string | null
  createdAt: string
  subscriptionStatus: "free" | "pro"
  subscription?: {
    status: string
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    stripeSubscriptionId: string | null
  } | null
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
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [deleteResult, setDeleteResult] = useState<string | null>(null)

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

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`⚠️ WARNUNG: User "${userEmail}" wird gelöscht! Fortfahren?`)) {
      return
    }

    if (!confirm(`⚠️ LETZTE WARNUNG: Diese Aktion kann NICHT rückgängig gemacht werden! User "${userEmail}" wirklich löschen?`)) {
      return
    }

    setDeletingUser(userId)
    setDeleteResult(null)

    try {
      const response = await fetch(`/api/admin/delete-user/${userId}`, {
        method: "DELETE",
        credentials: "include"
      })
      
      const data = await response.json()
      
      if (data.ok) {
        setDeleteResult(`✅ User "${userEmail}" erfolgreich gelöscht`)
        // User aus der Liste entfernen
        setUsers(users.filter(user => user.id !== userId))
      } else {
        setDeleteResult(`❌ Fehler: ${data.error || "Unbekannter Fehler"}`)
      }
    } catch (error) {
      console.error("Delete user failed:", error)
      setDeleteResult(`❌ Fehler: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`)
    } finally {
      setDeletingUser(null)
    }
  }

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
        {deleteResult && (
          <Alert className="mb-4">
            <AlertDescription>
              {deleteResult}
            </AlertDescription>
          </Alert>
        )}
        
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
                  <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                    <span>Registriert: {new Date(user.createdAt).toLocaleDateString("de-DE")}</span>
                    <span>•</span>
                    <span>Versuche: {user._count.attempts}</span>
                    <span>•</span>
                    <span>Decks: {user._count.decks}</span>
                  </div>
                  
                  {/* Abonnement-Status */}
                  <div className="mb-2">
                    {user.subscriptionStatus === "pro" ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                          <span className="mr-1">👑</span>
                          Pro-User
                        </Badge>
                        {user.subscription?.currentPeriodEnd && (
                          <span className="text-xs text-muted-foreground">
                            Nächste Abbuchung: {new Date(user.subscription.currentPeriodEnd).toLocaleDateString("de-DE", {
                              year: "numeric",
                              month: "long",
                              day: "numeric"
                            })}
                          </span>
                        )}
                        {user.subscription?.cancelAtPeriodEnd && (
                          <Badge variant="outline" className="text-orange-600">
                            Gekündigt
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="secondary">
                        Kostenlos
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">ID: {user.id}</span>
                  </div>
                </div>
                
                {user.role !== "admin" && (
                  <div className="ml-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      disabled={deletingUser === user.id}
                    >
                      {deletingUser === user.id ? "Lösche..." : "🗑️ Löschen"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
