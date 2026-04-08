"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toPng } from "html-to-image";
import {
  X, Download, Share2, TrendingUp, TrendingDown, BarChart3,
  Target, Calendar, Loader2, ImageIcon, Trophy, Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

const ease = [0.16, 1, 0.3, 1] as const;

interface PnlCardData {
  totalPnl: number;
  totalBalance: number;
  winRate: number;
  totalTrades: number;
  following: number;
  userName: string;
  pnlHistory: number[]; // last N pnl values for sparkline
}

type CardTheme = "dark" | "gold" | "minimal";
type CardType = "pnl" | "portfolio";

/* ─── Sparkline SVG ─── */
function Sparkline({ data, color, width = 200, height = 50 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height * 0.8 - height * 0.1;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spark-fill)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Card themes ─── */
const THEMES: Record<CardTheme, { bg: string; accent: string; text: string; sub: string; border: string }> = {
  dark: { bg: "linear-gradient(145deg, #0a0a14, #0d0d1a, #08081a)", accent: "#0D71FF", text: "#ffffff", sub: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.06)" },
  gold: { bg: "linear-gradient(145deg, #0a0908, #0d0c08, #0a0a06)", accent: "#D4AF37", text: "#ffffff", sub: "rgba(255,255,255,0.35)", border: "rgba(212,175,55,0.1)" },
  minimal: { bg: "linear-gradient(145deg, #111118, #0e0e16)", accent: "#6366F1", text: "#ffffff", sub: "rgba(255,255,255,0.35)", border: "rgba(255,255,255,0.04)" },
};

/* ─── The actual card rendered for export ─── */
function CardContent({ data, type, theme }: { data: PnlCardData; type: CardType; theme: CardTheme }) {
  const t = THEMES[theme];
  const isPositive = data.totalPnl >= 0;
  const profitColor = isPositive ? "#26A69A" : "#EF5350";
  const pnlPercent = data.totalBalance > 0 ? ((data.totalPnl / (data.totalBalance - data.totalPnl)) * 100).toFixed(1) : "0.0";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div
      style={{
        background: t.bg,
        width: 480,
        padding: 32,
        borderRadius: 20,
        border: `1px solid ${t.border}`,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background grid */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      {/* Accent glow */}
      <div style={{
        position: "absolute", top: -100, right: -60, width: 300, height: 300, borderRadius: "50%",
        background: `radial-gradient(circle, ${t.accent}15, transparent 60%)`,
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp style={{ width: 16, height: 16, color: "#fff" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>CopyTrade Pro</div>
            <div style={{ fontSize: 10, color: t.sub }}>{type === "pnl" ? "Performance Report" : "Portfolio Overview"}</div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: t.sub }}>{today}</div>
      </div>

      {/* Hero stat */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: t.sub, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>
          {type === "pnl" ? "Total P&L" : "Portfolio Value"}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontSize: 42, fontWeight: 700, color: type === "pnl" ? profitColor : t.text, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {type === "pnl" ? (isPositive ? "+" : "") + formatCurrency(data.totalPnl) : formatCurrency(data.totalBalance)}
          </span>
          <span style={{
            fontSize: 13, fontWeight: 600, color: profitColor,
            background: `${profitColor}15`, padding: "3px 8px", borderRadius: 8,
          }}>
            {isPositive ? "+" : ""}{pnlPercent}%
          </span>
        </div>
      </div>

      {/* Sparkline */}
      {data.pnlHistory.length > 1 && (
        <div style={{ marginBottom: 20, opacity: 0.8 }}>
          <Sparkline data={data.pnlHistory} color={type === "pnl" ? profitColor : t.accent} width={416} height={60} />
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {(type === "pnl" ? [
          { label: "Trades", value: String(data.totalTrades), icon: "📊" },
          { label: "Win Rate", value: `${data.winRate}%`, icon: "🎯" },
          { label: "Following", value: String(data.following), icon: "👥" },
        ] : [
          { label: "Balance", value: formatCurrency(data.totalBalance), icon: "💰" },
          { label: "Profit", value: formatCurrency(data.totalPnl), icon: isPositive ? "📈" : "📉" },
          { label: "Traders", value: String(data.following), icon: "👥" },
        ]).map((stat) => (
          <div key={stat.label} style={{
            background: "rgba(255,255,255,0.02)", border: `1px solid ${t.border}`,
            borderRadius: 12, padding: "10px 12px", textAlign: "center",
          }}>
            <div style={{ fontSize: 14, marginBottom: 4 }}>{stat.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text, fontVariantNumeric: "tabular-nums" }}>{stat.value}</div>
            <div style={{ fontSize: 9, color: t.sub, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 24, height: 24, borderRadius: 8, background: `linear-gradient(135deg, ${t.accent}, #6366F1)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{data.userName[0]?.toUpperCase()}</span>
          </div>
          <span style={{ fontSize: 11, color: t.sub, fontWeight: 500 }}>{data.userName}</span>
        </div>
        <span style={{ fontSize: 9, color: `${t.sub}80` }}>copytradepro.app</span>
      </div>
    </div>
  );
}

/* ─── Modal wrapper ─── */
interface PerformanceCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PnlCardData;
}

export function PerformanceCardModal({ isOpen, onClose, data }: PerformanceCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardType, setCardType] = useState<CardType>("pnl");
  const [cardTheme, setCardTheme] = useState<CardTheme>("dark");
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const link = document.createElement("a");
      link.download = `copytrade-${cardType}-${new Date().toISOString().split("T")[0]}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Card downloaded!");
    } catch {
      toast.error("Failed to generate image");
    } finally {
      setDownloading(false);
    }
  }, [cardType]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
      const blob = await (await fetch(dataUrl)).blob();
      if (navigator.share && navigator.canShare({ files: [new File([blob], "performance.png", { type: "image/png" })] })) {
        await navigator.share({
          title: "My Trading Performance",
          text: `Check out my trading performance on CopyTrade Pro! P&L: ${data.totalPnl >= 0 ? "+" : ""}${formatCurrency(data.totalPnl)}`,
          files: [new File([blob], "performance.png", { type: "image/png" })],
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("Card copied to clipboard!");
      }
    } catch {
      toast.error("Share failed");
    }
  }, [data.totalPnl]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-[560px] glass-panel rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-brand" />
                <h3 className="text-sm font-semibold text-text-primary">Performance Card</h3>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-3 transition-colors text-text-tertiary border-none bg-transparent">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Controls */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-border">
              {/* Card type toggle */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-2/60 border border-border/50">
                {([
                  { id: "pnl" as const, label: "P&L", icon: TrendingUp },
                  { id: "portfolio" as const, label: "Portfolio", icon: Wallet },
                ] as const).map((tab) => (
                  <button key={tab.id} onClick={() => setCardType(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border-none ${
                      cardType === tab.id ? "bg-surface-1 text-text-primary shadow-sm" : "text-text-tertiary hover:text-text-secondary"
                    }`}>
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Theme selector */}
              <div className="flex items-center gap-1.5">
                {([
                  { id: "dark" as const, color: "#0D71FF" },
                  { id: "gold" as const, color: "#D4AF37" },
                  { id: "minimal" as const, color: "#6366F1" },
                ] as const).map((th) => (
                  <button key={th.id} onClick={() => setCardTheme(th.id)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      cardTheme === th.id ? "border-white/40 scale-110" : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                    style={{ background: th.color }}
                    title={th.id}
                  />
                ))}
              </div>
            </div>

            {/* Card preview */}
            <div className="p-5 flex justify-center overflow-auto" style={{ background: "rgba(0,0,0,0.3)" }}>
              <div ref={cardRef} style={{ display: "inline-block" }}>
                <CardContent data={data} type={cardType} theme={cardTheme} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-border">
              <button onClick={handleDownload} disabled={downloading}
                className="btn-primary flex-1 text-sm gap-2">
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloading ? "Generating..." : "Download PNG"}
              </button>
              <button onClick={handleShare}
                className="btn-secondary px-4 py-2.5 text-sm gap-2 border-none">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Trigger button ─── */
export function GenerateCardButton({ data }: { data: PnlCardData }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-2/50 hover:bg-surface-3 transition-all border-none"
        title="Generate performance card">
        <ImageIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Share Card</span>
      </button>
      <PerformanceCardModal isOpen={open} onClose={() => setOpen(false)} data={data} />
    </>
  );
}
