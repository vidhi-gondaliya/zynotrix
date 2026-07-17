import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { dmSubscribers } from "@/lib/dm-sse";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { conversationId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { conversationId } = params;

  const stream = new ReadableStream<string>({
    start(controller) {
      if (!dmSubscribers.has(conversationId)) {
        dmSubscribers.set(conversationId, new Set());
      }
      dmSubscribers.get(conversationId)!.add(controller);

      // Heartbeat every 30s
      const interval = setInterval(() => {
        try { controller.enqueue(": ping\n\n"); }
        catch { clearInterval(interval); dmSubscribers.get(conversationId)?.delete(controller); }
      }, 30_000);
    },
    cancel() {
      // Cleanup handled in heartbeat
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
