import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phoneNumber, accountSid, authToken, fromNumber } = await req.json();

  if (!phoneNumber || !accountSid || !authToken || !fromNumber) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const to   = phoneNumber.startsWith("whatsapp:") ? phoneNumber : `whatsapp:${phoneNumber}`;
  const from = fromNumber.startsWith("whatsapp:")  ? fromNumber  : `whatsapp:${fromNumber}`;

  const body = `👋 ZYNOTRIX WhatsApp integration is working! You'll receive task notifications here.`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: from, Body: body });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: (err as { message?: string }).message ?? "Twilio error" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
