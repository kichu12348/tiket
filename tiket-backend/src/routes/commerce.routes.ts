import type { FastifyInstance } from "fastify";
import {
  getFinance,
  updateBankAccount,
  requestPayout,
  refundOrder,
  decideRegistration,
  getCoupons,
  saveCoupon,
  getAvailability,
  getPermissions,
  getPendingApprovals,
  getBlacklist,
  createBlacklistEntry,
  deleteBlacklistEntry,
} from "../controllers/commerce.controller";
import {
  availabilitySchema,
  bankAccountSchema,
  blacklistQuerySchema,
  createBlacklistSchema,
  deleteBlacklistSchema,
  couponSchema,
  decisionSchema,
  eventSchema,
  payoutSchema,
  refundSchema,
} from "../_schemas/commerce.schema";
export default async function commerceRoutes(app: FastifyInstance) {
  app.get("/:eventId/permissions", eventSchema, getPermissions);
  app.get("/:eventId/approvals", eventSchema, getPendingApprovals);
  app.get("/:eventId/finance", eventSchema, getFinance);
  app.put("/:eventId/bank-account", bankAccountSchema, updateBankAccount);
  app.post("/:eventId/payouts", payoutSchema, requestPayout);
  app.post("/:eventId/orders/:orderId/refunds", refundSchema, refundOrder);
  app.post(
    "/:eventId/orders/:orderId/decision",
    decisionSchema,
    decideRegistration,
  );
  app.get("/:eventId/coupons", eventSchema, getCoupons);
  app.put("/:eventId/coupons", couponSchema, saveCoupon);
  app.get("/:eventId/availability", availabilitySchema, getAvailability);
  app.get("/:eventId/blacklist", blacklistQuerySchema, getBlacklist);
  app.post("/:eventId/blacklist", createBlacklistSchema, createBlacklistEntry);
  app.delete(
    "/:eventId/blacklist/:blacklistId",
    deleteBlacklistSchema,
    deleteBlacklistEntry,
  );
}

