import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { z } from "zod";

// ─── Validation Schemas ───

const createReviewSchema = z.object({
  traderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

const updateReviewSchema = z.object({
  reviewId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// ─── GET — Fetch reviews for a trader ───

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const traderId = searchParams.get("traderId");

    if (!traderId) {
      return errorResponse("traderId query parameter is required");
    }

    const trader = await prisma.trader.findUnique({
      where: { id: traderId },
    });

    if (!trader) {
      return errorResponse("Trader not found", 404);
    }

    const [reviews, aggregation] = await Promise.all([
      prisma.traderReview.findMany({
        where: { traderId },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.traderReview.aggregate({
        where: { traderId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        userId: r.user.id,
        userName: r.user.name,
        userAvatar: r.user.avatar,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      averageRating: aggregation._avg.rating ?? 0,
      totalReviews: aggregation._count.rating,
    });
  } catch {
    return unauthorizedResponse();
  }
}

// ─── POST — Create or upsert a review ───

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = createReviewSchema.parse(body);

    // Verify trader exists
    const trader = await prisma.trader.findUnique({
      where: { id: data.traderId },
    });

    if (!trader) {
      return errorResponse("Trader not found", 404);
    }

    // Cannot review yourself
    if (trader.userId === user.id) {
      return errorResponse("You cannot review yourself", 403);
    }

    // Must be an approved follower to leave a review
    const follower = await prisma.follower.findUnique({
      where: {
        userId_traderId: {
          userId: user.id,
          traderId: data.traderId,
        },
      },
    });

    if (!follower || !follower.approved) {
      return errorResponse(
        "You must be an approved follower of this trader to leave a review",
        403
      );
    }

    // Upsert: one review per user per trader
    const review = await prisma.traderReview.upsert({
      where: {
        userId_traderId: {
          userId: user.id,
          traderId: data.traderId,
        },
      },
      create: {
        userId: user.id,
        traderId: data.traderId,
        rating: data.rating,
        comment: data.comment ?? null,
      },
      update: {
        rating: data.rating,
        comment: data.comment ?? null,
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to submit review");
  }
}

// ─── PATCH — Update an existing review ───

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = updateReviewSchema.parse(body);

    // Verify review exists and belongs to the user
    const existing = await prisma.traderReview.findUnique({
      where: { id: data.reviewId },
    });

    if (!existing) {
      return errorResponse("Review not found", 404);
    }

    if (existing.userId !== user.id) {
      return errorResponse("You can only update your own reviews", 403);
    }

    const review = await prisma.traderReview.update({
      where: { id: data.reviewId },
      data: {
        rating: data.rating,
        comment: data.comment ?? null,
      },
    });

    return NextResponse.json({ review });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to update review");
  }
}
