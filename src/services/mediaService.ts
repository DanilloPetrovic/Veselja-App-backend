import prisma from "../prisma";
import { uploadToR2 } from "../config/r2";
import createHttpError from "http-errors";
import crypto from "crypto";

interface UploadMediaInput {
  eventId: string;
  guestSessionId: string;
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
}

export const uploadEventMedia = async (input: UploadMediaInput) => {
  try {
    const { eventId, guestSessionId, file } = input;

    const fileExtension = file.originalname.split(".").pop();
    const uniqueFileName = `events/${eventId}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    const fileUrl = await uploadToR2(
      file.buffer,
      uniqueFileName,
      file.mimetype,
    );

    const fileType = file.mimetype.startsWith("video/") ? "VIDEO" : "IMAGE";

    const media = await prisma.media.create({
      data: {
        fileUrl,
        fileKey: uniqueFileName,
        fileType,
        fileSize: file.size,
        mimeType: file.mimetype,
        guestSessionId,
        eventId,
      },
    });

    return media;
  } catch (error: any) {
    throw createHttpError(500, `Greška pri uploadu medija: ${error.message}`);
  }
};

export const getMediaByEventId = async (eventId: string) => {
  try {
    const media = await prisma.media.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
    });

    return media;
  } catch (error: any) {
    throw createHttpError(
      500,
      `Greška pri preuzimanju medija: ${error.message}`,
    );
  }
};
