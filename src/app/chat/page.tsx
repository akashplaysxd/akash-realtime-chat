"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Users, MessageCircle, Plus, Hash, ArrowRight, X, UserPlus,
  LogIn, User, Lock, Mail, Copy, Share2, Link2, Check, MessageSquare
} from "lucide-react";
import { toast, Toaster } from "sonner";

// Types
interface UserType {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  bio?: string;
  status: string;
  createdAt: string;
}

interface Message {
  id: string;
  content: string;
  senderId?: string;
  sender?: { id: string; username: string; avatar?: string };
  username?: string;
  roomId?: string;
  createdAt: string;
}

interface Room {
  id: string;
  name: string;
  slug: string;
  inviteCode: string;
  isPublic: boolean;
  _count?: { members: number };
}

interface Friend {
  id: string;
  username: string;
  avatar?: string;
  status: string;
  friendshipId: string;
}

interface Conversation {
  user: { id: string; username: string; avatar?: string; status: string };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function ChatAppPage() {
  // Auth state
  const [user, setUser] = useState<UserType | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // View state
  const [view, setView] = useState<"rooms" | "dms" | "friends">("rooms");
  const [loading, setLoading] = useState(false);

  // Rooms
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  // Friends
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ id: string; user: { id: string; username: string } }[]>([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");

  // DMs
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentDM, setCurrentDM] = useState<{ id: string; username: string } | null>(null);
  const [dmMessages, setDmMessages] = useState<Message[]>([]);
  const [dmMessage, setDmMessage] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, dmMessages]);

  // Auth functions
  const handleAuth = async () => {
    if (!email || !password || (authMode === "register" && !username)) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const endpoint = authMode === "login" ? "/api/chat/auth/login" : "/api/chat/auth/register";
      const body = authMode === "login"
        ? { email, password }
        : { email, username, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Authentication failed");
        return;
      }

      setUser(data.user);
      localStorage.setItem("chatUser", JSON.stringify(data.user));
      toast.success(authMode === "login" ? "Welcome back!" : "Account created!");

      fetchRooms();
      fetchFriends();
      fetchConversations();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Check for saved session
  useEffect(() => {
    const saved = localStorage.getItem("chatUser");
    if (saved) {
      const savedUser = JSON.parse(saved);
      setUser(savedUser);
      fetchRooms();
      fetchFriends();
      fetchConversations();
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("chatUser");
    setUser(null);
    toast.success("Logged out");
  };

  // Room functions
  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/chat/rooms");
      const data = await res.json();
      setRooms(data);
    } catch {
      // Ignore
    }
  };

  const fetchMessages = async (roomId: string) => {
    try {
      const res = await fetch(`/api/chat/messages?roomId=${roomId}`);
      const data = await res.json();
      setMessages(data);
    } catch {
      setMessages([]);
    }
  };

  const createRoom = async () => {
    if (!newRoomName.trim() || !user) {
      toast.error("Please enter a room name");
      return;
    }

    try {
      const res = await fetch("/api/chat/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", userId: user.id, roomName: newRoomName }),
      });

      const room = await res.json();
      setRooms([...rooms, room]);
      setCurrentRoom(room);
      setShowNewRoom(false);
      setNewRoomName("");
      toast.success("Room created!");
    } catch {
      toast.error("Failed to create room");
    }
  };

  const joinRoomByCode = async () => {
    if (!joinCode.trim() || !user) {
      toast.error("Please enter an invite code");
      return;
    }

    try {
      const res = await fetch(`/api/chat/invite?code=${joinCode}`);
      const room = await res.json();

      if (!res.ok) {
        toast.error(room.error || "Invalid invite code");
        return;
      }

      const joinRes = await fetch("/api/chat/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", userId: user.id, roomId: room.id }),
      });

      const result = await joinRes.json();
      setRooms([...rooms, result.room]);
      setCurrentRoom(result.room);
      setJoinCode("");
      setShowInvite(false);
      toast.success("Joined room!");
    } catch {
      toast.error("Failed to join room");
    }
  };

  const copyInviteLink = () => {
    if (!currentRoom) return;
    const link = `${window.location.origin}/chat?join=${currentRoom.inviteCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied!");
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentRoom || !user) return;

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content: message,
      senderId: user.id,
      sender: { id: user.id, username: user.username },
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: message,
          senderId: user.id,
          roomId: currentRoom.id,
        }),
      });
    } catch {
      // Message still shows locally
    }

    setMessage("");
  };

  // Friends functions
  const fetchFriends = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/chat/friends?userId=${user.id}`);
      const data = await res.json();
      setFriends(data.friends);
      setPendingRequests(data.pendingRequests);
    } catch {
      // Ignore
    }
  };

  const sendFriendRequest = async () => {
    if (!friendUsername.trim() || !user) {
      toast.error("Please enter a username");
      return;
    }

    try {
      const res = await fetch("/api/chat/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: user.id, receiverUsername: friendUsername }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      toast.success("Friend request sent!");
      setFriendUsername("");
      setShowAddFriend(false);
    } catch {
      toast.error("Failed to send request");
    }
  };

  const acceptFriend = async (friendshipId: string) => {
    try {
      await fetch("/api/chat/friends", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action: "accept" }),
      });
      fetchFriends();
      toast.success("Friend request accepted!");
    } catch {
      toast.error("Failed to accept request");
    }
  };

  const rejectFriend = async (friendshipId: string) => {
    try {
      await fetch("/api/chat/friends", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action: "reject" }),
      });
      fetchFriends();
      toast.success("Friend request rejected");
    } catch {
      toast.error("Failed to reject request");
    }
  };

  // DM functions
  const fetchConversations = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/chat/dm?userId=${user.id}`);
      const data = await res.json();
      setConversations(data);
    } catch {
      // Ignore
    }
  };

  const fetchDMMessages = async (friendId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/chat/dm?userId=${user.id}&friendId=${friendId}`);
      const data = await res.json();
      setDmMessages(data);
    } catch {
      setDmMessages([]);
    }
  };

  const sendDM = async () => {
    if (!dmMessage.trim() || !currentDM || !user) return;

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content: dmMessage,
      senderId: user.id,
      createdAt: new Date().toISOString(),
    };

    setDmMessages((prev) => [...prev, tempMessage]);

    try {
      await fetch("/api/chat/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: currentDM.id,
          content: dmMessage,
        }),
      });
    } catch {
      // Message still shows locally
    }

    setDmMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (currentRoom) sendMessage();
      else if (currentDM) sendDM();
    }
  };

  // Auth Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Toaster position="bottom-right" />

        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
        </div>

        <main className="relative z-10 max-w-md mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-6">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                AkashChat
              </span>
            </h1>
            <p className="text-gray-400">Connect with friends in real-time</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6"
          >
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setAuthMode("login")}
                className={`flex-1 py-2 rounded-lg transition-colors ${authMode === "login" ? "bg-purple-500/20 text-purple-400" : "hover:bg-[var(--background)]"}`}
              >
                <LogIn className="w-4 h-4 inline mr-2" />Login
              </button>
              <button
                onClick={() => setAuthMode("register")}
                className={`flex-1 py-2 rounded-lg transition-colors ${authMode === "register" ? "bg-purple-500/20 text-purple-400" : "hover:bg-[var(--background)]"}`}
              >
                <UserPlus className="w-4 h-4 inline mr-2" />Register
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              {authMode === "register" && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                    <User className="w-4 h-4" /> Username
                  </label>
                  <input
                    type="text"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              <button
                onClick={handleAuth}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Please wait..." : authMode === "login" ? "Login" : "Create Account"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // Main Chat Interface
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Toaster position="bottom-right" />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 h-screen flex">
        {/* Sidebar */}
        <aside className="w-64 bg-[var(--card)] border-r border-[var(--border)] flex flex-col">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-lg">AkashChat</h2>
            <p className="text-xs text-gray-400">{user.username}</p>
          </div>

          <div className="flex border-b border-[var(--border)]">
            <button
              onClick={() => { setView("rooms"); setCurrentRoom(null); setCurrentDM(null); }}
              className={`flex-1 py-3 text-sm ${view === "rooms" ? "text-purple-400 border-b-2 border-purple-400" : "text-gray-400"}`}
            >
              Rooms
            </button>
            <button
              onClick={() => { setView("dms"); setCurrentRoom(null); setCurrentDM(null); }}
              className={`flex-1 py-3 text-sm ${view === "dms" ? "text-purple-400 border-b-2 border-purple-400" : "text-gray-400"}`}
            >
              DMs
            </button>
            <button
              onClick={() => { setView("friends"); setCurrentRoom(null); setCurrentDM(null); }}
              className={`flex-1 py-3 text-sm ${view === "friends" ? "text-purple-400 border-b-2 border-purple-400" : "text-gray-400"}`}
            >
              Friends
              {pendingRequests.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-500 rounded-full">{pendingRequests.length}</span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {view === "rooms" && (
              <>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setShowNewRoom(true)}
                    className="flex-1 py-2 rounded-lg border border-dashed border-[var(--border)] hover:border-purple-500 transition-colors flex items-center justify-center gap-1 text-sm"
                  >
                    <Plus className="w-4 h-4" /> New
                  </button>
                  <button
                    onClick={() => setShowInvite(true)}
                    className="py-2 px-3 rounded-lg border border-dashed border-[var(--border)] hover:border-purple-500 transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                  </button>
                </div>
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => { setCurrentRoom(room); fetchMessages(room.id); }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${currentRoom?.id === room.id ? "bg-purple-500/20 text-purple-400" : "hover:bg-[var(--background)]"}`}
                  >
                    <Hash className="w-4 h-4" />
                    {room.name}
                  </button>
                ))}
              </>
            )}

            {view === "dms" && (
              <>
                {conversations.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No conversations yet</p>
                )}
                {conversations.map((conv) => (
                  <button
                    key={conv.user.id}
                    onClick={() => { setCurrentDM(conv.user); fetchDMMessages(conv.user.id); }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${currentDM?.id === conv.user.id ? "bg-purple-500/20 text-purple-400" : "hover:bg-[var(--background)]"}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-medium">
                      {conv.user.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{conv.user.username}</p>
                      <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-purple-500 rounded-full">{conv.unreadCount}</span>
                    )}
                  </button>
                ))}
              </>
            )}

            {view === "friends" && (
              <>
                <button
                  onClick={() => setShowAddFriend(true)}
                  className="w-full py-2 rounded-lg border border-dashed border-[var(--border)] hover:border-purple-500 transition-colors flex items-center justify-center gap-1 text-sm mb-2"
                >
                  <UserPlus className="w-4 h-4" /> Add Friend
                </button>

                {pendingRequests.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 px-2 py-1">PENDING</p>
                    {pendingRequests.map((req) => (
                      <div key={req.id} className="px-3 py-2 rounded-lg bg-[var(--background)] mb-1 flex items-center justify-between">
                        <span className="text-sm">{req.user.username}</span>
                        <div className="flex gap-1">
                          <button onClick={() => acceptFriend(req.id)} className="p-1 rounded hover:bg-purple-500/20">
                            <Check className="w-4 h-4 text-green-500" />
                          </button>
                          <button onClick={() => rejectFriend(req.id)} className="p-1 rounded hover:bg-red-500/20">
                            <X className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-500 px-2 py-1">FRIENDS ({friends.length})</p>
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => { setCurrentDM({ id: friend.id, username: friend.username }); fetchDMMessages(friend.id); setView("dms"); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--background)] flex items-center gap-2"
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-medium">
                        {friend.username[0].toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--card)] ${friend.status === "online" ? "bg-green-500" : "bg-gray-500"}`} />
                    </div>
                    <span>{friend.username}</span>
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="p-4 border-t border-[var(--border)]">
            <button
              onClick={logout}
              className="w-full py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[var(--background)] transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {currentRoom || currentDM ? (
            <>
              <header className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 bg-[var(--card)]">
                <div className="flex items-center gap-2">
                  {currentRoom ? (
                    <>
                      <Hash className="w-5 h-5 text-gray-400" />
                      <span className="font-semibold">{currentRoom.name}</span>
                    </>
                  ) : currentDM ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-medium">
                        {currentDM.username[0].toUpperCase()}
                      </div>
                      <span className="font-semibold">{currentDM.username}</span>
                    </>
                  ) : null}
                </div>
                {currentRoom && (
                  <button
                    onClick={copyInviteLink}
                    className="text-sm px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors flex items-center gap-1"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                )}
              </header>

              <div className="flex-1 overflow-y-auto p-4">
                {(currentRoom ? messages : dmMessages).length === 0 && (
                  <div className="text-center text-gray-400 py-20">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
                <AnimatePresence>
                  {(currentRoom ? messages : dmMessages).map((msg, index) => (
                    <motion.div
                      key={msg.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mb-4 ${msg.senderId === user.id || msg.username === user.username ? "text-right" : "text-left"}`}
                    >
                      <div
                        className={`inline-block max-w-[80%] p-3 rounded-2xl ${msg.senderId === user.id || msg.username === user.username ? "bg-purple-500 text-white rounded-br-none" : "bg-[var(--card)] rounded-bl-none"}`}
                      >
                        {currentRoom && msg.senderId !== user.id && msg.sender && (
                          <p className="text-xs font-semibold text-purple-400 mb-1">{msg.sender.username}</p>
                        )}
                        <p>{msg.content}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-[var(--border)] bg-[var(--card)]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={currentRoom ? `Message #${currentRoom.name}` : `Message ${currentDM?.username}`}
                    value={currentRoom ? message : dmMessage}
                    onChange={(e) => currentRoom ? setMessage(e.target.value) : setDmMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                  <button
                    onClick={currentRoom ? sendMessage : sendDM}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a room or start a DM</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showNewRoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewRoom(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-4">Create New Room</h3>
              <input type="text" placeholder="Room name" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:border-purple-500 focus:outline-none mb-4" />
              <div className="flex gap-2">
                <button onClick={() => setShowNewRoom(false)} className="flex-1 py-3 rounded-xl border border-[var(--border)] hover:bg-[var(--background)]">Cancel</button>
                <button onClick={createRoom} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">Create</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showInvite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowInvite(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-4">Join Room by Invite Code</h3>
              <input type="text" placeholder="Enter invite code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:border-purple-500 focus:outline-none mb-4" />
              <div className="flex gap-2">
                <button onClick={() => setShowInvite(false)} className="flex-1 py-3 rounded-xl border border-[var(--border)] hover:bg-[var(--background)]">Cancel</button>
                <button onClick={joinRoomByCode} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">Join</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showAddFriend && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddFriend(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-4">Add Friend</h3>
              <input type="text" placeholder="Enter username" value={friendUsername} onChange={(e) => setFriendUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:border-purple-500 focus:outline-none mb-4" />
              <div className="flex gap-2">
                <button onClick={() => setShowAddFriend(false)} className="flex-1 py-3 rounded-xl border border-[var(--border)] hover:bg-[var(--background)]">Cancel</button>
                <button onClick={sendFriendRequest} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">Send Request</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
