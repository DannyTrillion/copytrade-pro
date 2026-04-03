/**
 * Trade Queue Worker
 *
 * In production, this would use BullMQ with Redis for reliable job processing.
 * For development, we use an in-memory async queue.
 *
 * Production setup:
 * - Install Redis
 * - Configure BullMQ Worker to process `copy-trade` queue
 * - Add dead letter queue for failed jobs
 * - Add job retention policies
 */

import { processSignal } from "@/lib/engine/copy-trade";

interface QueueJob {
  id: string;
  signalId: string;
  attempts: number;
  maxAttempts: number;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  error?: string;
}

class InMemoryTradeQueue {
  private queue: QueueJob[] = [];
  private processing = false;
  private concurrency = 5;

  async add(signalId: string): Promise<string> {
    const job: QueueJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      signalId,
      attempts: 0,
      maxAttempts: 3,
      status: "pending",
      createdAt: new Date(),
    };

    this.queue.push(job);
    this.processNext();
    return job.id;
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const pendingJobs = this.queue
        .filter((j) => j.status === "pending")
        .slice(0, this.concurrency);

      if (pendingJobs.length === 0) {
        this.processing = false;
        return;
      }

      await Promise.allSettled(
        pendingJobs.map(async (job) => {
          job.status = "processing";
          job.attempts++;

          try {
            await processSignal(job.signalId);
            job.status = "completed";
          } catch (error) {
            if (job.attempts < job.maxAttempts) {
              job.status = "pending"; // Retry
              job.error = error instanceof Error ? error.message : "Unknown error";
            } else {
              job.status = "failed";
              job.error = error instanceof Error ? error.message : "Unknown error";
              console.error(`Job ${job.id} permanently failed:`, job.error);
            }
          }
        })
      );
    } finally {
      this.processing = false;

      // Check if more jobs need processing
      if (this.queue.some((j) => j.status === "pending")) {
        this.processNext();
      }
    }
  }

  getStats() {
    return {
      pending: this.queue.filter((j) => j.status === "pending").length,
      processing: this.queue.filter((j) => j.status === "processing").length,
      completed: this.queue.filter((j) => j.status === "completed").length,
      failed: this.queue.filter((j) => j.status === "failed").length,
      total: this.queue.length,
    };
  }
}

// Singleton instance
export const tradeQueue = new InMemoryTradeQueue();
