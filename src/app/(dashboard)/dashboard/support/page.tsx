"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Loader2,
  Headphones,
  Smile,
  Search,
  MoreHorizontal,
  Zap,
  Shield,
  CreditCard,
  HelpCircle,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AttachmentBubble, PendingAttachmentChip, type ChatAttachment } from "@/components/chat/attachments";
import { AttachButton, VoiceRecorder, uploadChatFile } from "@/components/chat/composer-tools";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Thread {
  id: string;
  subject: string;
  status: "OPEN" | "RESOLVED";
  lastMessageAt: string;
  createdAt: string;
  _count: { messages: number };
}

interface Message {
  id: string;
  senderId: string;
  senderRole: "USER" | "ADMIN";
  message: string;
  attachments?: ChatAttachment[] | null;
  read: boolean;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const POLL_INTERVAL_MS = 5_000;

const AGENT = {
  name: "Sarah",
  role: "Support Lead",
  avatar: null as string | null, // Uses initials when null
  status: "online" as "online" | "away" | "offline",
};

// Simulate online hours: 8am–10pm
function getAgentStatus(): "online" | "away" | "offline" {
  const h = new Date().getHours();
  if (h >= 8 && h < 22) return "online";
  if (h >= 22 || h < 1) return "away";
  return "offline";
}

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald-400",
  away: "bg-amber-400",
  offline: "bg-zinc-500",
};

const STATUS_LABEL: Record<string, string> = {
  online: "Online",
  away: "Away — will respond soon",
  offline: "Offline — leave a message",
};

const QUICK_TOPICS = [
  { label: "Deposit Issue", icon: CreditCard, subject: "Help with deposit" },
  { label: "Account Security", icon: Shield, subject: "Account security concern" },
  { label: "Copy Trading", icon: Zap, subject: "Copy trading question" },
  { label: "General Question", icon: HelpCircle, subject: "General inquiry" },
];

