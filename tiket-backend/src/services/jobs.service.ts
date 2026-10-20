import type { FastifyInstance } from "fastify";
import { cleanupExpiredHolds } from "./inventory.service";
import { processInbox, reconcilePayments } from "./payment-lifecycle.service";
import { processRefunds } from "./refund.service";
import { processDeliveries } from "./notifications.service";
import { cleanupConnectionTickets } from "./realtime.service";

export function startJobs(app: FastifyInstance) {
  const timers: ReturnType<typeof setInterval>[] = [];
  // Independent loops keep a slow mail/provider response from delaying expiry or webhooks.
  const schedule = (work: () => Promise<void>, interval: number) => {
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        await work();
      } catch (error) {
        app.log.error(error);
      } finally {
        busy = false;
      }
    };
    const timer = setInterval(() => {
      void tick();
    }, interval);
    timer.unref();
    timers.push(timer);
    void tick();
  };
  schedule(cleanupExpiredHolds, 5000);
  schedule(processInbox, 1000);
  schedule(processRefunds, 5000);
  schedule(processDeliveries, 5000);
  schedule(reconcilePayments, 60000);
  schedule(cleanupConnectionTickets, 60000);
  app.addHook("onClose", async () => {
    timers.forEach(clearInterval);
  });
}
