import type { Request, Response } from "express";
import { signInSchema, signUpSchema } from "@packages/types/index"
import { prisma } from "@repo/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.ts"


const JWT_SECRET = process.env.JWT_SECRET ?? "superSecretToken";

export const authSession = async (req: Request, res: Response) => {
  try {
    const session = auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    return res.json(session);
  } catch (err) {
    return res.status(500).json({
      message: "Failed to get session",
      error: (err as Error).message,
    })
  }
}


export const userSignUp = async (req: Request, res: Response) => {
  const { success, data } = signUpSchema.safeParse(req.body);

  if (!success || !data) {
    return res.status(411).json({
      "message": "Invalid inputs please try again."
    })
  }

  try {
    const existingUser = prisma.user.findOne({
      where: {
        email: data.email,
      }
    });

    if (existingUser) {
      return res.status(400).json({
        "message": "User already exists."
      });
    };

    const hashedPassword = bcrypt.hash(data.password, 10);

    const user = prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: hashedPassword,
      }
    });

    if (!user) {
      return res.status(400).json({
        "message": "Failed to create user."
      });
    };

    const token = jwt.sign(user.id, JWT_SECRET)

    return res.status(201).json({
      message: "User created successfully.",
      data: token
    });

  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
      error: (err as Error).message,

    });
  }
};


export const userSignIn = async (req: Request, res: Response) => {
  const { success, data } = signInSchema.safeParse(req.body);

  if (!success || !data) {
    return res.status(411).json({
      message: "Invalid inputs please try again"
    });
  };

  try {
    const existingUser = await prisma.user.findOne({
      where: {
        email: data.email,
      }
    });

    if (!existingUser) {
      return res.status(400).json({
        message: "User not found",
      });
    };

    const isPasswordValid = bcrypt.compare(data.password, existingUser.password);

    if (!isPasswordValid) {
      return res.status(411).json({
        message: "Invalid password,cannot sign in user"
      });
    };

    const token = jwt.sign(existingUser.id, JWT_SECRET);

    return res.status(200).json({
      message: "User login successfull",
      data: token,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
      error: (err as Error).message,
    })
  }
}
