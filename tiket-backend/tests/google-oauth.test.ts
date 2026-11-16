import { describe, expect, test, spyOn, beforeEach, afterEach } from "bun:test";
import crypto from "node:crypto";
import { buildApp } from "../src/app";
import db from "../src/db";

interface MockUserInsert {
  name?: string;
  email?: string;
  googleId?: string | null;
  avatarUrl?: string | null;
  passwordHash?: string | null;
  slug?: string;
  isVerified?: boolean;
}

interface MockUserUpdate {
  googleId?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
}

describe("Google OAuth 2.0 & Google Sign-In Guards", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
    process.env.GOOGLE_CALLBACK_URL =
      "http://localhost:5000/api/auth/google/callback";
    process.env.FRONTEND_URL = "http://localhost:3000";
    process.env.JWT_SECRET = "test-jwt-secret-key-1234567890";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  function generateValidState(payload: {
    nonce?: string;
    redirect?: string;
    mode?: "popup" | "redirect";
    exp?: number;
  }) {
    const data = Buffer.from(
      JSON.stringify({
        nonce: payload.nonce || "nonce123",
        redirect: payload.redirect || "/home",
        mode: payload.mode || "redirect",
        exp: payload.exp || Date.now() + 10 * 60 * 1000,
      }),
    ).toString("base64url");
    const sig = crypto
      .createHmac("sha256", process.env.JWT_SECRET!)
      .update(data)
      .digest("base64url");
    return `${data}.${sig}`;
  }

  describe("GET /api/auth/google (initiateGoogleOAuth)", () => {
    test("returns 302 redirect to accounts.google.com with openid, email, profile scope and signed state", async () => {
      const app = buildApp();
      await app.ready();

      const response = await app.inject({
        method: "GET",
        url: "/api/auth/google?redirect=/dashboard&mode=popup",
      });

      expect(response.statusCode).toBe(302);
      const location = response.headers.location;
      expect(location).toBeDefined();

      const redirectUrl = new URL(location!);
      expect(redirectUrl.origin).toBe("https://accounts.google.com");
      expect(redirectUrl.pathname).toBe("/o/oauth2/v2/auth");
      expect(redirectUrl.searchParams.get("client_id")).toBe(
        "test-google-client-id",
      );
      expect(redirectUrl.searchParams.get("redirect_uri")).toBe(
        "http://localhost:5000/api/auth/google/callback",
      );
      expect(redirectUrl.searchParams.get("response_type")).toBe("code");
      expect(redirectUrl.searchParams.get("scope")).toBe(
        "openid email profile",
      );
      expect(redirectUrl.searchParams.get("prompt")).toBe("select_account");

      const state = redirectUrl.searchParams.get("state");
      expect(state).toBeTruthy();

      const parts = state!.split(".");
      const data = parts[0];
      const sig = parts[1];
      if (!data || !sig) {
        throw new Error("State must have data and signature");
      }

      const expectedSig = crypto
        .createHmac("sha256", process.env.JWT_SECRET!)
        .update(data)
        .digest("base64url");
      expect(sig).toBe(expectedSig);

      const parsedPayload = JSON.parse(
        Buffer.from(data, "base64url").toString("utf8"),
      );
      expect(parsedPayload.redirect).toBe("/dashboard");
      expect(parsedPayload.mode).toBe("popup");
      expect(parsedPayload.exp).toBeGreaterThan(Date.now());

      await app.close();
    });
  });

  describe("GET /api/auth/google/callback (handleGoogleOAuthCallback)", () => {
    test("rejects missing state by redirecting to login with oauth_state_invalid", async () => {
      const app = buildApp();
      await app.ready();

      const response = await app.inject({
        method: "GET",
        url: "/api/auth/google/callback?code=mock-auth-code",
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(
        "http://localhost:3000/login?error=oauth_state_invalid",
      );

      await app.close();
    });

    test("rejects tampered or expired state by redirecting to login with oauth_state_invalid", async () => {
      const app = buildApp();
      await app.ready();

      const expiredState = generateValidState({
        exp: Date.now() - 1000,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/auth/google/callback?code=mock-auth-code&state=${expiredState}`,
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(
        "http://localhost:3000/login?error=oauth_state_invalid",
      );

      const tamperedState = expiredState.slice(0, -4) + "XXXX";
      const tamperedRes = await app.inject({
        method: "GET",
        url: `/api/auth/google/callback?code=mock-auth-code&state=${tamperedState}`,
      });

      expect(tamperedRes.statusCode).toBe(302);
      expect(tamperedRes.headers.location).toBe(
        "http://localhost:3000/login?error=oauth_state_invalid",
      );

      await app.close();
    });

    test("rejects unverified Google email with unverified_google_email", async () => {
      const app = buildApp();
      await app.ready();

      const validState = generateValidState({
        redirect: "/events/my-event",
        mode: "popup",
      });

      globalThis.fetch = (async (url: string | URL) => {
        const urlStr = url.toString();
        if (urlStr.includes("oauth2.googleapis.com/token")) {
          return new Response(
            JSON.stringify({
              access_token: "mock-access-token",
              token_type: "Bearer",
              expires_in: 3600,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (urlStr.includes("openidconnect.googleapis.com/v1/userinfo")) {
          return new Response(
            JSON.stringify({
              sub: "google-sub-unverified",
              email: "unverified@example.com",
              email_verified: false,
              name: "Unverified User",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("Not found", { status: 404 });
      }) as unknown as typeof fetch;

      const response = await app.inject({
        method: "GET",
        url: `/api/auth/google/callback?code=mock-auth-code&state=${validState}`,
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(
        "http://localhost:3000/login?error=unverified_google_email",
      );

      await app.close();
    });

    test("creates new user, normalizes high-res avatar, and redirects to callback with JWT and mode", async () => {
      const app = buildApp();
      await app.ready();

      const validState = generateValidState({
        redirect: "/home",
        mode: "popup",
      });

      globalThis.fetch = (async (url: string | URL) => {
        const urlStr = url.toString();
        if (urlStr.includes("oauth2.googleapis.com/token")) {
          return new Response(
            JSON.stringify({
              access_token: "mock-access-token",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (urlStr.includes("openidconnect.googleapis.com/v1/userinfo")) {
          return new Response(
            JSON.stringify({
              sub: "google-sub-new-123",
              email: "newuser@example.com",
              email_verified: true,
              name: "New User",
              picture: "https://lh3.googleusercontent.com/a/photo=s96-c",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("Not found", { status: 404 });
      }) as unknown as typeof fetch;

      const captured: {
        inserted: MockUserInsert | null;
      } = {
        inserted: null,
      };

      const selectSpy = spyOn(db, "select") as unknown as {
        mockImplementation: (
          fn: () => { from: () => { where: () => Promise<unknown[]> } },
        ) => void;
      };
      selectSpy.mockImplementation(() => ({
        from: () => ({
          where: async () => [],
        }),
      }));

      const insertSpy = spyOn(db, "insert") as unknown as {
        mockImplementation: (
          fn: () => {
            values: (vals: MockUserInsert) => {
              returning: () => Promise<unknown[]>;
            };
          },
        ) => void;
      };
      insertSpy.mockImplementation(() => ({
        values: (vals: MockUserInsert) => {
          captured.inserted = vals;
          return {
            returning: async () => [
              {
                id: "usr-new-uuid",
                email: vals.email,
                name: vals.name,
                googleId: vals.googleId,
                avatarUrl: vals.avatarUrl,
                type: "individual",
                isVerified: true,
                passwordHash: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          };
        },
      }));

      const response = await app.inject({
        method: "GET",
        url: `/api/auth/google/callback?code=mock-code&state=${validState}`,
      });

      expect(response.statusCode).toBe(302);
      const loc = new URL(response.headers.location!);
      expect(loc.origin).toBe("http://localhost:3000");
      expect(loc.pathname).toBe("/auth/google/callback");
      expect(loc.searchParams.get("token")).toBeTruthy();
      expect(loc.searchParams.get("redirect")).toBe("/home");
      expect(loc.searchParams.get("mode")).toBe("popup");

      expect(captured.inserted).toBeTruthy();
      expect(captured.inserted?.email).toBe("newuser@example.com");
      expect(captured.inserted?.googleId).toBe("google-sub-new-123");
      expect(captured.inserted?.avatarUrl).toBe(
        "https://lh3.googleusercontent.com/a/photo=s256-c",
      );
      expect(captured.inserted?.passwordHash).toBeNull();
      expect(captured.inserted?.isVerified).toBe(true);

      await app.close();
    });

    test("links existing user by email, updating googleId and avatarUrl", async () => {
      const app = buildApp();
      await app.ready();

      const validState = generateValidState({
        redirect: "/events/my-pass",
        mode: "redirect",
      });

      globalThis.fetch = (async (url: string | URL) => {
        const urlStr = url.toString();
        if (urlStr.includes("oauth2.googleapis.com/token")) {
          return new Response(
            JSON.stringify({
              access_token: "mock-access-token",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (urlStr.includes("openidconnect.googleapis.com/v1/userinfo")) {
          return new Response(
            JSON.stringify({
              sub: "google-sub-linked",
              email: "existing@example.com",
              email_verified: true,
              name: "Existing User",
              picture: "https://lh3.googleusercontent.com/photo",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("Not found", { status: 404 });
      }) as unknown as typeof fetch;

      const captured: {
        updated: MockUserUpdate | null;
      } = {
        updated: null,
      };

      const selectSpy = spyOn(db, "select") as unknown as {
        mockImplementation: (
          fn: () => { from: () => { where: () => Promise<unknown[]> } },
        ) => void;
      };
      selectSpy.mockImplementation(() => ({
        from: () => ({
          where: async () => [
            {
              id: "usr-existing-id",
              email: "existing@example.com",
              name: "Existing User",
              googleId: null,
              avatarUrl: null,
              passwordHash: "existing-hash",
              type: "individual",
              isVerified: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      }));

      const updateSpy = spyOn(db, "update") as unknown as {
        mockImplementation: (
          fn: () => {
            set: (vals: MockUserUpdate) => {
              where: () => Promise<unknown[]>;
            };
          },
        ) => void;
      };
      updateSpy.mockImplementation(() => ({
        set: (vals: MockUserUpdate) => {
          captured.updated = vals;
          return {
            where: async () => [],
          };
        },
      }));

      const response = await app.inject({
        method: "GET",
        url: `/api/auth/google/callback?code=mock-code&state=${validState}`,
      });

      expect(response.statusCode).toBe(302);
      const loc = new URL(response.headers.location!);
      expect(loc.origin).toBe("http://localhost:3000");
      expect(loc.pathname).toBe("/auth/google/callback");
      expect(loc.searchParams.get("token")).toBeTruthy();
      expect(loc.searchParams.get("redirect")).toBe("/events/my-pass");
      expect(loc.searchParams.get("mode")).toBe("redirect");

      expect(captured.updated).toBeTruthy();
      expect(captured.updated?.googleId).toBe("google-sub-linked");
      expect(captured.updated?.avatarUrl).toBe(
        "https://lh3.googleusercontent.com/photo",
      );
      expect(captured.updated?.isVerified).toBe(true);

      await app.close();
    });
  });

  describe("POST /api/auth/password (Google-Only Account Guard)", () => {
    test("rejects password login on account where passwordHash is null with 400 error", async () => {
      const app = buildApp();
      await app.ready();

      const selectSpy = spyOn(db, "select") as unknown as {
        mockImplementation: (
          fn: () => { from: () => { where: () => Promise<unknown[]> } },
        ) => void;
      };
      selectSpy.mockImplementation(() => ({
        from: () => ({
          where: async () => [
            {
              id: "usr-google-only",
              email: "googleonly@example.com",
              name: "Google Only User",
              passwordHash: null,
              googleId: "google-sub-999",
              type: "individual",
              isVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      }));

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/password",
        payload: {
          email: "googleonly@example.com",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe(
        "This account uses Google Sign-In. Please continue with Google.",
      );

      await app.close();
    });
  });
});
