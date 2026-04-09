import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Webull CopyTradesPro — Automated Copy Trading";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(145deg, #04040a 0%, #0a0a14 40%, #060612 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: 0.04,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Blue orb */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: 100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(13,113,255,0.15) 0%, transparent 60%)",
            display: "flex",
          }}
        />
        {/* Indigo orb */}
        <div
          style={{
            position: "absolute",
            bottom: -100,
            right: -50,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 60%)",
            display: "flex",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 22px",
            borderRadius: 100,
            border: "1px solid rgba(13,113,255,0.2)",
            background: "rgba(13,113,255,0.06)",
            marginBottom: 36,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0D71FF", display: "flex" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(13,113,255,0.8)", letterSpacing: "0.15em", textTransform: "uppercase" as const }}>
            Webull Powered
          </span>
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
          <span style={{ fontSize: 68, fontWeight: 800, color: "white", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            CopyTradesPro
          </span>
          <span style={{ fontSize: 26, fontWeight: 400, color: "rgba(255,255,255,0.35)", marginTop: 16, maxWidth: 600, textAlign: "center" as const, lineHeight: 1.5 }}>
            Copy elite traders. Automate your edge. Powered by Webull infrastructure.
          </span>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 44,
            padding: "18px 40px",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          {[
            { value: "2,800+", label: "Trades Copied" },
            { value: "100+", label: "Verified Traders" },
            { value: "99.9%", label: "Uptime" },
            { value: "<200ms", label: "Execution" },
          ].map((stat) => (
            <div key={stat.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: "#0D71FF" }}>{stat.value}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Domain */}
        <div style={{ position: "absolute", bottom: 28, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.2)", fontWeight: 500, letterSpacing: "0.05em" }}>
            copytradespro.com
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
