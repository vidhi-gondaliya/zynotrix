// Module-level singletons for SSE — persists within one Node.js process

type Controller = ReadableStreamDefaultController<Uint8Array>;

export const channelSubscribers = new Map<string, Set<Controller>>();
export const notificationSubscribers = new Map<string, Set<Controller>>();

const encoder = new TextEncoder();

export function broadcastToChannel(channelId: string, data: unknown) {
  const subscribers = channelSubscribers.get(channelId);
  if (!subscribers?.size) return;
  const payload = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  subscribers.forEach((ctrl) => {
    try {
      ctrl.enqueue(payload);
    } catch {
      subscribers.delete(ctrl);
    }
  });
}

export function broadcastToUser(userId: string, data: unknown) {
  const subscribers = notificationSubscribers.get(userId);
  if (!subscribers?.size) return;
  const payload = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  subscribers.forEach((ctrl) => {
    try {
      ctrl.enqueue(payload);
    } catch {
      subscribers.delete(ctrl);
    }
  });
}

export function createSSEStream(
  subscribersMap: Map<string, Set<Controller>>,
  key: string
): Response {
  let controller: Controller;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
      if (!subscribersMap.has(key)) subscribersMap.set(key, new Set());
      subscribersMap.get(key)!.add(controller);
      // Send initial keep-alive
      ctrl.enqueue(encoder.encode(": connected\n\n"));
    },
    cancel() {
      subscribersMap.get(key)?.delete(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
