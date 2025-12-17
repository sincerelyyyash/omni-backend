import type { Request, Response } from "express";
import { prisma } from "@repo/database";


export const getUser = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  try {
    const existingUser = await prisma.user.findOne({
      where: {
        id: userId,
      }
    });

    if (!existingUser) {
      return res.status(400).json({
        message: "User not found",
      });
    };

    const user = {
      id: existingUser.id,
      email: existingUser.email,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
    };

    return res.status(200).json({
      message: "User fetched successfully",
      data: user,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
      error: (err as Error).message,
    })
  }
}
