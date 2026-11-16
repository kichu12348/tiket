import type { FastifyInstance } from "fastify";
import {
  passwordAuth,
  sendOtp,
  verifyOtp,
  getMe,
  initiateGoogleOAuth,
  handleGoogleOAuthCallback,
} from "@controllers/auth";
import {
  passwordAuthSchema,
  sendOtpSchema,
  verifyOtpSchema,
  getMeSchema,
  googleOAuthInitiateSchema,
  googleOAuthCallbackSchema,
} from "@schemas/auth";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/password", passwordAuthSchema, passwordAuth);
  fastify.post("/otp/send", sendOtpSchema, sendOtp);
  fastify.post("/otp/verify", verifyOtpSchema, verifyOtp);

  // Google OAuth 2.0 endpoints
  fastify.get("/google", googleOAuthInitiateSchema, initiateGoogleOAuth);
  fastify.get(
    "/google/callback",
    googleOAuthCallbackSchema,
    handleGoogleOAuthCallback,
  );

  // Protected Route Requires standard Authorization: Bearer <token> Header
  fastify.get("/me", getMeSchema, getMe);
}
