/**
 * Geteilte IP-Adressen fair behandeln.
 *
 * In Uni-WLANs und im Mobilfunk (Carrier-NAT) teilen sich oft Hunderte
 * Menschen eine IP. Zählte das Kontingent pro IP, wäre es für alle weg,
 * sobald einer es aufgebraucht hat. Deshalb gilt: Das Kontingent gehört dem
 * Gerät (Cookie) bzw. Konto. Die IP bekommt nur eine großzügige Obergrenze
 * (IP_FAKTOR × Kontingent) — als Schutz gegen das Löschen von Cookies.
 */
export const IP_FAKTOR = 20

/**
 * Effektiv verbraucht für die Anzeige und die Entscheidung:
 * verbleibend = min(limit − eigen, IP-Obergrenze − ip).
 * Ohne eigene Kennung (Cookies blockiert) zählt die IP wie früher.
 */
export function effektivVerbraucht(eigen: number, ip: number, limit: number, hatEigeneKennung: boolean): number {
  if (!hatEigeneKennung) return Math.max(0, ip)
  const ipRest = limit * IP_FAKTOR - ip
  return Math.max(0, eigen, limit - ipRest)
}
