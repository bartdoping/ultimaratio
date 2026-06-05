/**
 * Qualitätsfilter für die "Must-Know"- und "Lernhilfe"-Boxen im Runner.
 *
 * Wir zeigen die Boxen NUR, wenn der Inhalt eine echte Lernhilfe ist. Ein leeres
 * Feld, eine generische Floskel oder eine offensichtlich konstruierte
 * Eselsbrücke sind hier schlechter als gar keine Box.
 *
 * Diese Heuristik ist absichtlich konservativ: lieber eine sehr gute Hilfe
 * weglassen als eine schwache zeigen.
 */

const GENERIC_MUST_KNOW_PATTERNS = [
  /^\s*(verständnis|verstehen|kennen|wissen)\b/i,
  /^\s*einf(ü|ue)hrung\b/i,
  /^\s*(allgemeine|grundlegende|generelle)/i,
  /^\s*(merke|merken)\b[\s:]/i, // pure "merken: …" ohne Substanz
]

/**
 * Must-Know: ≥ 1 substanzieller Satz, keine reine Floskel.
 */
export function isMustKnowWorthShowing(value: string | null | undefined): boolean {
  if (!value) return false
  const v = value.trim()
  if (v.length < 25) return false
  if (GENERIC_MUST_KNOW_PATTERNS.some((re) => re.test(v))) return false
  return true
}

/**
 * Lernhilfe / Eselsbrücke: signifikant strenger.
 *
 * Heuristik für eine echte Eselsbrücke:
 *  - Es gibt ein Akronym (mehrere Großbuchstaben am Stück) ODER
 *  - Es enthält einen Doppelpunkt + erklärt Anfangsbuchstaben ODER
 *  - Es enthält ein klar erkennbares Eselsbrücken-Stichwort
 *    ("Eselsbrücke", "Merkspruch", "Akronym", "Merkhilfe", "Bildbrücke") ODER
 *  - Sehr explizit benannte etablierte Schemata ("FAST", "ABCDE", "qSOFA",
 *    "CHADS", "BANANA", "ACHT-S").
 *
 * Außerdem: Es darf nicht offensichtlich wackelig sein
 *  - keine pure "Merke: …"-Floskel ohne Substanz
 *  - nicht zu kurz (< 18 Zeichen)
 *  - nicht generische "denke an …"-Sätze ohne Hook
 */
const MNEMONIC_HOOK_KEYWORDS = [
  /eselsbr(ü|ue)cke/i,
  /merkspruch/i,
  /akronym/i,
  /merkhilfe/i,
  /bildbr(ü|ue)cke/i,
  /merksatz/i,
]

const ESTABLISHED_MNEMONIC_TOKENS = [
  /\bFAST\b/,
  /\bABCDE\b/,
  /\bqSOFA\b/,
  /\bSIRS\b/,
  /\bCHA\d?\s?-?DS\d?(\s?-?VASc)?\b/i,
  /\bHAS[\s-]?BLED\b/i,
  /\bBANANA\b/i,
  /\bACHT[-\s]?S\b/i,
  /\bABCD2?\b/,
  /\bMUDPILES\b/i,
  /\bSAMPLE\b/i,
  /\bAEIOU\b/i,
  /\bSOAP\b/i,
  /\bMONA\b/i,
]

const WEAK_MNEMONIC_PATTERNS = [
  // "Merke: X führt zu Y" ist keine Eselsbrücke, das ist eine schwache
  // Wiederholung der Antwort.
  /^\s*merke\s*[:!,]/i,
  /^\s*denke an\b/i,
  /^\s*nicht vergessen\b/i,
]

/**
 * Liefert true nur dann, wenn der String eine ECHTE Eselsbrücke darstellt.
 * Bei Zweifel: false (Box ausblenden).
 */
export function isMnemonicWorthShowing(value: string | null | undefined): boolean {
  if (!value) return false
  const v = value.trim()
  if (v.length < 18) return false
  if (WEAK_MNEMONIC_PATTERNS.some((re) => re.test(v))) return false

  // 1) Hat etabliertes Token?
  if (ESTABLISHED_MNEMONIC_TOKENS.some((re) => re.test(v))) return true

  // 2) Hat explizites Schlagwort?
  if (MNEMONIC_HOOK_KEYWORDS.some((re) => re.test(v))) return true

  // 3) Hat eigenes Akronym in GROSSBUCHSTABEN (≥ 3 Buchstaben am Stück)?
  if (/\b[A-ZÄÖÜ]{3,}\b/.test(v)) return true

  // 4) Hat "Doppelpunkt-Aufschlüsselung" (Akronym: Buchstabe = Wort, …)?
  //    Heuristik: Doppelpunkt + danach ein Pattern "X = Wort" oder "X - Wort".
  if (/:\s*[A-ZÄÖÜ]\s*[-=]\s*[A-Za-zÄÖÜäöü]/.test(v)) return true

  return false
}
