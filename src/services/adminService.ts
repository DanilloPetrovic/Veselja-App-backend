import prisma from "../utils/prisma";
import jwt from "jsonwebtoken";
import createHttpError from "http-errors";
import bcrypt from "bcrypt";

export const login = async (data: { name: string; password: string }) => {
  const user = await prisma.admin.findFirst({
    where: { name: data.name },
  });

  if (!user) {
    throw createHttpError(401, "Invalid credentials");
  }

  const isPasswordValid = await bcrypt.compare(
    data.password,
    user.passwordHash,
  );

  if (!isPasswordValid) {
    throw createHttpError(401, "Invalid credentials");
  }

  const token = jwt.sign(
    { id: user.id, name: user.name },
    process.env.JWT_SECRET!,
    { expiresIn: "1d" },
  );

  return { token };
};

export const getUserInfoById = async (userID: string) => {
  const user = await prisma.admin.findUnique({
    where: { id: userID },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  return user;
};
