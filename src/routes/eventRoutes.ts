import { Router } from "express";
import {
  createEvent,
  getEvents,
  getEventBySlug,
  updateEvent,
} from "../controllers/eventController";
import asyncHandler from "../middlewares/asyncHandler";
import authMiddleware from "../middlewares/authMiddleware";
import { upload } from "../middlewares/upload";

const router = Router();

router.post(
  "/createevent",
  authMiddleware,
  upload.single("coverImage"),
  asyncHandler(createEvent),
);
router.get("/events", asyncHandler(getEvents));
router.patch(
  "/events/:id",
  upload.single("coverImage"),
  asyncHandler(updateEvent),
);
router.get("/:slug", asyncHandler(getEventBySlug));

export default router;
