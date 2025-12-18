import type { Response } from "express";
import { prisma } from "@repo/database";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";

export const getUser = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user = {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
      image: existingUser.image,
    };

    return res.status(200).json({
      message: "User fetched successfully",
      data: user,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching user:", errorMessage);
    return res.status(500).json({
      message: "Internal server error",
      error: errorMessage,
    });
  }
}
