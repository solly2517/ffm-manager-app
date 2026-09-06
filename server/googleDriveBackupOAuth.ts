import { randomBytes } from "crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import { buildGoogleDriveAuthorizationUrl, saveGoogleDriveBackupConnection } from "./googleDriveBackup";
import { sdk } from "./_core/sdk";

const STATE_COOKIE = "ffm_google_drive_backup_state";
const ADMIN_EMAIL = "dr.seleam@gmail.com";
const appReturnUrl = "/?workspace=admin";
function query(req: Request, key: string) { const value = req.query[key]; return typeof value === "string" ? value : undefined; }
function cookieOptions() { return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 10 * 60 * 1000 }; }

export function registerGoogleDriveBackupOAuthRoutes(app: Express) {
  app.get("/api/oauth/google-drive/start", async (req: Request, res: Response) => {
    try { const user = await sdk.authenticateRequest(req); if (user.email?.toLowerCase() !== ADMIN_EMAIL && user.role !== "admin") return res.status(403).send("Administrator access required"); const state = `${user.id}.${randomBytes(24).toString("base64url")}`; res.cookie(STATE_COOKIE, state, cookieOptions()); return res.redirect(302, buildGoogleDriveAuthorizationUrl(state)); } catch { return res.redirect(302, `${appReturnUrl}&googleDrive=error`); }
  });
  app.get("/api/oauth/google-drive/callback", async (req: Request, res: Response) => {
    const code = query(req, "code"); const state = query(req, "state"); const expected = parseCookieHeader(req.headers.cookie ?? "")[STATE_COOKIE]; res.clearCookie(STATE_COOKIE, cookieOptions()); if (!code || !state || state !== expected) return res.redirect(302, `${appReturnUrl}&googleDrive=error`); const userId = Number(state.split(".")[0]); if (!Number.isInteger(userId) || userId <= 0) return res.redirect(302, `${appReturnUrl}&googleDrive=error`); try { await saveGoogleDriveBackupConnection(userId, code); return res.redirect(302, `${appReturnUrl}&googleDrive=connected`); } catch { return res.redirect(302, `${appReturnUrl}&googleDrive=error`); }
  });
}
