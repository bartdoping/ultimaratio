import OpenAI from "openai"
import { GENERATOR_MODEL } from "@/lib/generator-ai-config"
import { extractJsonFromModelText } from "@/lib/question-bulk-json"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type GeneratorCallParams = {
  instructions: string
  input: string
  maxOutputTokens: number
  signal?: AbortSignal
}

async function createResponse(
  params: GeneratorCallParams,
  repairHint?: string
): Promise<string> {
  const input = repairHint ? `${params.input}\n\n${repairHint}` : params.input

  const resp = await client.responses.create(
    {
      model: GENERATOR_MODEL,
      instructions: params.instructions,
      input,
      max_output_tokens: params.maxOutputTokens,
      text: { format: { type: "json_object" } },
    },
    params.signal ? { signal: params.signal } : undefined
  )

  const text = resp.output_text ?? ""
  if (!text.trim()) {
    throw new Error("Leere Modell-Antwort.")
  }
  return text
}

export async function callGeneratorModel(
  params: GeneratorCallParams,
  repairHint?: string
): Promise<string> {
  return createResponse(params, repairHint)
}

export async function callGeneratorModelWithRetry(
  params: GeneratorCallParams
): Promise<string> {
  try {
    return await createResponse(params)
  } catch (firstError) {
    // Aborts/Timeouts nicht erneut versuchen.
    if (params.signal?.aborted) throw firstError
    try {
      return await createResponse(
        params,
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
