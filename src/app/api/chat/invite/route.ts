import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Generate random invite code
function generateInviteCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET - Get room by invite code
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Invite code required" }, { status: 400 });
    }

    const room = await db.chatRoom.findUnique({
      where: { inviteCode: code },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
        _count: { select: { members: true } },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("Get invite error:", error);
    return NextResponse.json({ error: "Failed to get invite" }, { status: 500 });
  }
}

// POST - Create room with invite code or join via invite
export async function POST(request: Request) {
  try {
    const { action, userId, roomId, roomName, isPublic } = await request.json();

    // Join room via invite
    if (action === "join") {
      if (!userId) {
        return NextResponse.json({ error: "User ID required" }, { status: 400 });
      }

      const room = await db.chatRoom.findUnique({
        where: { id: roomId },
        include: { members: true },
      });

      if (!room) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }

      // Check if already a member
      const existingMember = await db.roomMember.findUnique({
        where: { userId_roomId: { userId, roomId } },
      });

      if (existingMember) {
        return NextResponse.json({ message: "Already a member", room });
      }

      // Add as member
      await db.roomMember.create({
        data: { userId, roomId },
      });

      return NextResponse.json({ message: "Joined room successfully", room });
    }

    // Create new room with invite code
    if (action === "create") {
      if (!roomName || !userId) {
        return NextResponse.json({ error: "Room name and user ID required" }, { status: 400 });
      }

      const slug = roomName.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
      const inviteCode = generateInviteCode();

      const room = await db.chatRoom.create({
        data: {
          name: roomName,
          slug,
          inviteCode,
          isPublic: isPublic ?? true,
          createdBy: userId,
          members: {
            create: { userId, role: "admin" },
          },
        },
      });

      return NextResponse.json(room);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Invite action error:", error);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}

// PUT - Regenerate invite code
export async function PUT(request: Request) {
  try {
    const { roomId, userId } = await request.json();

    if (!roomId || !userId) {
      return NextResponse.json({ error: "Room ID and user ID required" }, { status: 400 });
    }

    // Check if user is admin
    const membership = await db.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });

    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "Only admins can regenerate invite codes" }, { status: 403 });
    }

    const newCode = generateInviteCode();

    const room = await db.chatRoom.update({
      where: { id: roomId },
      data: { inviteCode: newCode },
    });

    return NextResponse.json({ message: "Invite code regenerated", room });
  } catch (error) {
    console.error("Regenerate invite error:", error);
    return NextResponse.json({ error: "Failed to regenerate invite code" }, { status: 500 });
  }
}
