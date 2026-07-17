// Module-level singleton for DM SSE subscribers
export const dmSubscribers = new Map<string, Set<ReadableStreamDefaultController<string>>>();
