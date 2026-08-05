import { NextResponse } from "next/server";

/** GET /api/billing/config — tells the client whether Stripe is configured */
export async function GET() {
  return NextResponse.json({
    stripeEnabled: !!(process.env.STRIPE_SECRET_KEY),
  });
}
