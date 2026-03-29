import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get direct messages between users
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const friendId = searchParams.get("friendId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // If friendId is provided, get conversation with that friend
    if (friendId) {
      const messages = await db.directMessage.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: friendId },
            { senderId: friendId, receiverId: userId },
          ],
        },
        include: {
          sender: { select: { id: true, username: true, avatar: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      });

      // Mark messages as read
      await db.directMessage.updateMany({
        where: {
          senderId: friendId,
          receiverId: userId,
          isRead: false,
        },
        data: { isRead: true },
      });

      return NextResponse.json(messages);
    }

    // Get all DM conversations (latest message from each)
    const sentMessages = await db.directMessage.findMany({
      where: { senderId: userId },
      include: {
        receiver: { select: { id: true, username: true, avatar: true, status: true } },
        sender: { select: { id: true, username: true, avatar: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const receivedMessages = await db.directMessage.findMany({
      where: { receiverId: userId },
      include: {
        sender: { select: { id: true, username: true, avatar: true, status: true } },
        receiver: { select: { id: true, username: true, avatar: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by user and get latest message
    const conversations = new Map();

    [...sentMessages, ...receivedMessages].forEach((msg) => {
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!conversations.has(otherUser.id)) {
        conversations.set(otherUser.id, {
          user: otherUser,
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
        });
      }
    });

    // Get unread counts
    const unreadCounts = await db.directMessage.groupBy({
      by: ["senderId"],
      where: { receiverId: userId, isRead: false },
      _count: true,
    });

    const unreadMap = new Map(unreadCounts.map((u) => [u.senderId, u._count]));

    const result = Array.from(conversations.values()).map((conv: { user: { id: string }; lastMessage: string; lastMessageTime: Date }) => ({
      ...conv,
      unreadCount: unreadMap.get(conv.user.id) || 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get DMs error:", error);
    return NextResponse.json({ error: "Failed to get messages" }, { status: 500 });
  }
}

// POST - Send direct message
export async function POST(request: Request) {
  try {
    const { senderId, receiverId, content } = await request.json();

    if (!senderId || !receiverId || !content) {
      return NextResponse.json({ error: "Sender, receiver and content required" }, { status: 400 });
    }

    // Check if they are friends
    const friendship = await db.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId, status: "accepted" },
          { senderId: receiverId, receiverId: senderId, status: "accepted" },
        ],
      },
    });

    if (!friendship) {
      return NextResponse.json({ error: "You can only message friends" }, { status: 403 });
    }

    const message = await db.directMessage.create({
      data: { senderId, receiverId, content },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
      },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Send DM error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
