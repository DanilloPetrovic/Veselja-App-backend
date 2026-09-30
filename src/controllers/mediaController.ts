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
