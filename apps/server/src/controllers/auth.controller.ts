import type { Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.ts"

export const authSession = async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({
        message: "No active session found",
      });
    }

    return res.json(session);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    console.error("Error getting session:", errorMessage);
    return res.status(500).json({
      message: "Failed to get session",
      error: errorMessage,
    });
  }
}
