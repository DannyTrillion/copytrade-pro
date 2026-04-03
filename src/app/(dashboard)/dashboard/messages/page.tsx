"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Search,
  Loader2,
  Users,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface UserInfo {
  id: string;
  name: string;
  avatar: string | null;
}

interface Conversation {
  user: UserInfo;
  lastMessage: {
    id: string;
    message: string;
    senderId: string;
    createdAt: string;
  };
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  read: boolean;
  createdAt: string;
  sender: UserInfo;
  receiver: UserInfo;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const POLL_INTERVAL_MS = 5_000;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return formatDate(dateStr);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

function MessagesPageInner() {
  const searchParams = useSearchParams();
  const deepLinkUserId = searchParams.get("userId");
  const deepLinkName = searchParams.get("name");
  const deepLinkHandledRef = useRef(false);

  /* ── State ── */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  /* ── Fetch conversations ── */
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const json = await res.json();
        setConversations(json.conversations ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  /* ── Poll conversations list every 5s when no thread is open ── */
  useEffect(() => {
    if (activeConversation) return;
    const interval = setInterval(fetchConversations, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeConversation, fetchConversations]);

  /* ── Scroll to bottom ── */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /* ── Fetch messages for a conversation ── */
  const fetchMessages = useCallback(
    async (userId: string) => {
      try {
        const res = await fetch(`/api/messages?userId=${userId}`);
        if (res.ok) {
          const json = await res.json();
          const incoming = json.messages ?? [];
          // If new messages arrived (e.g. from polling), clear the typing indicator
          setMessages((prev) => {
            if (incoming.length > prev.length) {
              setShowTyping(false);
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
              }
            }
            return incoming;
          });
          requestAnimationFrame(() => scrollToBottom());
        }
      } catch {
        /* silent */
      }
    },
    [scrollToBottom]
  );

  /* ── Open conversation ── */
  const openConversation = useCallback(
    async (conv: Conversation) => {
      setActiveConversation(conv);
      setMessages([]);
      setMessagesLoading(true);

      // Mark as read
      if (conv.unreadCount > 0) {
        fetch("/api/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationUserId: conv.user.id }),
        }).catch(() => {});
      }

      await fetchMessages(conv.user.id);
      setMessagesLoading(false);
    },
    [fetchMessages]
  );

  /* ── Deep-link: auto-open conversation from ?userId=xxx&name=xxx ── */
  useEffect(() => {
    if (!deepLinkUserId || deepLinkHandledRef.current || loading) return;
    deepLinkHandledRef.current = true;

    const existing = conversations.find((c) => c.user.id === deepLinkUserId);
    if (existing) {
      openConversation(existing);
    } else {
      // Create a synthetic conversation entry so user can start messaging
      const syntheticConv: Conversation = {
        user: {
          id: deepLinkUserId,
          name: deepLinkName || "User",
          avatar: null,
        },
        lastMessage: {
          id: "",
          message: "",
          senderId: "",
          createdAt: new Date().toISOString(),
        },
        unreadCount: 0,
      };
      openConversation(syntheticConv);
    }
  }, [deepLinkUserId, deepLinkName, loading, conversations, openConversation]);

  /* ── Poll messages every 5s while thread is open ── */
  useEffect(() => {
    if (!activeConversation) return;
    const interval = setInterval(() => {
      fetchMessages(activeConversation.user.id);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeConversation, fetchMessages]);

  /* ── Send message ── */
  const handleSend = async () => {
    const text = messageInput.trim();
    if (!text || !activeConversation || sending) return;

    setSending(true);
    setMessageInput("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: activeConversation.user.id,
          message: text,
        }),
      });

      if (res.ok) {
        await fetchMessages(activeConversation.user.id);
        setShowTyping(true);
        typingTimeoutRef.current = setTimeout(() => {
          setShowTyping(false);
          typingTimeoutRef.current = null;
        }, 3000);
        requestAnimationFrame(() => scrollToBottom());
      }
    } catch {
      /* silent */
    } finally {
      setSending(false);
    }
  };

  /* ── Back to list ── */
  const handleBack = () => {
    setActiveConversation(null);
    setMessages([]);
    setMessageInput("");
    setShowTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    fetchConversations();
  };

  /* ── Filtered conversations ── */
  const filteredConversations = conversations.filter((conv) =>
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div className="h-[calc(100vh-7rem)]">
      {/* ── Desktop: two-panel layout ── */}
      <div className="hidden md:grid md:grid-cols-[340px_1fr] h-full gap-0 glass-panel overflow-hidden">
        {/* Left: Conversation list */}
        <div className="border-r border-border flex flex-col h-full">
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
            <h1 className="text-lg font-bold text-text-primary mb-3">
              Messages
            </h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full pl-9 text-sm"
              />
            </div>
          </div>

          {/* Conversation items */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-surface-3 flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-text-tertiary" />
                </div>
                <p className="text-sm text-text-tertiary">
                  {searchQuery
                    ? "No conversations match your search"
                    : "No conversations yet. Start copy-trading to connect with traders."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredConversations.map((conv) => {
                  const isActive =
                    activeConversation?.user.id === conv.user.id;

                  return (
                    <button
                      key={conv.user.id}
                      onClick={() => openConversation(conv)}
                      className={`w-full text-left p-4 flex items-center gap-3 transition-colors hover:bg-surface-2 ${
                        isActive ? "bg-surface-2" : ""
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center text-xs font-semibold text-text-secondary shrink-0 relative">
                        {conv.user.avatar ? (
                          <img
                            src={conv.user.avatar}
                            alt={conv.user.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          getInitials(conv.user.name)
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand border-2 border-surface-1" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-text-primary truncate">
                            {conv.user.name}
                          </span>
                          <span className="text-[11px] text-text-tertiary shrink-0">
                            {timeAgo(conv.lastMessage.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-xs text-text-tertiary truncate">
                            {conv.lastMessage.message}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white px-1">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Thread view */}
        <div className="flex flex-col h-full">
          {activeConversation ? (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border shrink-0">
                <div className="w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center text-xs font-semibold text-text-secondary shrink-0">
                  {activeConversation.user.avatar ? (
                    <img
                      src={activeConversation.user.avatar}
                      alt={activeConversation.user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(activeConversation.user.name)
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {activeConversation.user.name}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
              >
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-text-tertiary">
                      No messages yet. Start the conversation.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine =
                      msg.senderId !== activeConversation.user.id;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02, duration: 0.2 }}
                        className={`flex ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            isMine
                              ? "bg-brand text-white"
                              : "bg-surface-3 text-text-primary"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {msg.message}
                          </p>
                          <p
                            className={`text-[10px] mt-1.5 ${
                              isMine
                                ? "text-white/60"
                                : "text-text-tertiary"
                            }`}
                          >
                            {formatDate(msg.createdAt)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                {/* Typing indicator */}
                <AnimatePresence>
                  {showTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2 px-1 py-1"
                    >
                      <div className="bg-surface-3 text-text-primary rounded-2xl px-4 py-2.5 flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-text-tertiary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 rounded-full bg-text-tertiary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 rounded-full bg-text-tertiary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-xs text-text-tertiary">typing...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-border shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-end gap-2"
                >
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message..."
                    rows={1}
                    className="input-field flex-1 resize-none min-h-[44px] max-h-32"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim() || sending}
                    className="btn-primary h-[44px] w-[44px] flex items-center justify-center shrink-0 disabled:opacity-40"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Empty thread state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-text-tertiary" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1">
                Select a Conversation
              </h3>
              <p className="text-sm text-text-tertiary max-w-xs">
                Choose a conversation from the list to start messaging.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile: slide between list and thread ── */}
      <div className="md:hidden h-full">
        <AnimatePresence mode="wait">
          {activeConversation ? (
            /* ── Mobile thread view ── */
            <motion.div
              key="mobile-thread"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col h-full"
            >
              {/* Header */}
              <div className="flex items-center gap-3 py-3 shrink-0">
                <button
                  onClick={handleBack}
                  className="p-2 rounded-lg hover:bg-surface-3 transition-colors text-text-tertiary hover:text-text-primary"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-xs font-semibold text-text-secondary shrink-0">
                  {activeConversation.user.avatar ? (
                    <img
                      src={activeConversation.user.avatar}
                      alt={activeConversation.user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(activeConversation.user.name)
                  )}
                </div>
                <p className="text-sm font-semibold text-text-primary truncate">
                  {activeConversation.user.name}
                </p>
              </div>

              {/* Messages */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto rounded-xl glass-panel p-4 space-y-3"
              >
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-text-tertiary">
                      No messages yet. Start the conversation.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine =
                      msg.senderId !== activeConversation.user.id;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02, duration: 0.2 }}
                        className={`flex ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                            isMine
                              ? "bg-brand text-white"
                              : "bg-surface-3 text-text-primary"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {msg.message}
                          </p>
                          <p
                            className={`text-[10px] mt-1.5 ${
                              isMine
                                ? "text-white/60"
                                : "text-text-tertiary"
                            }`}
                          >
                            {formatDate(msg.createdAt)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                {/* Typing indicator */}
                <AnimatePresence>
                  {showTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2 px-1 py-1"
                    >
                      <div className="bg-surface-3 text-text-primary rounded-2xl px-4 py-2.5 flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-text-tertiary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 rounded-full bg-text-tertiary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 rounded-full bg-text-tertiary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-xs text-text-tertiary">typing...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="mt-3 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-end gap-2"
                >
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message..."
                    rows={1}
                    className="input-field flex-1 resize-none min-h-[44px] max-h-32"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim() || sending}
                    className="btn-primary h-[44px] w-[44px] flex items-center justify-center shrink-0 disabled:opacity-40"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            /* ── Mobile conversation list ── */
            <motion.div
              key="mobile-list"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col h-full"
            >
              {/* Header */}
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-text-primary">
                  Messages
                </h1>
                <p className="text-sm text-text-secondary mt-1">
                  Direct messages with your connections
                </p>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field w-full pl-9 text-sm"
                />
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="glass-panel flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
                      <MessageSquare className="w-7 h-7 text-text-tertiary" />
                    </div>
                    <h3 className="text-base font-semibold text-text-primary mb-1">
                      {searchQuery
                        ? "No results found"
                        : "No conversations yet"}
                    </h3>
                    <p className="text-sm text-text-tertiary max-w-xs">
                      {searchQuery
                        ? "Try a different search term"
                        : "Start copy-trading to connect with traders and begin messaging."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredConversations.map((conv, idx) => (
                      <motion.button
                        key={conv.user.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: idx * 0.04,
                          duration: 0.25,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        onClick={() => openConversation(conv)}
                        className="glass-panel w-full text-left p-4 flex items-center gap-3 hover:bg-surface-2 transition-colors"
                      >
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-full bg-surface-3 flex items-center justify-center text-xs font-semibold text-text-secondary shrink-0 relative">
                          {conv.user.avatar ? (
                            <img
                              src={conv.user.avatar}
                              alt={conv.user.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            getInitials(conv.user.name)
                          )}
                          {conv.unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-brand border-2 border-surface-1" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-text-primary truncate">
                              {conv.user.name}
                            </span>
                            <span className="text-[11px] text-text-tertiary shrink-0">
                              {timeAgo(conv.lastMessage.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-xs text-text-tertiary truncate">
                              {conv.lastMessage.message}
                            </p>
                            {conv.unreadCount > 0 && (
                              <span className="shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white px-1">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
        </div>
      }
    >
      <MessagesPageInner />
    </Suspense>
  );
}
