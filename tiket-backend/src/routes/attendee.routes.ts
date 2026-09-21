import type { FastifyInstance } from "fastify";
import {
  getAttendees,
  getAttendeeStats,
  getAttendeeById,
  getAttendeeFormResponses,
  toggleCheckIn,
  cancelTicket,
  manualRegister,
  exportAttendees,
} from "@controllers/attendee";
import {
  getAttendeesSchema,
  getAttendeeStatsSchema,
  getAttendeeByIdSchema,
  getAttendeeFormResponsesSchema,
  toggleCheckInSchema,
  cancelTicketSchema,
  manualRegisterSchema,
  exportAttendeesSchema,
} from "@schemas/attendee";

export default async function attendeeRoutes(fastify: FastifyInstance) {
  fastify.get("/:eventId", getAttendeesSchema, getAttendees);
  fastify.get("/:eventId/stats", getAttendeeStatsSchema, getAttendeeStats);
  fastify.get("/:eventId/export", exportAttendeesSchema, exportAttendees);
  fastify.get("/:eventId/:ticketId", getAttendeeByIdSchema, getAttendeeById);
  fastify.get(
    "/:eventId/:ticketId/form-responses",
    getAttendeeFormResponsesSchema,
    getAttendeeFormResponses,
  );
  fastify.post("/:eventId/:ticketId/check-in", toggleCheckInSchema, toggleCheckIn);
  fastify.post("/:eventId/:ticketId/cancel", cancelTicketSchema, cancelTicket);
  fastify.post("/:eventId/manual-register", manualRegisterSchema, manualRegister);
}
