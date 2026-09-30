import { Request, Response } from "express";
import * as eventService from "../services/eventService";

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { title, slug, adminId, eventDate, welcomeMessage } = req.body;

    const coverImageFile = req.file
      ? {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
        }
      : undefined;

    const event = await eventService.createEvent({
      title,
      slug,
      adminId,
      eventDate,
      welcomeMessage,
      coverImageFile,
    });

    return res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.log(error);
  }
};

export const getEvents = async (req: Request, res: Response) => {
  try {
    const { creatorFilter, statusFilter, sortOrder } = req.query;

    const events = await eventService.getEvents({
      creatorFilter: creatorFilter as string,
      statusFilter: statusFilter as any,
      sortOrder: sortOrder as any,
    });

    return res.status(200).json(events);
  } catch (error) {
    console.log(error);
  }
};

export const getEventBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const event = await eventService.getEventBySlug(slug);

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.log(error);
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, slug, eventDate, welcomeMessage } = req.body;

    const coverImageFile = req.file
      ? {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
        }
      : undefined;

    const updatedEvent = await eventService.updateEvent(id, {
      title,
      slug,
      eventDate,
      welcomeMessage,
      coverImageFile,
    });

    return res.status(200).json({
      success: true,
      message: "Događaj je uspešno ažuriran.",
      data: updatedEvent,
    });
  } catch (error) {
    console.log(error);
  }
};
