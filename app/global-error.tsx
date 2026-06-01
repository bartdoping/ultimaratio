"use client"

/**
 * Letzte Verteidigungslinie, wenn der Root-Layout selbst einen Fehler wirft.
 * Hier ist kein <html>/<body> aus dem Layout verfügbar — wir rendern bewusst
 * eigenständig und ohne Provider/Theme.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="de">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "48px 16px",
          textAlign: "center",
          color: "#222",
          background: "#fafafa",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
          Unerwarteter Fehler
        </h1>
        <p style={{ color: "#555", maxWidth: 480, margin: "0 auto 16px" }}>
          Etwas Grundlegendes ist schiefgelaufen. Wir wurden benachrichtigt.
        </p>
        {error.digest && (
          <p style={{ color: "#888", fontSize: 12 }}>Fehler-ID: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: 16,
            padding: "8px 16px",
            border: "1px solid #ccc",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Erneut versuchen
        </button>
      </body>
    </html>
  )
}
