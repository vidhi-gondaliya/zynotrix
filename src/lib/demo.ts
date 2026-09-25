// Organizations listed here bypass all plan limits, feature gates, and AI
// credit consumption — used for the public demo workspace so it never
// shows upgrade prompts or runs out of AI credits.
const DEMO_ORG_IDS = (process.env.DEMO_ORG_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export function isDemoOrg(orgId: string | null | undefined): boolean {
  return !!orgId && DEMO_ORG_IDS.includes(orgId);
}
