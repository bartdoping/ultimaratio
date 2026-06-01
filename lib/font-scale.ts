/** Anzeige-Skalierung für lange Lern-Sessions. */
export type FontScale = "small" | "normal" | "large"

export const FONT_SCALE_COOKIE = "ur_font_scale"
export const FONT_SCALE_DEFAULT: FontScale = "normal"

export function isFontScale(v: unknown): v is FontScale {
  return v === "small" || v === "normal" || v === "large"
}

export function fontScaleHtmlAttribute(scale: FontScale): string {
  return scale
}

/** Liefert die zugehörige Root-Font-Size in % für `html`. */
export function fontScaleHtmlSize(scale: FontScale): string {
  switch (scale) {
    case "small":
      return "92%"
    case "large":
      return "112%"
    case "normal":
    default:
      return "100%"
  }
}
