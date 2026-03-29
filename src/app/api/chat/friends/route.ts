import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get user's friends and pending requests
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Get accepted friends (both sent and received)
    const sentFriends = await db.friendship.findMany({
      where: { senderId: userId, status: "accepted" },
      include: { receiver: { select: { id: true, username: true, avatar: true, status: true } } },
    });

    const receivedFriends = await db.friendship.findMany({
      where: { receiverId: userId, status: "accepted" },
      include: { sender: { select: { id: true, username: true, avatar: true, status: true } } },
    });

    const friends = [
      ...sentFriends.map((f) => ({ ...f.receiver, friendshipId: f.id })),
      ...receivedFriends.map((f) => ({ ...f.sender, friendshipId: f.id })),
    ];

    // Get pending requests received
    const pendingRequests = await db.friendship.findMany({
      where: { receiverId: userId, status: "pending" },
      include: { sender: { select: { id: true, username: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Get pending requests sent
    const sentRequests = await db.friendship.findMany({
      where: { senderId: userId, status: "pending" },
      include: { receiver: { select: { id: true, username: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      friends,
      pendingRequests: pendingRequests.map((r) => ({
        id: r.id,
        user: r.sender,
        createdAt: r.createdAt,
      })),
      sentRequests: sentRequests.map((r) => ({
        id: r.id,
        user: r.receiver,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get friends error:", error);
    return NextResponse.json({ error: "Failed to get friends" }, { status: 500 });
  }
}

// POST - Send friend request
export async function POST(request: Request) {
  try {
    const { senderId, receiverUsername } = await request.json();

    if (!senderId || !receiverUsername) {
      return NextResponse.json({ error: "Sender ID and receiver username required" }, { status: 400 });
    }

    // Find receiver by username
    const receiver = await db.user.findUnique({
      where: { username: receiverUsername },
    });

    if (!receiver) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (receiver.id === senderId) {
      return NextResponse.json({ error: "Cannot add yourself as friend" }, { status: 400 });
    }

    // Check if friendship already exists
    const existing = await db.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: senderId },
        ],
      },
    });

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json({ error: "Already friends" }, { status: 400 });
      }
      if (existing.status === "pending") {
        return NextResponse.json({ error: "Friend request already pending" }, { status: 400 });
      }
      return NextResponse.json({ error: "Friend request blocked" }, { status: 400 });
    }

    // Create friend request
    const friendship = await db.friendship.create({
      data: { senderId, receiverId: receiver.id },
      include: { receiver: { select: { id: true, username: true, avatar: true } } },
    });

    return NextResponse.json({
      message: "Friend request sent",
      friendship,
    });
  } catch (error) {
    console.error("Send friend request error:", error);
    return NextResponse.json({ error: "Failed to send friend request" }, { status: 500 });
  }
}

// PUT - Accept/Reject friend request
export async function PUT(request: Request) {
  try {
    const { friendshipId, action } = await request.json(); // action: "accept" or "reject"

    if (!friendshipId || !action) {
      return NextResponse.json({ error: "Friendship ID and action required" }, { status: 400 });
    }

    const status = action === "accept" ? "accepted" : "rejected";

    const friendship = await db.friendship.update({
      where: { id: friendshipId },
      data: { status },
    });

    return NextResponse.json({
      message: action === "accept" ? "Friend request accepted" : "Friend request rejected",
      friendship,
    });
  } catch (error) {
    console.error("Update friend request error:", error);
    return NextResponse.json({ error: "Failed to update friend request" }, { status: 500 });
  }
}

// DELETE - Remove friend
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const friendshipId = searchParams.get("friendshipId");

    if (!friendshipId) {
      return NextResponse.json({ error: "Friendship ID required" }, { status: 400 });
    }

    await db.friendship.delete({
      where: { id: friendshipId },
    });

    return NextResponse.json({ message: "Friend removed" });
  } catch (error) {
    console.error("Remove friend error:", error);
    return NextResponse.json({ error: "Failed to remove friend" }, { status: 500 });
  }
}
