"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Plus,
  Send,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";

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
  read: boolean;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const POLL_INTERVAL_MS = 5_000;

const STATUS_CONFIG: Record<
  Thread["status"],
  { icon: typeof Clock; label: string; className: string }
> = {
  OPEN: {
    icon: Clock,
    label: "Open",
    className: "text-amber-400 bg-amber-400/10",
  },
  RESOLVED: {
    icon: CheckCircle2,
    label: "Resolved",
    className: "text-emerald-400 bg-emerald-400/10",
  },
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function SupportPage() {
  /* ---- shared state ---- */
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
          // defer scroll so DOM has painted
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
      await fetchMessages(threadId);
      setMessagesLoading(false);
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

  /* send message */
  const handleSend = async () => {
    const text = messageInput.trim();
    if (!text || !activeThreadId || sending) return;

    setSending(true);
    setMessageInput("");

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendMessage",
          threadId: activeThreadId,
          message: text,
        }),
      });

      if (res.ok) {
        await fetchMessages(activeThreadId);
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

  /* back to list */
  const handleBack = () => {
    setActiveThreadId(null);
    setMessages([]);
    setMessageInput("");
    setShowTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    fetchThreads();
  };

  /* ---- new thread modal ---- */
  const [modalOpen, setModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim() || creating) return;

    setCreating(true);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createThread",
          subject: newSubject.trim(),
          message: newMessage.trim(),
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        setNewSubject("");
        setNewMessage("");
        await fetchThreads();
      }
    } catch {
      /* silent */
    } finally {
      setCreating(false);
    }
  };

  /* ---- render ---- */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {activeThreadId ? (
          /* ---------------------------------------------------------------- */
          /*  Chat view                                                       */
          /* ---------------------------------------------------------------- */
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col h-[calc(100vh-7rem)]"
          >
            {/* header */}
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <button
                onClick={handleBack}
                className="p-2 rounded-lg hover:bg-surface-3 transition-colors text-text-tertiary hover:text-text-primary"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-text-primary truncate">
                  {activeThread?.subject ?? "Thread"}
                </h2>
                {activeThread && (
                  <div className="flex items-center gap-2 mt-0.5">
                    {(() => {
                      const cfg = STATUS_CONFIG[activeThread.status];
                      const Icon = cfg.icon;
                      return (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}
                        >
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      );
                    })()}
                    <span className="text-xs text-text-tertiary">
                      {formatDate(activeThread.createdAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto rounded-xl glass-panel p-4 space-y-3"
            >
              {messagesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-text-tertiary text-center py-12">
                  No messages yet.
                </p>
              ) : (
                messages.map((msg, idx) => {
                  const isUser = msg.senderRole === "USER";
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] md:max-w-[65%] rounded-2xl px-4 py-2.5 ${
                          isUser
                            ? "bg-brand/20 border border-brand/30 text-text-primary"
                            : "bg-surface-2 border border-border text-text-primary"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {msg.message}
                        </p>
                        <p
                          className={`text-[10px] mt-1.5 ${
                            isUser ? "text-brand/60" : "text-text-tertiary"
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
                    <div className="bg-surface-2 border border-border rounded-2xl px-4 py-2.5 flex items-center gap-2">
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

            {/* input */}
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
                  placeholder="Type your message..."
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
          /* ---------------------------------------------------------------- */
          /*  Thread list                                                     */
          /* ---------------------------------------------------------------- */
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Support
                </h1>
                <p className="text-sm text-text-secondary mt-1">
                  Get help from our team
                </p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Thread</span>
              </button>
            </div>

            {/* threads */}
            {threads.length === 0 ? (
              <div className="glass-panel flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
                  <MessageSquare className="w-7 h-7 text-text-tertiary" />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-1">
                  No support threads yet
                </h3>
                <p className="text-sm text-text-tertiary max-w-xs">
                  Start a new thread to get in touch with our support team.
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="btn-primary mt-5 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Thread
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {threads.map((thread, idx) => {
                  const cfg = STATUS_CONFIG[thread.status];
                  const Icon = cfg.icon;
                  const unread = thread._count.messages;

                  return (
                    <motion.button
                      key={thread.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: idx * 0.04,
                        duration: 0.25,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      onClick={() => openThread(thread.id)}
                      className="glass-panel w-full text-left p-4 flex items-center gap-4 hover:bg-surface-2 transition-colors group"
                    >
                      {/* icon */}
                      <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center shrink-0 group-hover:bg-surface-4 transition-colors">
                        <MessageSquare className="w-5 h-5 text-text-tertiary" />
                      </div>

                      {/* content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text-primary truncate">
                            {thread.subject}
                          </span>
                          {unread > 0 && (
                            <span className="shrink-0 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white px-1.5">
                              {unread}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${cfg.className}`}
                          >
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                          <span className="text-xs text-text-tertiary">
                            {formatDate(thread.lastMessageAt)}
                          </span>
                        </div>
                      </div>

                      {/* chevron hint */}
                      <ArrowLeft className="w-4 h-4 text-text-tertiary rotate-180 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------- */}
      {/*  New Thread Modal                                               */}
      {/* -------------------------------------------------------------- */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Support Thread"
      >
        <form onSubmit={handleCreateThread} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Subject
            </label>
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Brief description of your issue"
              className="input-field w-full"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Message
            </label>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows={4}
              className="input-field w-full resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newSubject.trim() || !newMessage.trim() || creating}
              className="btn-primary flex items-center gap-2 disabled:opacity-40"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
