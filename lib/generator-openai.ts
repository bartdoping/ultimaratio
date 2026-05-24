import OpenAI from "openai"
import { GENERATOR_MODEL } from "@/lib/generator-ai-config"
import { extractJsonFromModelText } from "@/lib/question-bulk-json"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function callGeneratorModel(
  prompt: string,
  maxOutputTokens: number,
  repairHint?: string
): Promise<string> {
  const input = repairHint ? `${prompt}\n\n${repairHint}` : prompt

  const resp = await client.responses.create({
    model: GENERATOR_MODEL,
    input,
    max_output_tokens: maxOutputTokens,
  })

  const text = resp.output_text ?? ""
  if (!text.trim()) {
    throw new Error("Leere Modell-Antwort.")
  }
  return text
}

export async function callGeneratorModelWithRetry(
  prompt: string,
  maxOutputTokens: number
): Promise<string> {
  try {
    return await callGeneratorModel(prompt, maxOutputTokens)
  } catch (firstError) {
    try {
      return await callGeneratorModel(
        prompt,
        maxOutputTokens,
        "Die vorherige Antwort war ungültig oder leer. Antworte ausschließlich mit gültigem JSON ohne Markdown und ohne zusätzlichen Text."
      )
    } catch {
      throw firstError
    }
  }
}

export function parseModelJson(rawText: string): unknown {
  const jsonText = extractJsonFromModelText(rawText)
  return JSON.parse(jsonText)
}
