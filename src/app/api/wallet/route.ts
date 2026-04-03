import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { z } from "zod";
import { createHash } from "crypto";

const connectSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  chainId: z.number().int().positive().optional(),
  connector: z.string().max(50).optional(),
});

const verifySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string(),
  message: z.string(),
});

/** Hash an address with SHA-256 for indexed lookups */
function hashAddress(address: string): string {
  return createHash("sha256").update(address.toLowerCase()).digest("hex");
}

/**
 * GET — Fetch user wallet info (address, connection status, chain)
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
      select: {
        address: true,
        isConnected: true,
        chainId: true,
        connector: true,
        verifiedAt: true,
      },
    });

    return NextResponse.json({ wallet });
  } catch {
    return unauthorizedResponse();
  }
}

/**
 * POST — Connect wallet (stores public address only, never private keys)
 *
 * Flow:
 * 1. User connects via MetaMask/WalletConnect/Coinbase in the browser
 * 2. Browser sends the public address to this endpoint
 * 3. We store the checksummed address + SHA-256 hash
 * 4. NO private keys, seed phrases, or recovery phrases are ever sent or stored
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    // Signature verification flow
    if (body.signature) {
      const { address, signature, message } = verifySchema.parse(body);

      // Verify the signature using viem's recoverMessageAddress
      // We do this server-side to confirm the user owns this address
      const { recoverMessageAddress } = await import("viem");
      const recoveredAddress = await recoverMessageAddress({
        message,
        signature: signature as `0x${string}`,
      });

      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return errorResponse("Signature verification failed — address mismatch", 400);
      }

      // Update wallet as verified
      const wallet = await prisma.wallet.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          address,
          addressHash: hashAddress(address),
          isConnected: true,
          verifiedAt: new Date(),
          chainId: body.chainId || 1,
          connector: body.connector || null,
        },
        update: {
          address,
          addressHash: hashAddress(address),
          isConnected: true,
          verifiedAt: new Date(),
          chainId: body.chainId || 1,
          connector: body.connector || null,
        },
        select: {
          address: true,
          isConnected: true,
          chainId: true,
          connector: true,
          verifiedAt: true,
        },
      });

      return NextResponse.json({ wallet, verified: true }, { status: 201 });
    }

    // Basic connection (without signature — pre-verification)
    const { address, chainId, connector } = connectSchema.parse(body);

    const wallet = await prisma.wallet.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        address,
        addressHash: hashAddress(address),
        isConnected: true,
        chainId: chainId || 1,
        connector: connector || null,
      },
      update: {
        address,
        addressHash: hashAddress(address),
        isConnected: true,
        chainId: chainId || 1,
        connector: connector || null,
      },
      select: {
        address: true,
        isConnected: true,
        chainId: true,
        connector: true,
        verifiedAt: true,
      },
    });

    return NextResponse.json({ wallet }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("Wallet connect failed:", error);
    return errorResponse("Failed to connect wallet");
  }
}

/**
 * DELETE — Disconnect wallet (keeps record, marks as disconnected)
 */
export async function DELETE() {
  try {
    const user = await requireAuth();

    await prisma.wallet.update({
      where: { userId: user.id },
      data: { isConnected: false },
    });

    return NextResponse.json({ success: true });
  } catch {
    return unauthorizedResponse();
  }
}
