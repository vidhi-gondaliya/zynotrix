import { auth } from "./auth";
import { NextResponse } from "next/server";

export type OrgContext = {
  orgId: string;
  userId: string;
  orgRole: string;
  userName: string | null;
  userAccessToken: string | undefined;
  // Expose raw session only as escape hatch — prefer named fields above
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
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
    userId:          session.user.id,
    orgRole:         session.user.orgRole ?? "MEMBER",
    userName:        session.user.name ?? null,
    userAccessToken: (session.user as any).accessToken as string | undefined,
  };
}

export function isOrgError(val: OrgContext | NextResponse): val is NextResponse {
  return val instanceof NextResponse;
}
