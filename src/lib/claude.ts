import Anthropic from "@anthropic-ai/sdk";

const globalForClaude = globalThis as unknown as { claude: Anthropic };

export const claude =
  globalForClaude.claude ??
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (process.env.NODE_ENV !== "production") globalForClaude.claude = claude;

const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-4-5";
const FAST_MODEL = "claude-haiku-4-5-20251001";

export async function streamToResponse(
  messages: Anthropic.MessageParam[],
  system: string,
  fast = false
): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const claudeStream = claude.messages.stream({
          model: fast ? FAST_MODEL : MODEL,
          max_tokens: 4096,
          system,
          messages,
        });

        for await (const chunk of claudeStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
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
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function generateJSON<T>(
  messages: Anthropic.MessageParam[],
  system: string,
  fast = false
): Promise<T> {
  const response = await claude.messages.create({
    model: fast ? FAST_MODEL : MODEL,
    max_tokens: 2048,
    system,
    messages,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  // Match JSON code fences, then bare objects, then bare arrays
  const match =
    text.match(/```json\n?([\s\S]*?)\n?```/) ??
    text.match(/```\n?([\s\S]*?)\n?```/) ??
    text.match(/(\{[\s\S]*\})/) ??
    text.match(/(\[[\s\S]*\])/);
  if (!match) throw new Error("No JSON in AI response");
  return JSON.parse(match[1]) as T;
}

export const SYSTEM_PROMPTS = {
  assistant: `You are ZYNOTRIX AI, an intelligent assistant for a project management platform.
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
