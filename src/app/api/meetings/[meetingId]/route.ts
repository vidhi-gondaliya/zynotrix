import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { meetingId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meeting = await prisma.meeting.findUnique({
    where: { id: params.meetingId },
    include: {
      organizer: { select: { id: true, name: true, email: true, image: true } },
      project: { select: { id: true, name: true, color: true } },
      attendees: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });

  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(meeting);
}

export async function PUT(req: NextRequest, { params }: { params: { meetingId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const meeting = await prisma.meeting.update({
    where: { id: params.meetingId },
    data: {
      title: body.title,
      description: body.description,
      status: body.status,
      notes: body.notes,
      actionItems: body.actionItems ? JSON.stringify(body.actionItems) : undefined,
    },
    include: {
      organizer: { select: { id: true, name: true, email: true, image: true } },
      attendees: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });

  return NextResponse.json(meeting);
}

export async function DELETE(_req: NextRequest, { params }: { params: { meetingId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.meeting.update({
    where: { id: params.meetingId },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ success: true });
}
