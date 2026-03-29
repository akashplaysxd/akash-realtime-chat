import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get all public rooms
export async function GET() {
  try {
    const rooms = await db.chatRoom.findMany({
      where: { isPublic: true },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Get rooms error:", error);
    return NextResponse.json({ error: "Failed to get rooms" }, { status: 500 });
  }
}