const QUICK_REPLIES = [
  "What's my account status?",
  "How do I upgrade my tier?",
  "I need help with a deposit",
  "How do I withdraw funds?",
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatMessageTime(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateStr));
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function SupportPage() {
  /* ---- shared state ---- */
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState<"online" | "away" | "offline">(getAgentStatus);

  // Update agent status every minute
  useEffect(() => {
    const interval = setInterval(() => setAgentStatus(getAgentStatus()), 60_000);
    return () => clearInterval(interval);
  }, []);

  /* ---- thread list ---- */
  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/support");
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

  /* ---- active thread / chat ---- */
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchMessages = useCallback(
    async (threadId: string) => {
      try {
        const res = await fetch(`/api/support?threadId=${threadId}`);
        if (res.ok) {
          const data = await res.json();
          const incoming = data.messages ?? [];
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
    [scrollToBottom],
  );

  /* open a thread */
  const openThread = useCallback(
    async (threadId: string) => {
      setActiveThreadId(threadId);
      setMessages([]);
      setMessagesLoading(true);
      setShowQuickReplies(false);
      await fetchMessages(threadId);
      setMessagesLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [fetchMessages],
  );

  /* poll messages every 5 s while chat is open */
  useEffect(() => {
    if (!activeThreadId) return;
    const interval = setInterval(() => {
      fetchMessages(activeThreadId);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeThreadId, fetchMessages]);

  /* attachments staged for next send */
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFilesPicked = async (files: File[]) => {
    setUploadError(null);
    setUploadingCount((c) => c + files.length);
    const uploaded: ChatAttachment[] = [];
    for (const file of files) {
      try {
        const result = await uploadChatFile(file);
        uploaded.push(result);
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploadingCount((c) => Math.max(0, c - 1));
      }
    }
    if (uploaded.length > 0) setPendingAttachments((prev) => [...prev, ...uploaded]);
  };

  const handleVoiceRecorded = async (file: File) => {
    setUploadError(null);
    setUploadingCount((c) => c + 1);
    try {
      const result = await uploadChatFile(file);
      setPendingAttachments((prev) => [...prev, result]);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Voice upload failed");
    } finally {
      setUploadingCount((c) => Math.max(0, c - 1));
    }
  };

  /* send message */
  const handleSend = async (text?: string) => {
    const msg = (text ?? messageInput).trim();
    const attachments = pendingAttachments;
    if ((!msg && attachments.length === 0) || !activeThreadId || sending) return;

    setSending(true);
    setMessageInput("");
    setPendingAttachments([]);
    setShowQuickReplies(false);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendMessage",
          threadId: activeThreadId,
          message: msg,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });

      if (res.ok) {
        await fetchMessages(activeThreadId);
        // Simulate agent typing with realistic delay
        setShowTyping(true);
        const delay = 2000 + Math.random() * 4000; // 2-6s
        typingTimeoutRef.current = setTimeout(() => {
          setShowTyping(false);
          typingTimeoutRef.current = null;
        }, delay);
        requestAnimationFrame(() => scrollToBottom());
      } else {
        // Restore attachments on failure
        setPendingAttachments(attachments);
      }
    } catch {
      setPendingAttachments(attachments);
    } finally {
      setSending(false);
    }
  };

  /* back to list */
  const handleBack = () => {
    setActiveThreadId(null);
    setMessages([]);
    setMessageInput("");
    setShowTyping(false);
    setShowQuickReplies(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    fetchThreads();
  };

  /* ---- new thread ---- */
  const [quickCreateSubject, setQuickCreateSubject] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateThread = async (subject: string, message: string) => {
    if (!subject.trim() || !message.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createThread",
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuickCreateSubject(null);
        setNewMessage("");
        await fetchThreads();
        // Auto-open the new thread
        if (data.thread?.id) {
          openThread(data.thread.id);
        }
      }
    } catch {
      /* silent */
    } finally {
      setCreating(false);
    }
  };

  const filteredThreads = threads.filter((t) =>
    searchQuery ? t.subject.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const openThreads = filteredThreads.filter((t) => t.status === "OPEN");
  const resolvedThreads = filteredThreads.filter((t) => t.status === "RESOLVED");

  /* ---- render ---- */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Headphones className="w-6 h-6 text-brand" />
            </div>
            <Loader2 className="w-4 h-4 animate-spin text-brand absolute -bottom-1 -right-1" />
          </div>
          <p className="text-sm text-text-tertiary">Loading support...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)]">
      <AnimatePresence mode="wait">
        {quickCreateSubject ? (
          /* ------------------------------------------------------------------ */
          /*  Quick-create: user picked a topic, now type initial message        */
          /* ------------------------------------------------------------------ */
          <motion.div
            key="quick-create"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full"
          >
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setQuickCreateSubject(null)}
                className="p-2 rounded-xl hover:bg-surface-3 transition-colors text-text-tertiary hover:text-text-primary"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{quickCreateSubject}</h2>
                <p className="text-xs text-text-tertiary mt-0.5">Describe your issue and we&apos;ll get back to you</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
              {/* Agent card */}
              <div className="flex items-center gap-3 mb-6">
                <AgentAvatar status={agentStatus} size="lg" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">{AGENT.name}</p>
                  <p className="text-xs text-text-tertiary">{AGENT.role}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[agentStatus])} />
                    <span className="text-[10px] text-text-tertiary">{STATUS_LABEL[agentStatus]}</span>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-3">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Tell us more about your issue..."
                  rows={5}
                  className="input-field w-full resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setQuickCreateSubject(null)}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCreateThread(quickCreateSubject, newMessage)}
                    disabled={!newMessage.trim() || creating}
                    className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Start Conversation
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-text-tertiary mt-4">
                {agentStatus === "online" ? "Typical response time: under 5 minutes" : "We'll respond as soon as we're back online"}
              </p>
            </div>
          </motion.div>

        ) : activeThreadId ? (
          /* ------------------------------------------------------------------ */
          /*  Chat view                                                        */
          /* ------------------------------------------------------------------ */
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col h-full"
          >
            {/* ── Chat header ── */}
            <div className="flex items-center gap-3 pb-4 border-b border-border shrink-0">
              <button
                onClick={handleBack}
                className="p-2 rounded-xl hover:bg-surface-3 transition-colors text-text-tertiary hover:text-text-primary"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <AgentAvatar status={agentStatus} size="md" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-text-primary truncate">
                    {activeThread?.subject ?? "Conversation"}
                  </h2>
                  {activeThread && (
                    <span className={cn(
                      "shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                      activeThread.status === "OPEN" ? "text-amber-400 bg-amber-400/10" : "text-emerald-400 bg-emerald-400/10"
                    )}>
                      {activeThread.status === "OPEN" ? <Clock className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
                      {activeThread.status === "OPEN" ? "Open" : "Resolved"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[agentStatus])} />
                  <span className="text-[10px] text-text-tertiary">
                    {AGENT.name} · {STATUS_LABEL[agentStatus]}
                  </span>
                </div>
              </div>

              <button className="p-2 rounded-xl hover:bg-surface-3 transition-colors text-text-tertiary">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* ── Messages ── */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto py-4 space-y-1 scrollbar-thin"
            >
              {messagesLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
                    <p className="text-xs text-text-tertiary">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-surface-3 flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6 text-text-tertiary/50" />
                  </div>
                  <p className="text-sm text-text-tertiary">No messages yet</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isUser = msg.senderRole === "USER";
                  const showDayDivider = idx === 0 || !isSameDay(messages[idx - 1].createdAt, msg.createdAt);
                  const showAvatar =
                    !isUser &&
                    (idx === messages.length - 1 || messages[idx + 1]?.senderRole !== "ADMIN");
                  const isConsecutive =
                    idx > 0 &&
                    messages[idx - 1].senderRole === msg.senderRole &&
                    isSameDay(messages[idx - 1].createdAt, msg.createdAt);

                  return (
                    <div key={msg.id}>
                      {/* Day divider */}
                      {showDayDivider && (
                        <div className="flex items-center gap-3 py-3 px-2">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
                            {dayLabel(msg.createdAt)}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      )}

                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.02, 0.3), duration: 0.2 }}
                        className={cn(
                          "flex gap-2 px-2",
                          isUser ? "justify-end" : "justify-start",
                          isConsecutive ? "mt-0.5" : "mt-3"
                        )}
                      >
                        {/* Agent avatar */}
                        {!isUser && (
                          <div className="w-7 shrink-0 flex items-end">
                            {showAvatar && <AgentAvatar status={agentStatus} size="sm" />}
                          </div>
                        )}

                        <div className={cn("max-w-[75%] md:max-w-[60%] group relative")}>
                          {/* Sender label */}
                          {!isConsecutive && (
                            <p className={cn(
                              "text-[10px] font-medium mb-1 px-1",
                              isUser ? "text-right text-brand/60" : "text-text-tertiary"
                            )}>
                              {isUser ? "You" : AGENT.name}
                            </p>
                          )}

                          <div
                            className={cn(
                              "relative text-sm leading-relaxed rounded-2xl",
                              isUser
                                ? "bg-brand text-white rounded-br-md"
                                : "bg-surface-2 text-text-primary border border-border rounded-bl-md",
                              msg.message ? "px-4 py-2.5" : "p-1.5"
                            )}
                          >
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className={cn("flex flex-col gap-1.5", msg.message && "mb-2")}>
                                {msg.attachments.map((att, i) => (
                                  <AttachmentBubble key={i} attachment={att} isOwn={isUser} />
                                ))}
                              </div>
                            )}
                            {msg.message && (
                              <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                            )}
                          </div>

                          {/* Timestamp on hover */}
                          <div className={cn(
                            "opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 px-1",
                            isUser ? "text-right" : "text-left"
                          )}>
                            <span className="text-[9px] text-text-tertiary">
                              {formatMessageTime(msg.createdAt)}
                              {isUser && msg.read && " · Read"}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              <AnimatePresence>
                {showTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-end gap-2 px-2 mt-3"
                  >
                    <div className="w-7 shrink-0 flex items-end">
                      <AgentAvatar status={agentStatus} size="sm" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-text-tertiary mb-1 px-1">{AGENT.name}</p>
                      <div className="bg-surface-2 border border-border rounded-2xl rounded-bl-md px-4 py-3 inline-flex items-center gap-1.5">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary/50 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1.2s" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary/50 animate-bounce" style={{ animationDelay: "200ms", animationDuration: "1.2s" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary/50 animate-bounce" style={{ animationDelay: "400ms", animationDuration: "1.2s" }} />
                        </span>
                        <span className="text-xs text-text-tertiary ml-1">{AGENT.name} is typing...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* ── Quick replies ── */}
            <AnimatePresence>
              {showQuickReplies && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5 px-1 pb-2">
                    {QUICK_REPLIES.map((reply) => (
                      <button
                        key={reply}
                        onClick={() => handleSend(reply)}
                        className="text-xs px-3 py-1.5 rounded-full bg-surface-2 border border-border text-text-secondary hover:text-text-primary hover:bg-surface-3 hover:border-brand/30 transition-all"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Input bar ── */}
            <div className="pt-3 border-t border-border shrink-0">
              {/* Pending attachments + upload errors */}
              {(pendingAttachments.length > 0 || uploadingCount > 0 || uploadError) && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2 px-1">
                  {pendingAttachments.map((att, i) => (
                    <PendingAttachmentChip
                      key={i}
                      attachment={att}
                      onRemove={() =>
                        setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    />
                  ))}
                  {uploadingCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-text-tertiary px-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading {uploadingCount}…
                    </span>
                  )}
                  {uploadError && (
                    <span className="text-[11px] text-danger">{uploadError}</span>
                  )}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative"
              >
                <div className="flex items-end gap-2 glass-panel p-2 rounded-2xl">
                  {/* Action buttons */}
                  <div className="flex items-center gap-0.5 shrink-0 pb-0.5">
                    <button
                      type="button"
                      onClick={() => setShowQuickReplies((v) => !v)}
                      className={cn(
                        "p-2 rounded-xl transition-colors",
                        showQuickReplies
                          ? "bg-brand/10 text-brand"
                          : "text-text-tertiary hover:text-text-primary hover:bg-surface-3"
                      )}
                      title="Quick replies"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                    <AttachButton onPicked={handleFilesPicked} disabled={sending} />
                    <VoiceRecorder onRecorded={handleVoiceRecorded} disabled={sending} />
                    <button
                      type="button"
                      className="p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors"
                      title="Emoji"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Text input */}
                  <textarea
                    ref={inputRef}
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      // Auto-resize
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={agentStatus === "online" ? "Message support..." : "Leave a message..."}
                    rows={1}
                    className="flex-1 bg-transparent border-0 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-0 resize-none min-h-[36px] max-h-[120px] py-2 px-1"
                  />

                  {/* Send button */}
                  <button
                    type="submit"
                    disabled={(!messageInput.trim() && pendingAttachments.length === 0) || sending || uploadingCount > 0}
                    className={cn(
                      "p-2.5 rounded-xl shrink-0 transition-all duration-200",
                      (messageInput.trim() || pendingAttachments.length > 0)
                        ? "bg-brand text-white hover:bg-brand-dark active:scale-95 shadow-sm shadow-brand/20"
                        : "bg-surface-3 text-text-tertiary cursor-not-allowed"
                    )}
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <p className="text-[9px] text-text-tertiary text-center mt-1.5">
                  Press Enter to send · Shift+Enter for new line
                </p>
              </form>
            </div>
          </motion.div>

        ) : (
          /* ------------------------------------------------------------------ */
          /*  Thread list / Home                                                */
          /* ------------------------------------------------------------------ */
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full"
          >
            {/* ── Header ── */}
            <div className="shrink-0 pb-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center">
                      <Headphones className="w-5 h-5 text-brand" />
                    </div>
                    <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-1", STATUS_DOT[agentStatus])} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-text-primary">Support</h1>
                    <p className="text-xs text-text-tertiary">
                      {agentStatus === "online"
                        ? "We typically reply in a few minutes"
                        : agentStatus === "away"
                        ? "We'll respond shortly"
                        : "Leave us a message — we'll get back to you"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 scrollbar-thin">
              {/* ── Quick topic cards ── */}
              <div>
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2.5 px-1">Start a conversation</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUICK_TOPICS.map((topic) => {
                    const Icon = topic.icon;
                    return (
                      <button
                        key={topic.label}
                        onClick={() => setQuickCreateSubject(topic.subject)}
                        className="group glass-panel p-4 text-left hover:bg-surface-2 transition-all hover:border-brand/20 hover:shadow-sm"
                      >
                        <div className="p-2 rounded-xl bg-brand/8 w-fit mb-2.5 group-hover:bg-brand/15 transition-colors">
                          <Icon className="w-4 h-4 text-brand" />
                        </div>
                        <p className="text-xs font-semibold text-text-primary">{topic.label}</p>
                        <div className="flex items-center gap-0.5 mt-1.5 text-[10px] text-text-tertiary group-hover:text-brand transition-colors">
                          <span>Chat now</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Search ── */}
              {threads.length > 3 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="input-field w-full pl-10 text-sm h-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* ── Open threads ── */}
              {openThreads.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2 px-1 flex items-center gap-2">
                    Active
                    <span className="w-5 h-5 rounded-full bg-amber-400/10 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                      {openThreads.length}
                    </span>
                  </p>
                  <div className="space-y-1">
                    {openThreads.map((thread, idx) => (
                      <ThreadCard
                        key={thread.id}
                        thread={thread}
                        agentStatus={agentStatus}
                        onClick={() => openThread(thread.id)}
                        delay={idx * 0.03}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Resolved threads ── */}
              {resolvedThreads.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2 px-1">
                    Resolved
                  </p>
                  <div className="space-y-1">
                    {resolvedThreads.map((thread, idx) => (
                      <ThreadCard
                        key={thread.id}
                        thread={thread}
                        agentStatus={agentStatus}
                        onClick={() => openThread(thread.id)}
                        delay={idx * 0.03}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Empty state ── */}
              {threads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 rounded-3xl bg-surface-3 flex items-center justify-center">
                      <MessageSquare className="w-8 h-8 text-text-tertiary/40" />
                    </div>
                    <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-surface-1 flex items-center justify-center", STATUS_DOT[agentStatus])}>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary mb-1">
                    No conversations yet
                  </h3>
                  <p className="text-xs text-text-tertiary max-w-xs mb-4">
                    Pick a topic above or start a custom conversation. Our team is{" "}
                    {agentStatus === "online" ? "online and ready to help" : "available and will respond soon"}.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function AgentAvatar({ status, size = "md" }: { status: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-12 h-12 text-sm",
  };

  const dotSizes = {
    sm: "w-2 h-2 border",
    md: "w-2.5 h-2.5 border-[1.5px]",
    lg: "w-3 h-3 border-2",
  };

  return (
    <div className="relative shrink-0">
      <div className={cn(
        "rounded-full bg-gradient-to-br from-brand to-indigo-500 flex items-center justify-center text-white font-bold",
        sizeClasses[size]
      )}>
        S
      </div>
      <div className={cn(
        "absolute -bottom-0.5 -right-0.5 rounded-full border-surface-1",
        STATUS_DOT[status],
        dotSizes[size]
      )} />
    </div>
  );
}

function ThreadCard({
  thread,
  agentStatus,
  onClick,
  delay,
}: {
  thread: Thread;
  agentStatus: string;
  onClick: () => void;
  delay: number;
}) {
  const isOpen = thread.status === "OPEN";

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="w-full text-left p-3.5 rounded-xl hover:bg-surface-2 transition-all group flex items-center gap-3 border border-transparent hover:border-border"
    >
      <AgentAvatar status={isOpen ? agentStatus : "offline"} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary truncate group-hover:text-brand transition-colors">
            {thread.subject}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-text-tertiary">
            {timeAgo(thread.lastMessageAt)}
          </span>
          <span className="text-text-tertiary">·</span>
          <span className="text-[10px] text-text-tertiary">
            {thread._count.messages} {thread._count.messages === 1 ? "message" : "messages"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isOpen && (
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
        )}
        <ChevronRight className="w-4 h-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.button>
  );
}
