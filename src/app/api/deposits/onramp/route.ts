import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { z } from "zod";

const onrampSchema = z.object({
  provider: z.enum(["moonpay", "transak", "coinbase", "crypto_com", "ramp", "banxa"] as const),
  amount: z.number().positive().min(10),
  currency: z.string().default("usd"),
  cryptoCurrency: z.string().default("eth"),
});

/**
 * POST — Generate an on-ramp provider URL for deposit
 * The widget URL directs purchased crypto to the admin wallet
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = onrampSchema.parse(body);

    // Get admin deposit wallet — funds go here
    const adminWalletConfig = await prisma.adminConfig.findUnique({
      where: { key: "deposit_wallet" },
    });

    if (!adminWalletConfig?.value) {
      return errorResponse("Deposit wallet not configured. Contact support.", 400);
    }

    const walletAddress = adminWalletConfig.value;

    // Create a pending deposit record so we can track it
    const deposit = await prisma.depositRequest.create({
      data: {
        userId: user.id,
        amount: data.amount,
        method: "ONRAMP",
        coin: data.cryptoCurrency.toUpperCase(),
        network: "auto",
        status: "PENDING",
        adminWallet: walletAddress,
        note: `via ${data.provider}`,
      },
    });

    // Build provider widget URL
    let widgetUrl = "";
    const depositId = deposit.id;

    switch (data.provider) {
      case "moonpay": {
        const apiKey = process.env.NEXT_PUBLIC_MOONPAY_API_KEY;
        const baseUrl = apiKey
          ? "https://buy.moonpay.com"
          : "https://buy-sandbox.moonpay.com";
        const params = new URLSearchParams({
          apiKey: apiKey || "pk_test_123",
          walletAddress,
          currencyCode: data.cryptoCurrency,
          baseCurrencyAmount: String(data.amount),
          baseCurrencyCode: data.currency,
          externalTransactionId: depositId,
          colorCode: "#6366f1",
          showWalletAddressForm: "false",
        });
        widgetUrl = `${baseUrl}?${params.toString()}`;
        break;
      }

      case "transak": {
        const apiKey = process.env.NEXT_PUBLIC_TRANSAK_API_KEY;
        const baseUrl = apiKey
          ? "https://global.transak.com"
          : "https://global-stg.transak.com";
        const params = new URLSearchParams({
          apiKey: apiKey || "af93e08b-fae5-4145-a04a-3d1bc3de9cf8",
          walletAddress,
          cryptoCurrencyCode: data.cryptoCurrency.toUpperCase(),
          fiatAmount: String(data.amount),
          fiatCurrency: data.currency.toUpperCase(),
          disableWalletAddressForm: "true",
          partnerOrderId: depositId,
          themeColor: "6366f1",
          hideMenu: "true",
        });
        widgetUrl = `${baseUrl}?${params.toString()}`;
        break;
      }

      case "coinbase": {
        const appId = process.env.NEXT_PUBLIC_COINBASE_APP_ID;
        const params = new URLSearchParams({
          appId: appId || "test",
          destinationWallets: JSON.stringify([
            {
              address: walletAddress,
              assets: [data.cryptoCurrency.toLowerCase()],
            },
          ]),
          presetFiatAmount: String(data.amount),
          fiatCurrency: data.currency,
        });
        widgetUrl = `https://pay.coinbase.com/buy/select-asset?${params.toString()}`;
        break;
      }

      case "crypto_com": {
        const secretKey = process.env.CRYPTO_COM_PAY_SECRET_KEY;
        const publishableKey = process.env.NEXT_PUBLIC_CRYPTO_COM_PAY_KEY;
        const baseUrl = secretKey
          ? "https://pay.crypto.com/sdk"
          : "https://pay-sandbox.crypto.com/sdk";
        const params = new URLSearchParams({
          publishableKey: publishableKey || "pk_test_crypto",
          amount: String(data.amount),
          currency: data.currency.toUpperCase(),
          description: `Deposit ${data.cryptoCurrency.toUpperCase()} — ${depositId}`,
          metadata: JSON.stringify({ depositId, userId: user.id }),
          walletAddress,
        });
        widgetUrl = `${baseUrl}?${params.toString()}`;
        break;
      }

      case "ramp": {
        const apiKey = process.env.NEXT_PUBLIC_RAMP_API_KEY;
        const baseUrl = apiKey
          ? "https://app.ramp.network"
          : "https://app.demo.ramp.network";
        const params = new URLSearchParams({
          hostApiKey: apiKey || "demo_key",
          hostAppName: "CopyTrade Pro",
          userAddress: walletAddress,
          swapAsset: data.cryptoCurrency.toUpperCase(),
          fiatValue: String(data.amount),
          fiatCurrency: data.currency.toUpperCase(),
          finalUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/deposit`,
        });
        widgetUrl = `${baseUrl}?${params.toString()}`;
        break;
      }

      case "banxa": {
        const apiKey = process.env.NEXT_PUBLIC_BANXA_API_KEY;
        const subdomain = apiKey ? "copytradepro" : "sandbox";
        const params = new URLSearchParams({
          fiatAmount: String(data.amount),
          fiatType: data.currency.toUpperCase(),
          coinType: data.cryptoCurrency.toUpperCase(),
          walletAddress,
          orderType: "BUY",
          returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/deposit`,
        });
        widgetUrl = `https://${subdomain}.banxa.com/?${params.toString()}`;
        break;
      }
    }

    // Detect if running in sandbox mode (no real API keys)
    const isSandbox =
      (data.provider === "moonpay" && !process.env.NEXT_PUBLIC_MOONPAY_API_KEY) ||
      (data.provider === "transak" && !process.env.NEXT_PUBLIC_TRANSAK_API_KEY) ||
      (data.provider === "coinbase" && !process.env.NEXT_PUBLIC_COINBASE_APP_ID) ||
      (data.provider === "crypto_com" && !process.env.CRYPTO_COM_PAY_SECRET_KEY) ||
      (data.provider === "ramp" && !process.env.NEXT_PUBLIC_RAMP_API_KEY) ||
      (data.provider === "banxa" && !process.env.NEXT_PUBLIC_BANXA_API_KEY);

    return NextResponse.json({
      widgetUrl,
      depositId,
      provider: data.provider,
      walletAddress,
      sandbox: isSandbox,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to generate on-ramp URL");
  }
}
