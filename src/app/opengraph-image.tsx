import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CopyTrade Pro — Professional Copy Trading Platform";
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
          background: "linear-gradient(135deg, #0A0E1A 0%, #131722 40%, #1A1F2E 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: 0.06,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Gradient orbs */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(41,98,255,0.2) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -150,
            left: -100,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(38,166,154,0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            borderRadius: 100,
            border: "1px solid rgba(41,98,255,0.3)",
            background: "rgba(41,98,255,0.1)",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#26A69A",
              display: "flex",
            }}
          />
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
              letterSpacing: "0.05em",
              textTransform: "uppercase" as const,
            }}
          >
            Professional Copy Trading
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            CopyTrade Pro
          </span>
          <span
            style={{
              fontSize: 28,
              fontWeight: 400,
              color: "rgba(255,255,255,0.5)",
              marginTop: 12,
              maxWidth: 600,
              textAlign: "center" as const,
              lineHeight: 1.4,
            }}
          >
            Follow verified traders. Copy winning strategies. Earn automatically.
          </span>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 48,
            marginTop: 48,
            padding: "20px 40px",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          {[
            { value: "$284K+", label: "Volume Traded" },
            { value: "2,847+", label: "Trades Copied" },
            { value: "48+", label: "Master Traders" },
            { value: "<180ms", label: "Execution Speed" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#2962FF",
                }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 500,
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom domain */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
            copytrade-pro.vercel.app
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
