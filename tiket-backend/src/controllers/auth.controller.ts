import { deliverMail } from "../services/mail.service";
import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import { users } from "@db/schema";
import { eq, or } from "drizzle-orm";
import crypto from "crypto";

const OTP_HASH_SECRET = process.env.OTP_HASH_SECERT!;

interface OAuthStatePayload {
  nonce: string;
  redirect: string;
  mode: "popup" | "redirect";
  exp: number;
}

function signOAuthState(payload: OAuthStatePayload, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

function hashOtp(otp: string, email: string) {
  const hsh = crypto
    .createHmac("sha256", OTP_HASH_SECRET)
    .update(`${email}:${otp}`);
  return hsh.digest("base64");
}

function verifyOtpHash(otp: string, email: string, otpHash: string): boolean {
  const hash = hashOtp(otp, email);

  const a = Buffer.from(hash);
  const b = Buffer.from(otpHash);

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyOAuthState(
  state: string,
  secret: string,
): OAuthStatePayload | null {
  try {
    const parts = state.split(".");
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    if (!data || !signature) return null;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(data)
      .digest("base64url");
    if (
      signature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      )
    ) {
      return null;
    }
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as OAuthStatePayload;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export const passwordAuth = async (
  request: FastifyRequest<{
    Body: { email: string; password: string; name?: string };
  }>,
  reply: FastifyReply,
) => {
  const { email, password, name } = request.body;

  try {
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    let user = existingUsers[0];

    if (!user) {
      if (!name) {
        return reply
          .status(404)
          .send({ error: "User not found", needsName: true });
      }

      // Create new user
      const passwordHash = await Bun.password.hash(password, {
        algorithm: "bcrypt",
        cost: 10,
      });
      const slug = crypto.randomBytes(8).toString("hex");

      const newUser = await db
        .insert(users)
        .values({
          name,
          email,
          passwordHash,
          slug,
          isVerified: true,
        })
        .returning();

      user = newUser[0];
      if (!user) {
        throw new Error("Failed to create user");
      }
    } else {
      if (user.passwordHash === null) {
        return reply.status(400).send({
          error:
            "This account uses Google Sign-In. Please continue with Google.",
        });
      }

      const isMatch = await Bun.password.verify(password, user.passwordHash);
      if (!isMatch) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      if (!user.isVerified) {
        await db
          .update(users)
          .set({ isVerified: true })
          .where(eq(users.id, user.id));
        user.isVerified = true;
      }
    }

    const token = await reply.jwtSign(
      { id: user.id, email: user.email, type: user.type },
      { expiresIn: "30d" },
    );

    return reply.send({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
        type: user.type,
        description: user.description,
        isVerified: user.isVerified,
        createdAt: user.createdAt.toISOString(),
      },
      token,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const sendOtp = async (
  request: FastifyRequest<{ Body: { email: string; name?: string } }>,
  reply: FastifyReply,
) => {
  const { email, name } = request.body;

  try {
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    let user = existingUsers[0];

    if (!user) {
      if (!name) {
        return reply
          .status(404)
          .send({ error: "User not found", needsName: true });
      }

      const slug = crypto.randomBytes(8).toString("hex");

      const newUser = await db
        .insert(users)
        .values({
          name,
          email,
          slug,
          isVerified: false,
        })
        .returning();

      user = newUser[0];
      if (!user) {
        throw new Error("Failed to create user");
      }
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashOtp(otp, user.email);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await db
      .update(users)
      .set({ otpHash, otpExpiresAt })
      .where(eq(users.id, user.id));

    await deliverMail({
      recipientEmail: email,
      subject: "Your Tiket sign-in code",
      body: `<p>Your code is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
    });

    return reply.send({ message: "OTP sent successfully" });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const verifyOtp = async (
  request: FastifyRequest<{ Body: { email: string; otp: string } }>,
  reply: FastifyReply,
) => {
  const { email, otp } = request.body;

  try {
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    const user = existingUsers[0];

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      return reply.status(401).send({ error: "No OTP requested" });
    }

    if (new Date() > user.otpExpiresAt) {
      return reply.status(401).send({ error: "OTP expired" });
    }

    const isMatch = verifyOtpHash(otp, email, user.otpHash);
    if (!isMatch) {
      return reply.status(401).send({ error: "Invalid OTP" });
    }

    // Clear OTP and set verified
    await db
      .update(users)
      .set({ otpHash: null, otpExpiresAt: null, isVerified: true })
      .where(eq(users.id, user.id));

    user.isVerified = true;

    const token = await reply.jwtSign(
      { id: user.id, email: user.email, type: user.type },
      { expiresIn: "30d" },
    );

    return reply.send({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
        type: user.type,
        description: user.description,
        isVerified: user.isVerified,
        createdAt: user.createdAt.toISOString(),
      },
      token,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const getMe = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();

    const decoded = request.user as { id: string; email: string; type: string };

    const existingUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        type: users.type,
        description: users.description,
        isVerified: users.isVerified,
      })
      .from(users)
      .where(eq(users.id, decoded.id));

    if (existingUsers.length === 0 || !existingUsers[0]) {
      return { error: "User not found" };
    }

    const user = existingUsers[0];

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
        type: user.type,
        description: user.description,
        isVerified: user.isVerified,
        createdAt: user.createdAt.toISOString(),
      },
    };
  } catch {
    return reply.status(401).send({ error: "Unauthorized or invalid token" });
  }
};

export const initiateGoogleOAuth = async (
  request: FastifyRequest<{
    Querystring: { redirect?: string; mode?: "popup" | "redirect" };
  }>,
  reply: FastifyReply,
) => {
  const { redirect, mode } = request.query;

  const safeRedirect =
    redirect &&
    redirect.startsWith("/") &&
    !redirect.startsWith("//") &&
    !redirect.includes("\\")
      ? redirect
      : "/home";

  const safeMode = mode === "popup" ? "popup" : "redirect";

  const nonce = crypto.randomBytes(16).toString("hex");
  const statePayload: OAuthStatePayload = {
    nonce,
    redirect: safeRedirect,
    mode: safeMode,
    exp: Date.now() + 10 * 60 * 1000,
  };

  const state = signOAuthState(
    statePayload,
    process.env.JWT_SECRET || "default_jwt_secret",
  );

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set(
    "client_id",
    process.env.GOOGLE_CLIENT_ID || "",
  );
  googleAuthUrl.searchParams.set(
    "redirect_uri",
    process.env.GOOGLE_CALLBACK_URL || "",
  );
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("prompt", "select_account");

  return reply.redirect(googleAuthUrl.toString(), 302);
};

export const handleGoogleOAuthCallback = async (
  request: FastifyRequest<{
    Querystring: { code?: string; state?: string; error?: string };
  }>,
  reply: FastifyReply,
) => {
  const frontendUrl = (
    process.env.FRONTEND_URL || "http://localhost:3000"
  ).replace(/\/+$/, "");

  const { code, state, error } = request.query;

  if (!state) {
    return reply.redirect(
      `${frontendUrl}/login?error=oauth_state_invalid`,
      302,
    );
  }

  const statePayload = verifyOAuthState(
    state,
    process.env.JWT_SECRET || "default_jwt_secret",
  );

  if (!statePayload) {
    return reply.redirect(
      `${frontendUrl}/login?error=oauth_state_invalid`,
      302,
    );
  }

  if (error || !code) {
    return reply.redirect(
      `${frontendUrl}/login?error=${encodeURIComponent(error || "oauth_failed")}`,
      302,
    );
  }

  try {
    const tokenParams = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: process.env.GOOGLE_CALLBACK_URL || "",
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      request.log.error(await tokenRes.text());
      return reply.redirect(
        `${frontendUrl}/login?error=oauth_token_exchange_failed`,
        302,
      );
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      return reply.redirect(
        `${frontendUrl}/login?error=oauth_token_exchange_failed`,
        302,
      );
    }

    const userInfoRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    );

    if (!userInfoRes.ok) {
      return reply.redirect(
        `${frontendUrl}/login?error=oauth_userinfo_failed`,
        302,
      );
    }

    const profile = (await userInfoRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    if (!profile.email || !profile.email_verified || !profile.sub) {
      return reply.redirect(
        `${frontendUrl}/login?error=unverified_google_email`,
        302,
      );
    }

    let pictureUrl: string | null = profile.picture || null;
    if (pictureUrl && pictureUrl.includes("=s96-c")) {
      pictureUrl = pictureUrl.replace("=s96-c", "=s256-c");
    }

    const normalizedEmail = profile.email.toLowerCase();

    const existingUsers = await db
      .select()
      .from(users)
      .where(
        or(eq(users.googleId, profile.sub), eq(users.email, normalizedEmail)),
      );

    let user = existingUsers[0];

    if (user) {
      const shouldUpdateAvatar =
        !user.avatarUrl || user.avatarUrl.includes("googleusercontent.com");

      await db
        .update(users)
        .set({
          googleId: profile.sub,
          avatarUrl: shouldUpdateAvatar ? pictureUrl : user.avatarUrl,
          isVerified: true,
        })
        .where(eq(users.id, user.id));

      user.googleId = profile.sub;
      if (shouldUpdateAvatar) user.avatarUrl = pictureUrl;
      user.isVerified = true;
    } else {
      const slug = crypto.randomBytes(8).toString("hex");
      const name = profile.name || normalizedEmail.split("@")[0] || "User";

      const inserted = await db
        .insert(users)
        .values({
          name,
          email: normalizedEmail,
          googleId: profile.sub,
          avatarUrl: pictureUrl,
          passwordHash: null,
          slug,
          isVerified: true,
        })
        .returning();

      user = inserted[0];
      if (!user) {
        throw new Error("Failed to create user");
      }
    }

    const token = await reply.jwtSign(
      { id: user.id, email: user.email, type: user.type },
      { expiresIn: "30d" },
    );

    const safeRedirect =
      statePayload.redirect &&
      statePayload.redirect.startsWith("/") &&
      !statePayload.redirect.startsWith("//") &&
      !statePayload.redirect.includes("\\")
        ? statePayload.redirect
        : "/home";

    const callbackUrl = new URL(`${frontendUrl}/auth/google/callback`);
    callbackUrl.searchParams.set("token", token);
    callbackUrl.searchParams.set("redirect", safeRedirect);
    callbackUrl.searchParams.set("mode", statePayload.mode || "redirect");

    return reply.redirect(callbackUrl.toString(), 302);
  } catch (err) {
    request.log.error(err);
    return reply.redirect(
      `${frontendUrl}/login?error=oauth_internal_error`,
      302,
    );
  }
};
