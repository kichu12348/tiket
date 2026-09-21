import type { FastifyInstance } from "fastify";
import { passwordAuth, sendOtp, verifyOtp, getMe } from "@controllers/auth";
import { passwordAuthSchema, sendOtpSchema, verifyOtpSchema, getMeSchema } from "@schemas/auth";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/password", passwordAuthSchema, passwordAuth);
  fastify.post("/otp/send", sendOtpSchema, sendOtp);
  fastify.post("/otp/verify", verifyOtpSchema, verifyOtp);

  // Protected Route Requires standard Authorization: Bearer <token> Header
  fastify.get("/me", getMeSchema, getMe);
}
