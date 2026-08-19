import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  authTimedOut: boolean;
};

const AUTH_CONTEXT_TIMEOUT_MS = 10_000;

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let authTimedOut = false;
  try {
    user = await Promise.race([
      sdk.authenticateRequest(opts.req),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error("Authentication context timed out")), AUTH_CONTEXT_TIMEOUT_MS);
        timer.unref?.();
      }),
    ]);
  } catch (error) {
    // Authentication is optional for public procedures. A bounded timeout keeps
    // the tRPC endpoint JSON-shaped instead of allowing the gateway to emit HTML.
    authTimedOut = error instanceof Error && error.message === "Authentication context timed out";
    console.warn("[Auth] Request authentication unavailable:", error instanceof Error ? error.message : error);
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
    authTimedOut,
  };
}
