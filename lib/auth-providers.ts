/**
 * OAuth-Provider-Liste — nur Provider, die per Environment konfiguriert sind,
 * werden zurückgegeben. So tauchen in der UI niemals kaputte Buttons auf.
 *
 * Alle Provider sind komplett **server-only** verkabelt (Secrets nie im Client).
 *
 * Hinweise zum Setup siehe `docs/auth-setup.md`.
 */
import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import AppleProvider from "next-auth/providers/apple"
import FacebookProvider from "next-auth/providers/facebook"
import AzureADProvider from "next-auth/providers/azure-ad"

export type OAuthProviderId = "google" | "apple" | "facebook" | "azure-ad"

export type OAuthProviderInfo = {
  id: OAuthProviderId
  label: string
}

function env(name: string): string | undefined {
  const raw = process.env[name]
  if (!raw) return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function buildOAuthProviders(): NonNullable<NextAuthOptions["providers"]> {
  const providers: NonNullable<NextAuthOptions["providers"]> = []

  const googleId = env("GOOGLE_CLIENT_ID")
  const googleSecret = env("GOOGLE_CLIENT_SECRET")
  if (googleId && googleSecret) {
    providers.push(
      GoogleProvider({
        clientId: googleId,
        clientSecret: googleSecret,
        // Wir verlangen verifizierte E-Mails. Google liefert das standardmäßig.
        authorization: {
          params: { prompt: "select_account" },
        },
      })
    )
  }

  const appleId = env("APPLE_CLIENT_ID")
  // Apple's Client-Secret ist ein vorab erzeugtes JWT (siehe docs/auth-setup.md).
  const appleSecret = env("APPLE_CLIENT_SECRET")
  if (appleId && appleSecret) {
    providers.push(
      AppleProvider({
        clientId: appleId,
        clientSecret: appleSecret,
      })
    )
  }

  const fbId = env("FACEBOOK_CLIENT_ID")
  const fbSecret = env("FACEBOOK_CLIENT_SECRET")
  if (fbId && fbSecret) {
    providers.push(
      FacebookProvider({
        clientId: fbId,
        clientSecret: fbSecret,
      })
    )
  }

  const azureId = env("AZURE_AD_CLIENT_ID")
  const azureSecret = env("AZURE_AD_CLIENT_SECRET")
  // Default "common" für Multi-Tenant + persönliche Konten.
  const azureTenant = env("AZURE_AD_TENANT_ID") ?? "common"
  if (azureId && azureSecret) {
    providers.push(
      AzureADProvider({
        clientId: azureId,
        clientSecret: azureSecret,
        tenantId: azureTenant,
      })
    )
  }

  return providers
}

/**
 * Liste der konfigurierten Provider — für die UI, damit nur funktionierende
 * Buttons gerendert werden. Keine Secrets in der Antwort.
 */
export function listConfiguredOAuthProviders(): OAuthProviderInfo[] {
  const out: OAuthProviderInfo[] = []
  if (env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET")) {
    out.push({ id: "google", label: "Mit Google fortfahren" })
  }
  if (env("APPLE_CLIENT_ID") && env("APPLE_CLIENT_SECRET")) {
    out.push({ id: "apple", label: "Mit Apple fortfahren" })
  }
  if (env("FACEBOOK_CLIENT_ID") && env("FACEBOOK_CLIENT_SECRET")) {
    out.push({ id: "facebook", label: "Mit Facebook fortfahren" })
  }
  if (env("AZURE_AD_CLIENT_ID") && env("AZURE_AD_CLIENT_SECRET")) {
    out.push({ id: "azure-ad", label: "Mit Microsoft fortfahren" })
  }
  return out
}
