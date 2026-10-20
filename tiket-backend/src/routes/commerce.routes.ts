import type { FastifyInstance } from "fastify";
import {
  getFinance,
  refundOrder,
  decideRegistration,
  getCoupons,
  saveCoupon,
  getAvailability,
  getPermissions,
  getPendingApprovals,
} from "../controllers/commerce.controller";
import {
  availabilitySchema,
  couponSchema,
  decisionSchema,
  eventSchema,
  refundSchema,
} from "../_schemas/commerce.schema";
export default async function commerceRoutes(app: FastifyInstance) {
  app.get("/:eventId/permissions", eventSchema, getPermissions);
  app.get("/:eventId/approvals", eventSchema, getPendingApprovals);
  app.get("/:eventId/finance", eventSchema, getFinance);
  app.post("/:eventId/orders/:orderId/refunds", refundSchema, refundOrder);
  app.post(
    "/:eventId/orders/:orderId/decision",
    decisionSchema,
    decideRegistration,
  );
  app.get("/:eventId/coupons", eventSchema, getCoupons);
  app.put("/:eventId/coupons", couponSchema, saveCoupon);
  app.get("/:eventId/availability", availabilitySchema, getAvailability);
}
