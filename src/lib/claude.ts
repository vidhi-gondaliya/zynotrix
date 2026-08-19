import OpenAI from "openai";
import { consumeCredits, CREDIT_COSTS, type CreditTier } from "./credits";

// NVIDIA NIM — OpenAI-compatible endpoint
// nvidia/nemotron-3-super-120b-a12b — confirmed available for this account's API key

const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";

const globalForNvidia = globalThis as unknown as { nvidiaClient: OpenAI };

export const claude =           // kept as "claude" so all imports stay unchanged
  globalForNvidia.nvidiaClient ??
  new OpenAI({
    apiKey:  process.env.NVIDIA_API_KEY ?? "",
    baseURL: NVIDIA_BASE,
  });

if (process.env.NODE_ENV !== "production") globalForNvidia.nvidiaClient = claude;

// Best accuracy model for complex reasoning / streaming
const MODEL      = process.env.NVIDIA_MODEL ?? "nvidia/nemotron-3-super-120b-a12b";
// Fast model for structured JSON tasks
const FAST_MODEL = process.env.NVIDIA_FAST_MODEL ?? "nvidia/nemotron-3-super-120b-a12b";

/**
 * Attempt to consume AI credits before an AI call.
 * Returns a 402 Response if the org has no credits; null if ok.
 */
export async function checkAndConsumeCredits(
  orgId: string | null | undefined,
  tier:  CreditTier
): Promise<Response | null> {
  if (!orgId) return null;
  const cost = CREDIT_COSTS[tier];
  const ok   = await consumeCredits(orgId, cost);
  if (!ok) {
    return new Response(
      JSON.stringify({ error: "Insufficient AI credits. Purchase a TopUp or upgrade your plan.", code: "CREDITS_EXHAUSTED" }),
      { status: 402, headers: { "Content-Type": "application/json" } }
    );
  }
  return null;
}

/**
 * Stream a chat completion back as a plain-text streaming Response.
 */
export async function streamToResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  system:   string,
  fast      = false
): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const nvidiaStream = await claude.chat.completions.create({
          model:  fast ? FAST_MODEL : MODEL,
          max_tokens: 4096,
          stream: true,
          messages: [
            { role: "system", content: system },
            ...messages,
          ],
        });

        for await (const chunk of nvidiaStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI error";
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":    "text/plain; charset=utf-8",
      "Cache-Control":   "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Non-streaming call that parses and returns JSON from the response.
 */
export async function generateJSON<T>(
  messages: { role: "user" | "assistant"; content: string }[],
  system:   string,
  fast      = false
): Promise<T> {
  const response = await claude.chat.completions.create({
    model:      fast ? FAST_MODEL : MODEL,
    max_tokens: 2048,
    messages:   [
      { role: "system", content: system },
      ...messages,
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  const match =
    text.match(/```json\n?([\s\S]*?)\n?```/) ??
    text.match(/```\n?([\s\S]*?)\n?```/)     ??
    text.match(/(\{[\s\S]*\})/)              ??
    text.match(/(\[[\s\S]*\])/);
  if (!match) throw new Error("No JSON in AI response");
  return JSON.parse(match[1]) as T;
}

export const SYSTEM_PROMPTS = {
  assistant: `You are Colliq, an intelligent AI assistant for a project management platform built by Zynotrix.
You have access to project context provided in the user's message.
Be concise, helpful, and actionable. Format responses with markdown when appropriate.
When asked about projects, tasks, or meetings — analyze the data and provide insightful answers.`,

  healthScore: `You are a project health analyzer. Given project metrics, return a JSON object with this exact shape:
{
  "score": <number 0-100>,
  "grade": <"A"|"B"|"C"|"D"|"F">,
  "summary": <one sentence summary>,
  "breakdown": {
    "onTimeRate": <0-100>,
    "budgetStatus": <"on_track"|"at_risk"|"over_budget">,
    "teamVelocity": <0-100>,
    "blockerCount": <number>,
    "completionRate": <0-100>
  },
  "risks": [<string>, ...],
  "recommendations": [<string>, ...]
}
Return ONLY valid JSON, no markdown fences.`,

  report: `You are a professional project report writer. Generate clear, well-structured reports based on the provided data.
Use markdown formatting. Be professional yet concise. Include key metrics, highlights, and actionable insights.
For client reports: focus on outcomes and business value, avoid technical jargon.
For team reports: include velocity, blockers, and what needs attention.`,

  search: `You are a semantic search assistant. Given a query and a list of content excerpts, find the most relevant ones and provide a concise synthesized answer.
Format: Start with a direct answer to the query (2-3 sentences), then if helpful, reference specific excerpts.
Be helpful and precise.`,
};
