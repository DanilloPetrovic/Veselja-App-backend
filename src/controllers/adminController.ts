import { Request, Response } from "express";
import * as adminService from "../services/adminService";
import { AuthenticatedRequest } from "../types/AuthenticatedRequest";

export const login = async (req: Request, res: Response) => {
  const { name, password } = req.body;
  const { token } = await adminService.login({ name, password });

  res.status(200).json({ token });
};

export const getUserInfoById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userID = req.user?.id;

  if (!userID) {
    return res.status(400).json({ error: "User ID is missing" });
  }

  const user = await adminService.getUserInfoById(userID);

  res.status(200).json(user);
};
