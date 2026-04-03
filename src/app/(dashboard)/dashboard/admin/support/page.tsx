"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Search,
  Send,
  CheckCircle2,
  ChevronRight,
  User,
  ArrowLeft,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

/* ──────────────────────────── Types ──────────────────────────── */

interface ThreadUser {
  name: string;
  email: string;
}

interface Thread {
  id: string;
  userId: string;
  subject: string;
  status: "OPEN" | "RESOLVED";
  lastMessageAt: string;
  createdAt: string;
  user: ThreadUser;
  _count: { messages: number };
}

interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: "USER" | "ADMIN";
  message: string;
  read: boolean;
  createdAt: string;
}

type StatusFilter = "ALL" | "OPEN" | "RESOLVED";

const POLL_INTERVAL = 5000;

/* ──────────────────────────── Helpers ──────────────────────────── */

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

/* ──────────────────────────── Component ──────────────────────────── */

export default function AdminSupportPage() {
  /* ── State ── */
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  /* ── Fetch threads ── */
  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/support?all=true");
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  /* ── Fetch messages for selected thread ── */
  const fetchMessages = useCallback(async (threadId: string) => {
    try {
      const res = await fetch(`/api/support?threadId=${threadId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
        if (data.thread) {
          setSelectedThread(data.thread);
        }
      }
    } catch {
      /* silent */
    }
  }, []);

  const openThread = useCallback(
    async (thread: Thread) => {
      setSelectedThreadId(thread.id);
      setSelectedThread(thread);
      setMessagesLoading(true);
      setReplyText("");
      await fetchMessages(thread.id);
      setMessagesLoading(false);
    },
    [fetchMessages]
  );

  /* ── Poll for new messages ── */
  useEffect(() => {
    if (!selectedThreadId) return;

    const interval = setInterval(() => {
      fetchMessages(selectedThreadId);
      fetchThreads();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [selectedThreadId, fetchMessages, fetchThreads]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send reply ── */
  const handleSend = async () => {
    if (!replyText.trim() || !selectedThreadId || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendMessage",
          threadId: selectedThreadId,
          message: replyText.trim(),
        }),
      });
      if (res.ok) {
        setReplyText("");
        await fetchMessages(selectedThreadId);
        await fetchThreads();
      }
    } catch {
      /* silent */
    } finally {
      setSending(false);
    }
  };

  /* ── Resolve / Reopen ── */
  const handleThreadAction = async (action: "resolveThread" | "reopenThread") => {
    if (!selectedThreadId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, threadId: selectedThreadId }),
      });
      if (res.ok) {
        await fetchMessages(selectedThreadId);
        await fetchThreads();
      }
    } catch {
      /* silent */
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Filtering ── */
  const filtered = threads.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        t.user.name.toLowerCase().includes(q) ||
        t.user.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openCount = threads.filter((t) => t.status === "OPEN").length;
  const resolvedCount = threads.filter((t) => t.status === "RESOLVED").length;

  /* ── Key handler for send on Enter ── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ──────────────────────────── Render ──────────────────────────── */

  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-section">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-lg font-semibold text-text-primary">Support Inbox</h2>
        <p className="text-sm text-text-tertiary mt-0.5">
          {openCount > 0 ? `${openCount} open conversation${openCount !== 1 ? "s" : ""}` : "No open conversations"}
        </p>
      </motion.div>

      {/* ═══ 2-Panel Layout ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-panel overflow-hidden"
        style={{ height: "calc(100vh - 220px)", minHeight: "520px" }}
      >
        <div className="flex h-full">
          {/* ─── Left Panel: Thread List ─── */}
          <div
            className={`${
              selectedThreadId ? "hidden lg:flex" : "flex"
            } flex-col w-full lg:w-[380px] lg:min-w-[380px] border-r border-border`}
          >
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search threads..."
                  className="input-field w-full pl-10 text-sm"
                />
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex border-b border-border">
              {(
                [
                  { key: "ALL", label: "All", count: threads.length },
                  { key: "OPEN", label: "Open", count: openCount },
                  { key: "RESOLVED", label: "Resolved", count: resolvedCount },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${
                    statusFilter === tab.key
                      ? "text-brand"
                      : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`ml-1.5 px-1.5 py-0.5 rounded-full text-2xs ${
                        statusFilter === tab.key
                          ? "bg-brand/15 text-brand"
                          : "bg-surface-2 text-text-tertiary"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {statusFilter === tab.key && (
                    <motion.div
                      layoutId="support-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <MessageSquare className="w-8 h-8 text-text-tertiary/40 mb-3" />
                  <p className="text-sm text-text-tertiary">No threads found</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filtered.map((thread, i) => (
                    <motion.button
                      key={thread.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => openThread(thread)}
                      className={`w-full text-left px-4 py-3.5 border-b border-border transition-colors group ${
                        selectedThreadId === thread.id
                          ? "bg-brand/5 border-l-2 border-l-brand"
                          : "hover:bg-surface-1/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Status dot */}
                          <div
                            className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
                              thread.status === "OPEN" ? "bg-success" : "bg-text-tertiary/40"
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {thread.user.name}
                            </p>
                            <p className="text-xs text-text-secondary truncate mt-0.5">
                              {thread.subject}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-2xs text-text-tertiary whitespace-nowrap">
                            {relativeTime(thread.lastMessageAt)}
                          </span>
                          {thread._count.messages > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-brand text-white text-2xs font-semibold min-w-[18px] text-center">
                              {thread._count.messages}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1.5 pl-[18px]">
                        <span className="text-2xs text-text-tertiary">{thread.user.email}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-text-tertiary/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* ─── Right Panel: Chat View ─── */}
          <div
            className={`${
              selectedThreadId ? "flex" : "hidden lg:flex"
            } flex-col flex-1 min-w-0`}
          >
            {!selectedThreadId ? (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <div className="p-4 rounded-2xl bg-surface-1 mb-4">
                  <MessageSquare className="w-10 h-10 text-text-tertiary/30" />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-1">
                  Select a conversation
                </h3>
                <p className="text-sm text-text-tertiary max-w-xs">
                  Choose a thread from the left panel to view and respond to support messages.
                </p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1/30">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Back button (mobile) */}
                    <button
                      onClick={() => {
                        setSelectedThreadId(null);
                        setSelectedThread(null);
                        setMessages([]);
                      }}
                      className="lg:hidden p-1.5 rounded-lg hover:bg-surface-2 transition-colors text-text-secondary"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="p-2 rounded-lg bg-brand/10 shrink-0">
                      <User className="w-4 h-4 text-brand" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {selectedThread?.subject}
                      </p>
                      <p className="text-2xs text-text-tertiary truncate">
                        {selectedThread?.user.name} &middot; {selectedThread?.user.email}
                      </p>
                    </div>
                  </div>

                  {/* Resolve / Reopen */}
                  {selectedThread && (
                    <button
                      onClick={() =>
                        handleThreadAction(
                          selectedThread.status === "OPEN" ? "resolveThread" : "reopenThread"
                        )
                      }
                      disabled={actionLoading}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                        selectedThread.status === "OPEN"
                          ? "bg-success/10 text-success hover:bg-success/20"
                          : "bg-warning/10 text-warning hover:bg-warning/20"
                      }`}
                    >
                      {actionLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : selectedThread.status === "OPEN" ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      {selectedThread.status === "OPEN" ? "Mark Resolved" : "Reopen"}
                    </button>
                  )}
                </div>

                {/* Messages Area */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                >
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-5 h-5 animate-spin text-brand" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">
                      No messages yet
                    </div>
                  ) : (
                    <>
                      {/* Thread started timestamp */}
                      <div className="flex justify-center">
                        <span className="text-2xs text-text-tertiary bg-surface-1 px-3 py-1 rounded-full">
                          Conversation started {formatDate(selectedThread?.createdAt ?? messages[0].createdAt)}
                        </span>
                      </div>

                      {messages.map((msg, i) => {
                        const isAdmin = msg.senderRole === "ADMIN";
                        const showTimestamp =
                          i === 0 ||
                          new Date(msg.createdAt).getTime() -
                            new Date(messages[i - 1].createdAt).getTime() >
                            300000;

                        return (
                          <div key={msg.id}>
                            {showTimestamp && (
                              <div className="flex justify-center my-2">
                                <span className="text-2xs text-text-tertiary">
                                  {formatDate(msg.createdAt)}
                                </span>
                              </div>
                            )}
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.015 }}
                              className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                  isAdmin
                                    ? "bg-brand text-white rounded-br-md"
                                    : "bg-surface-2 text-text-primary rounded-bl-md"
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                                <p
                                  className={`text-2xs mt-1 ${
                                    isAdmin ? "text-white/50" : "text-text-tertiary"
                                  }`}
                                >
                                  {isAdmin ? "You" : selectedThread?.user.name} &middot;{" "}
                                  {new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </motion.div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t border-border p-3 bg-surface-1/20">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
                      rows={1}
                      className="input-field flex-1 resize-none text-sm min-h-[40px] max-h-[120px]"
                      style={{
                        height: "auto",
                        overflow: "hidden",
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                      }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!replyText.trim() || sending}
                      className="btn-primary p-2.5 rounded-xl disabled:opacity-40 shrink-0"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
