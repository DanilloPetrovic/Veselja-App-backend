import { Router } from "express";
import {
  uploadMedia,
  uploadMultipleMedia,
  getEventMedia,
} from "../controllers/mediaController";
import asyncHandler from "../middlewares/asyncHandler";
import { upload } from "../middlewares/upload";

const router = Router();

router.post("/upload", upload.single("file"), asyncHandler(uploadMedia));

router.post(
  "/upload-many",
  upload.array("files", 10),
  asyncHandler(uploadMultipleMedia),
);

router.get("/event/:eventId", asyncHandler(getEventMedia));

export default router;
