import prisma from "../prisma";
import { uploadToR2, deleteFromR2 } from "../config/r2";
import createHttpError from "http-errors";
import crypto from "crypto";
import axios from "axios";
import JSZip from "jszip";
import sharp from "sharp";
import { Response } from "express";

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

interface ProcessedImage {
  fullBuffer: Buffer;
  thumbBuffer: Buffer;
  mimetype: string;
}

const processGalleryImage = async (buffer: Buffer): Promise<ProcessedImage> => {
  const fullBuffer = await sharp(buffer)
    .rotate()
    .resize(1920, undefined, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const thumbBuffer = await sharp(buffer)
    .rotate()
    .resize(400, undefined, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer();

  return {
    fullBuffer,
    thumbBuffer,
    mimetype: "image/webp",
  };
};

export const uploadEventMedia = async (input: UploadMediaInput) => {
  try {
    const { eventId, guestSessionId, file } = input;

    let finalBuffer = file.buffer;
    let finalMimeType = file.mimetype;
    let finalExtension = file.originalname.split(".").pop();
    let thumbnailUrl: string | null = null;

    const isImage = file.mimetype.startsWith("image/");

    if (isImage) {
      const processed = await processGalleryImage(file.buffer);
      finalBuffer = processed.fullBuffer;
      finalMimeType = processed.mimetype;
      finalExtension = "webp";

      const thumbKey = `events/${eventId}/thumbs/${Date.now()}-${crypto.randomUUID()}.webp`;
      thumbnailUrl = await uploadToR2(
        processed.thumbBuffer,
        thumbKey,
        "image/webp",
      );
    }

    const uniqueFileName = `events/${eventId}/${Date.now()}-${crypto.randomUUID()}.${finalExtension}`;
    const fileUrl = await uploadToR2(
      finalBuffer,
      uniqueFileName,
      finalMimeType,
    );

    const fileType = file.mimetype.startsWith("video/") ? "VIDEO" : "IMAGE";

    const media = await prisma.media.create({
      data: {
        fileUrl,
        thumbnailUrl: thumbnailUrl || fileUrl,
        fileKey: uniqueFileName,
        fileType,
        fileSize: finalBuffer.length,
        mimeType: finalMimeType,
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

export const deleteMedia = async (
  mediaId: string,
  guestSessionId?: string,
  pinCode?: string,
) => {
  try {
    if (!mediaId) {
      throw createHttpError(400, "ID medija je obavezan.");
    }

    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      include: { event: true },
    });

    if (!media) {
      throw createHttpError(404, "Medij nije pronađen.");
    }

    const isOwner = media.guestSessionId === guestSessionId;

    if (!isOwner) {
      if (!pinCode) {
        throw createHttpError(
          403,
          "Za brisanje tuđe uspomene neophodno je uneti PIN kod.",
        );
      }

      if (media.event?.pinCode !== pinCode) {
        throw createHttpError(401, "Pogrešan PIN kod događaja.");
      }
    }

    if (media.fileKey) {
      await deleteFromR2(media.fileKey);
    }

    const deletedMedia = await prisma.media.delete({
      where: { id: mediaId },
    });

    return deletedMedia;
  } catch (error: any) {
    if (error.status) {
      throw error;
    }

    if (error.code === "P2025") {
      throw createHttpError(404, "Medij nije pronađen.");
    }

    throw createHttpError(500, `Greška pri brisanju medija: ${error.message}`);
  }
};

export const getMediaDownloadStream = async (
  fileUrl: string,
  fileName?: string,
) => {
  try {
    if (!fileUrl) {
      throw createHttpError(400, "URL fajla je obavezan.");
    }

    const response = await axios({
      url: fileUrl,
      method: "GET",
      responseType: "stream",
    });

    const downloadFileName = fileName || `uspomena-${Date.now()}`;

    return {
      stream: response.data,
      contentType: response.headers["content-type"],
      filename: downloadFileName,
    };
  } catch (error: any) {
    if (error.status) throw error;
    throw createHttpError(
      500,
      `Greška pri dobijanju strima medija: ${error.message}`,
    );
  }
};

export const downloadAllEventMediaZip = async (
  eventId: string,
  res: Response,
) => {
  try {
    if (!eventId) {
      throw createHttpError(400, "ID događaja je obavezan.");
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw createHttpError(404, "Događaj nije pronađen.");
    }

    const mediaList = await prisma.media.findMany({
      where: { eventId },
    });

    if (!mediaList || mediaList.length === 0) {
      throw createHttpError(
        404,
        "Nema medija za preuzimanje na ovom događaju.",
      );
    }

    const zip = new JSZip();

    for (let i = 0; i < mediaList.length; i++) {
      const item = mediaList[i];
      try {
        const response = await axios({
          url: item.fileUrl,
          method: "GET",
          responseType: "arraybuffer",
        });

        const extension =
          item.fileType === "VIDEO"
            ? "mp4"
            : item.fileUrl.split(".").pop()?.split("?")[0] || "jpg";

        const fileNameInZip = `uspomena-${i + 1}-${item.id}.${extension}`;

        zip.file(fileNameInZip, response.data);
      } catch (err: any) {
        console.error(
          `Greška pri preuzimanju fajla ${item.id} sa R2:`,
          err.message,
        );
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const safeTitle = (event.title || "veselje").replace(
      /[^a-zA-Z0-9-_]/g,
      "_",
    );
    const zipFilename = `${safeTitle}-uspomene-${Date.now()}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${zipFilename}"`,
    );

    return res.send(zipBuffer);
  } catch (error: any) {
    if (error.status) throw error;
    throw createHttpError(
      500,
      `Greška pri kreiranju ZIP arhive: ${error.message}`,
    );
  }
};
