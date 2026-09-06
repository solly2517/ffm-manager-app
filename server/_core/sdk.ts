import { COOKIE_NAME, FFM_MAGIC_SESSION_COOKIE, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }
    return new TextEncoder().encode(secret);
  }

  /**
   * Create a session token for a local user identified by openId.
   * @example
   * const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name });
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || "",
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }

      return {
        openId,
        appId,
        name,
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    // 1. Prefer the dedicated FFM invitation session, then the standard app
    // session cookie.
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(FFM_MAGIC_SESSION_COOKIE) ?? cookies.get(COOKIE_NAME);

    // 2. Fallback to the Authorization header (used when the browser blocks
    //    cookies, e.g. Safari ITP, private browsing, or iOS/Android WebView).
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }

    // 3. Scheduled/cron callers authenticate with a static shared secret
    //    instead of a user session.
    const cronSecret = req.headers["x-cron-secret"];
    if (isNonEmptyString(cronSecret) && ENV.cronSecret && cronSecret === ENV.cronSecret) {
      return buildCronUser();
    }

    const session = await this.verifySession(sessionToken);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const user = await db.getUserByOpenId(session.openId);

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: new Date(),
    });

    return user;
  }
}

/** Result of `sdk.authenticateRequest`. Cron callbacks set `isCron=true`. */
export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

function buildCronUser(): AuthenticatedUser {
  const now = new Date();
  return {
    id: -1,
    openId: "cron",
    name: "Scheduled Task",
    email: null,
    passwordHash: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: "cron",
    isCron: true,
  } as AuthenticatedUser;
}

export const sdk = new SDKServer();
