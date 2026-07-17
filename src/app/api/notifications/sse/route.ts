import { auth } from "@/lib/auth";
import { notificationSubscribers, createSSEStream } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  return createSSEStream(notificationSubscribers, session.user.id);
}
