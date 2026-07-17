import { auth } from "@/lib/auth";
import { channelSubscribers, createSSEStream } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { channelId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  return createSSEStream(channelSubscribers, params.channelId);
}
