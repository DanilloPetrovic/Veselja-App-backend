import prisma from "../prisma";
import createHttpError from "http-errors";
import crypto from "crypto";
import QRCode from "qrcode";
import { uploadToR2 } from "../config/r2";

interface CreateEventInput {
  title: string;
  slug: string;
  adminId: string;
  eventDate: string | Date;
  welcomeMessage?: string;
  coverImageFile?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  };
}

export interface GetEventsFilters {
  creatorFilter?: string;
  statusFilter?: "all" | "today" | "upcoming" | "finished";
  sortOrder?: "newest" | "oldest";
}

interface UpdateEventInput {
  title?: string;
  slug?: string;
  eventDate?: string | Date;
  welcomeMessage?: string;
  coverImageFile?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  };
}

export const getEvents = async (filters: GetEventsFilters = {}) => {
  try {
    const {
      creatorFilter = "all",
      statusFilter = "all",
      sortOrder = "newest",
    } = filters;

    const where: any = {};

    if (creatorFilter && creatorFilter !== "all") {
      where.adminId = creatorFilter;
    }

    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    if (statusFilter === "today") {
      where.eventDate = {
        gte: startOfToday,
        lte: endOfToday,
      };
    } else if (statusFilter === "upcoming") {
      where.eventDate = {
        gt: endOfToday,
      };
    } else if (statusFilter === "finished") {
      where.eventDate = {
        lt: startOfToday,
      };
    }

    const orderBy = {
      createdAt: sortOrder === "oldest" ? ("asc" as const) : ("desc" as const),
    };

    const events = await prisma.event.findMany({
      where,
      orderBy,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return events;
  } catch (error: any) {
    throw createHttpError(
      500,
      `Neuspešno dohvatanje događaja: ${error.message}`,
    );
  }
};

export const createEvent = async (data: CreateEventInput) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
    const eventUrl = `${frontendUrl}/${data.slug}`;

    const qrCodeUrl = await QRCode.toDataURL(eventUrl);

    let coverImageUrl: string | null = null;

    if (data.coverImageFile) {
      const ext = data.coverImageFile.originalname.split(".").pop() || "jpg";
      const fileKey = `covers/${data.slug}-${Date.now()}.${ext}`;

      coverImageUrl = await uploadToR2(
        data.coverImageFile.buffer,
        fileKey,
        data.coverImageFile.mimetype,
      );
    }

    const event = await prisma.event.create({
      data: {
        title: data.title,
        slug: data.slug,
        pinCode: crypto.randomInt(0, 10000).toString().padStart(4, "0"),
        adminId: data.adminId,
        welcomeMessage: data.welcomeMessage,
        coverImageUrl: coverImageUrl,
        qrCodeUrl: qrCodeUrl,
        eventDate: new Date(data.eventDate),
      },
    });

    return event;
  } catch (error: any) {
    if (error.code === "P2002") {
      throw createHttpError(400, "Event sa ovim slug-om već postoji.");
    }
    throw createHttpError(500, `Failed to create event: ${error.message}`);
  }
};

export const getEventBySlug = async (slug: string) => {
  try {
    if (!slug) {
      throw createHttpError(400, "Slug je obavezan.");
    }

    const event = await prisma.event.findUnique({
      where: {
        slug: slug,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!event) {
      throw createHttpError(404, "Događaj sa datim slug-om nije pronađen.");
    }

    return event;
  } catch (error: any) {
    if (error.status) {
      throw error;
    }

    throw createHttpError(
      500,
      `Greška pri dohvatanju događaja: ${error.message}`,
    );
  }
};

export const updateEvent = async (id: string, data: UpdateEventInput) => {
  try {
    if (!id) {
      throw createHttpError(400, "ID događaja je obavezan.");
    }

    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      throw createHttpError(404, "Događaj nije pronađen.");
    }

    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.welcomeMessage !== undefined)
      updateData.welcomeMessage = data.welcomeMessage;
    if (data.eventDate !== undefined)
      updateData.eventDate = new Date(data.eventDate);

    if (data.slug && data.slug !== existingEvent.slug) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
      const newEventUrl = `${frontendUrl}/${data.slug}`;

      updateData.slug = data.slug;
      updateData.qrCodeUrl = await QRCode.toDataURL(newEventUrl);
    }

    if (data.coverImageFile) {
      const targetSlug = data.slug || existingEvent.slug;
      const ext = data.coverImageFile.originalname.split(".").pop() || "jpg";
      const fileKey = `covers/${targetSlug}-${Date.now()}.${ext}`;

      updateData.coverImageUrl = await uploadToR2(
        data.coverImageFile.buffer,
        fileKey,
        data.coverImageFile.mimetype,
      );
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedEvent;
  } catch (error: any) {
    if (error.status) {
      throw error;
    }
    if (error.code === "P2002") {
      throw createHttpError(400, "Event sa ovim slug-om već postoji.");
    }
    throw createHttpError(
      500,
      `Greška pri ažuriranju događaja: ${error.message}`,
    );
  }
};
