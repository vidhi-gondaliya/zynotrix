import { auth } from "./auth";
import { NextResponse } from "next/server";

export type OrgContext = {
  session: NonNullable<Awaited<ReturnType<typeof auth>>>;
  orgId: string;
  userId: string;
  orgRole: string;
};

/**
 * Call at the top of every API route.
 * Returns OrgContext or a ready-made NextResponse error.
 */
export async function requireOrg(): Promise<OrgContext | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = session.user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "No workspace. Please create or join a workspace." }, { status: 403 });
  }
  return {
    session,
    orgId,
    userId: session.user.id,
    orgRole: session.user.orgRole ?? "MEMBER",
  };
}

export function isOrgError(val: OrgContext | NextResponse): val is NextResponse {
  return val instanceof NextResponse;
}
