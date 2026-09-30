import { Router } from "express";
import { login } from "../controllers/adminController";
import asyncHandler from "../middlewares/asyncHandler";
import authMiddleware from "../middlewares/authMiddleware";
import { getUserInfoById } from "../controllers/adminController";

const router = Router();

router.post("/login", asyncHandler(login));
router.get("/me", authMiddleware, asyncHandler(getUserInfoById));

export default router;
