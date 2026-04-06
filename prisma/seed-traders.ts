/**
 * Seed script: Creates 100 mock master traders with realistic profiles,
 * trade history, and stats. All mock users are tagged with "[MOCK]" in bio
 * for easy identification and cleanup.
 *
 * Run: npx tsx prisma/seed-traders.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Name pools ───
const FIRST_NAMES = [
  "James","Maria","David","Sarah","Michael","Elena","Robert","Aisha","Daniel","Yuki",
  "Carlos","Sophie","Ahmed","Priya","Marcus","Olivia","Wei","Fatima","Lucas","Nina",
  "Alexander","Chloe","Hassan","Mia","Victor","Isabella","Omar","Zara","Felix","Amara",
  "Sebastian","Leila","Nathan","Sakura","Ethan","Lina","Anton","Maya","Rafael","Ingrid",
  "Leo","Nadia","Hugo","Simone","Javier","Freya","Ryo","Clara","Adrian","Valentina",
  "Gabriel","Petra","Diego","Hannah","Ivan","Kira","Tomas","Dara","Samuel","Anya",
  "Mateo","Elise","Noah","Rina","Oscar","Julia","Stefan","Alina","Henrik","Camille",
  "Axel","Bianca","Marco","Yara","Kenji","Sasha","Lukas","Mei","Dante","Aurora",
  "Emil","Naomi","Finn","Layla","Lorenzo","Ada","Nico","Iris","Kai","Rosa",
  "Joaquin","Hana","Theo","Mira","Elias","Tanya","Ruben","Jade","Liam","Esme",
];

const LAST_NAMES = [
  "Chen","Williams","Okonkwo","Petrov","Park","Rahman","Nakamura","Silva","Johansson","Al-Rashid",
  "Mueller","Dubois","Santos","Kim","Andersson","Moretti","Tanaka","Kowalski","Fernandez","Nguyen",
  "Schmidt","O'Brien","Yamamoto","Ivanov","Costa","Bergström","Rossi","Larsen","Mitchell","Torres",
  "Weber","Sato","Novak","Khan","Jensen","Martins","Volkov","Fischer","Reyes","Suzuki",
  "Bauer","Singh","Laurent","Patel","Eriksson","Romano","Takahashi","Kravchenko","Almeida","Lindberg",
  "Schneider","Das","Beaumont","Choi","Nilsson","Ricci","Watanabe","Petersen","Vargas","Morozov",
  "Gruber","Sharma","Lefèvre","Hashimoto","Berg","Colombo","Ishida","Hoffman","Mendez","Kozlov",
  "Richter","Gupta","Fournier","Saito","Hedlund","Mancini","Okada","Krause","Ruiz","Popov",
  "Brandt","Nair","Garnier","Inoue","Holm","De Luca","Kimura","Lehmann","Navarro","Sokolov",
  "Werner","Rao","Blanc","Shimizu","Strand","Conte","Hayashi","Vogel","Herrera","Kuznetsov",
];

const STYLES = [
  "Scalper","Swing Trader","Macro Analyst","Quant Trader","Day Trader",
  "Position Trader","Momentum Trader","Contrarian","Trend Follower","Algo Strategist",
  "Risk Arbitrageur","Event Driven","Statistical Analyst","Technical Analyst","Fundamental Analyst",
];

const BIOS = [
  "Specializing in high-frequency crypto signals with a focus on risk management.",
  "Veteran trader with deep expertise in prediction markets and macro events.",
  "Data-driven approach to trading. Every signal backed by quantitative analysis.",
  "Building consistent returns through disciplined position sizing and patience.",
  "Former institutional trader bringing hedge fund strategies to retail.",
  "Focused on Polymarket opportunities with real-time signal execution.",
  "Combining technical analysis with on-chain data for superior entries.",
  "Risk-first trading philosophy. Capital preservation is priority one.",
  "Algorithmic strategy developer with a track record of steady compounding.",
  "Macro trader focusing on geopolitical events and their market impact.",
  "Pattern recognition specialist with expertise in momentum breakouts.",
  "Long-term value approach applied to prediction market dynamics.",
  "Multi-asset trader covering crypto, forex, and prediction markets.",
  "Systematic trader using proprietary indicators for signal generation.",
  "Community-focused trader sharing transparent, real-time trade signals.",
];

const MARKETS = ["Crypto", "Polymarket", "Forex", "Commodities", "Indices"];
const TRADE_NAMES_CRYPTO = [
  "BTC Long","ETH Long","BTC Short","SOL Long","ETH Short","AVAX Long",
  "DOGE Long","LINK Long","ARB Long","OP Long","BTC Scalp","ETH Breakout",
  "SOL Momentum","MATIC Long","DOT Long","ADA Long","NEAR Long","FTM Long",
];
const TRADE_NAMES_POLY = [
  "Trump 2028 Yes","Fed Rate Cut","BTC > 100K","ETH Merge Success","S&P ATH",
  "AI Regulation","Crypto Ban No","Gold > 3K","Oil Drop","Tech Rally",
  "Election Outcome","GDP Growth","Inflation Peak","Rate Hike","Market Crash No",
];
const TRADE_NAMES_FOREX = [
  "EUR/USD Long","GBP/USD Short","USD/JPY Long","AUD/USD Long","EUR/GBP Short",
  "USD/CAD Long","NZD/USD Long","CHF/JPY Short",
];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTradeName(market: string): string {
  if (market === "Crypto") return pick(TRADE_NAMES_CRYPTO);
  if (market === "Polymarket") return pick(TRADE_NAMES_POLY);
  if (market === "Forex") return pick(TRADE_NAMES_FOREX);
  return pick([...TRADE_NAMES_CRYPTO, ...TRADE_NAMES_POLY]);
}

async function main() {
  console.log("🚀 Seeding 100 mock master traders...\n");

  const passwordHash = await bcrypt.hash("MockTrader2024!", 12);
  const now = new Date();
  let created = 0;

  for (let i = 0; i < 100; i++) {
    const firstName = FIRST_NAMES[i];
    const lastName = LAST_NAMES[i];
    const fullName = `${firstName} ${lastName}`;
    const email = `mock.trader.${i + 1}@copytradepro.mock`;
    const style = pick(STYLES);

    // Determine trader tier: 15 elite, 35 mid, 50 beginner
    let tier: "elite" | "mid" | "beginner";
    if (i < 15) tier = "elite";
    else if (i < 50) tier = "mid";
    else tier = "beginner";

    // Performance ranges by tier
    const roiRange = tier === "elite" ? [80, 180] : tier === "mid" ? [25, 79] : [5, 24];
    const winRateRange = tier === "elite" ? [68, 85] : tier === "mid" ? [55, 67] : [45, 58];
    const tradeCountRange = tier === "elite" ? [200, 800] : tier === "mid" ? [80, 250] : [15, 90];
    const followerRange = tier === "elite" ? [500, 3000] : tier === "mid" ? [50, 499] : [0, 49];

    const roi = parseFloat(randomBetween(roiRange[0], roiRange[1]).toFixed(1));
    const winRate = parseFloat(randomBetween(winRateRange[0], winRateRange[1]).toFixed(1));
    const totalTradeCount = randomInt(tradeCountRange[0], tradeCountRange[1]);
    const followers = randomInt(followerRange[0], followerRange[1]);
    const totalPnl = parseFloat((roi * randomBetween(50, 200)).toFixed(2));
    const bio = `${pick(BIOS)} [MOCK]`;
    const description = `${style} | ${tier === "elite" ? "Elite" : tier === "mid" ? "Professional" : "Rising"} Trader`;

    // Created date: 1-12 months ago
    const createdAt = new Date(now.getTime() - randomInt(30, 365) * 86400000);

    // Check if already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`  ⏭  ${fullName} already exists, skipping`);
      continue;
    }

    // Create user + trader in transaction
    const user = await prisma.user.create({
      data: {
        email,
        name: fullName,
        passwordHash,
        role: "MASTER_TRADER",
        emailVerified: true,
        onboardingComplete: true,
        createdAt,
        updatedAt: now,
        trader: {
          create: {
            displayName: fullName,
            bio,
            description,
            performancePct: roi,
            totalPnl,
            winRate,
            totalTrades: totalTradeCount,
            isActive: true,
            createdAt,
            updatedAt: now,
          },
        },
      },
      include: { trader: true },
    });

    const traderId = user.trader!.id;

    // Generate trade history (10-30 recent trades per trader)
    const numTrades = randomInt(10, Math.min(30, totalTradeCount));
    const trades = [];

    for (let t = 0; t < numTrades; t++) {
      const isWin = Math.random() < winRate / 100;
      const market = pick(MARKETS);
      const resultPercent = isWin
        ? parseFloat(randomBetween(2, 35).toFixed(1))
        : parseFloat((-randomBetween(2, 20)).toFixed(1));
      const profitLoss = parseFloat((resultPercent * randomBetween(5, 50)).toFixed(2));
      const tradeDate = new Date(now.getTime() - randomInt(1, 90) * 86400000 - randomInt(0, 86400000));

      trades.push({
        traderId,
        tradeName: generateTradeName(market),
        market,
        tradeType: isWin ? (Math.random() > 0.3 ? "BUY" : "SELL") : (Math.random() > 0.5 ? "BUY" : "SELL"),
        resultPercent,
        profitLoss,
        tradeAmount: parseFloat(randomBetween(100, 5000).toFixed(2)),
        targetMode: "ALL",
        notes: null,
        screenshotUrl: null,
        tradeDate,
        createdAt: tradeDate,
        updatedAt: now,
      });
    }

    if (trades.length > 0) {
      await prisma.traderTrade.createMany({ data: trades });
    }

    created++;
    const tierLabel = tier === "elite" ? "⭐" : tier === "mid" ? "📊" : "🌱";
    console.log(`  ${tierLabel} ${String(created).padStart(3)} | ${fullName.padEnd(24)} | ${style.padEnd(20)} | ROI: ${String(roi).padStart(6)}% | WR: ${String(winRate).padStart(5)}% | ${totalTradeCount} trades | ${followers} followers`);
  }

  console.log(`\n✅ Seeded ${created} mock master traders with trade history.`);
  console.log("   All mock accounts use email pattern: mock.trader.X@copytradepro.mock");
  console.log("   All mock bios end with [MOCK] tag for easy identification.");
  console.log("   To remove: DELETE FROM \"User\" WHERE email LIKE '%@copytradepro.mock';\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
