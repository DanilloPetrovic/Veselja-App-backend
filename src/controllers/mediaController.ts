import { Request, Response, NextFunction } from "express";
import * as mediaService from "../services/mediaService";
import createHttpError from "http-errors";

export const uploadMedia = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { eventId, guestSessionId } = req.body;

    if (!req.file) {
      throw createHttpError(400, "Fajl nije prosleđen.");
    }

    if (!eventId || !guestSessionId) {
      throw createHttpError(400, "eventId i guestSessionId su obavezna polja.");
    }

    const media = await mediaService.uploadEventMedia({
      eventId,
      guestSessionId,
      file: {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(eventId).emit("media_uploaded", media);
    }

    return res.status(201).json({
      success: true,
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadMultipleMedia = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { eventId, guestSessionId } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw createHttpError(400, "Nijedan fajl nije prosleđen.");
    }

    if (!eventId || !guestSessionId) {
      throw createHttpError(400, "eventId i guestSessionId su obavezna polja.");
    }

    const uploadPromises = files.map((file) =>
      mediaService.uploadEventMedia({
        eventId,
        guestSessionId,
        file: {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
      }),
    );

    const mediaList = await Promise.all(uploadPromises);

    const io = req.app.get("io");
    if (io) {
      mediaList.forEach((mediaItem) => {
        io.to(eventId).emit("media_uploaded", mediaItem);
      });
    }

    return res.status(201).json({
      success: true,
      count: mediaList.length,
      data: mediaList,
    });
  } catch (error) {
    next(error);
  }
};

export const getEventMedia = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { eventId } = req.params;

    const media = await mediaService.getMediaByEventId(eventId);

    return res.status(200).json({
      success: true,
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMedia = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const guestSessionId =
      (req.headers["x-guest-session-id"] as string) ||
      req.body?.guestSessionId ||
      (req.query?.guestSessionId as string);

    const deletedMedia = await mediaService.deleteMedia(id, guestSessionId);

    const io = req.app.get("io");

    if (io && deletedMedia?.eventId) {
      io.to(deletedMedia.eventId).emit("media_deleted", deletedMedia.id);
    }

    res.status(200).json({
      message: "Fajl je uspešno obrisan.",
      media: deletedMedia,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadMedia = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const fileUrl = req.query.url as string;
    const filename = req.query.filename as string;

    const {
      stream,
      contentType,
      filename: downloadName,
    } = await mediaService.getMediaDownloadStream(fileUrl, filename);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(downloadName as string)}"`,
    );

    if (contentType) {
      res.setHeader("Content-Type", contentType as string);
    }

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const downloadAllMediaZip = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { eventId } = req.params;

    await mediaService.downloadAllEventMediaZip(eventId, res);
  } catch (error) {
    next(error);
  }
};
