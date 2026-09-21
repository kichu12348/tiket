import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

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
      const passwordHash = await Bun.password.hash(password);
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
      if (!user.passwordHash) {
        return reply.status(401).send({ error: "Invalid credentials" });
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
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await Bun.password.hash(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await db
      .update(users)
      .set({ otpHash, otpExpiresAt })
      .where(eq(users.id, user.id));

    // Log OTP for development
    console.log(`[DEV ONLY] OTP for ${email} is: ${otp}`);

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

    const isMatch = await Bun.password.verify(otp, user.otpHash);
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
        type: user.type,
        description: user.description,
        isVerified: user.isVerified,
        createdAt: user.createdAt.toISOString(),
      },
    };
  } catch (error) {
    return reply.status(401).send({ error: "Unauthorized or invalid token" });
  }
};
