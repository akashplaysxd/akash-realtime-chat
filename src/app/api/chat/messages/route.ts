import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get messages for a room
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json({ error: "Room ID required" }, { status: 400 });
    }

    const messages = await db.chatMessage.findMany({
      where: { roomId },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json({ error: "Failed to get messages" }, { status: 500 });
  }
}

// POST - Send a message to a room
export async function POST(request: Request) {
  try {
    const { content, senderId, roomId } = await request.json();

    if (!content || !senderId || !roomId) {
      return NextResponse.json({ error: "Content, sender ID and room ID required" }, { status: 400 });
    }

    // Check if user is a member of the room
    const membership = await db.roomMember.findUnique({
      where: { userId_roomId: { userId: senderId, roomId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this room" }, { status: 403 });
    }

    const message = await db.chatMessage.create({
      data: { content, senderId, roomId },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
      },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
