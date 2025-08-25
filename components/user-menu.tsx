// components/user-menu.tsx
"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useState } from "react"

export default function UserMenu({ className = "" }: { className?: string }) {
  const { data } = useSession()
  const email = data?.user?.email

  // Fallback: auch per Klick öffnen, nicht nur Hover (besser mobil-freundlich)
  const [open, setOpen] = useState(false)

  if (!email) return null

  return (
    <div
      className={`relative group ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="rounded px-3 py-2 text-sm border hover:bg-secondary transition"
        aria-haspopup="menu"
        aria-expanded={open}
        title={email}
      >
        {email}
      </button>

      <div
        className={`absolute right-0 mt-2 w-48 rounded border bg-white dark:bg-card shadow-lg
                    ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
                    transition-opacity`}
        role="menu"
      >
        <Link
          href="/account"
          className="block px-3 py-2 text-sm hover:bg-secondary"
          role="menuitem"
        >
          Account
        </Link>
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-secondary"
          onClick={() => signOut({ callbackUrl: "/login" })}
          role="menuitem"
        >
          Abmelden
        </button>
      </div>
    </div>
  )
}