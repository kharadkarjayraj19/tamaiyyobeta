/**
 * Tamaiyyo — AssignmentHistory repository.
 *
 * Architecture:
 * - Prisma queries for assignment history
 * - Tracks vehicle/driver assignments per booking
 * - Supports assignment changes (replacedAt timestamp)
 * - Aligns with booking-domain-model.md §7
 */

import type { AssignmentHistory, ActorType } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";

/**
 * Domain type for AssignmentHistory (ORM-agnostic).
 */
export interface AssignmentHistoryDomain {
  id: string;
  bookingId: string;
  supplierId: string;
  vehicleId: string | null;
  driverId: string | null;
  assignedAt: Date;
  replacedAt: Date | null;
  assignedBy: ActorType;
  createdAt: Date;
}

/**
 * DTO for creating an assignment history record.
 */
export interface CreateAssignmentHistoryData {
  bookingId: string;
  supplierId: string;
  vehicleId?: string;
  driverId?: string;
  assignedBy: ActorType;
}

/**
 * AssignmentHistoryRepository — Prisma data access for assignment history.
 */
export class AssignmentHistoryRepository {
  /**
   * Find current assignment for a booking.
   * Current assignment has replacedAt = null.
   */
  async findCurrentByBookingId(
    bookingId: string,
    tx?: PrismaTransactionClient
  ): Promise<AssignmentHistoryDomain | null> {
    const client = tx ?? prisma;

    const assignment = await client.assignmentHistory.findFirst({
      where: {
        bookingId,
        replacedAt: null,
      },
      orderBy: {
        assignedAt: "desc",
      },
    });

    return assignment ? this.toDomain(assignment) : null;
  }

  /**
   * Find all assignments for a booking (full history).
   */
  async findByBookingId(
    bookingId: string,
    tx?: PrismaTransactionClient
  ): Promise<AssignmentHistoryDomain[]> {
    const client = tx ?? prisma;

    const assignments = await client.assignmentHistory.findMany({
      where: { bookingId },
      orderBy: { assignedAt: "asc" },
    });

    return assignments.map((a: AssignmentHistory) => this.toDomain(a));
  }

  /**
   * Create assignment history record.
   */
  async create(
    data: CreateAssignmentHistoryData,
    tx?: PrismaTransactionClient
  ): Promise<AssignmentHistoryDomain> {
    const client = tx ?? prisma;

    const assignment = await client.assignmentHistory.create({
      data: {
        bookingId: data.bookingId,
        supplierId: data.supplierId,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        assignedBy: data.assignedBy,
        assignedAt: new Date(),
      },
    });

    return this.toDomain(assignment);
  }

  /**
   * Mark current assignment as replaced.
   * Sets replacedAt timestamp on current assignment.
   */
  async markAsReplaced(
    assignmentId: string,
    tx?: PrismaTransactionClient
  ): Promise<AssignmentHistoryDomain> {
    const client = tx ?? prisma;

    const assignment = await client.assignmentHistory.update({
      where: { id: assignmentId },
      data: { replacedAt: new Date() },
    });

    return this.toDomain(assignment);
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(
    assignment: AssignmentHistory
  ): AssignmentHistoryDomain {
    return {
      id: assignment.id,
      bookingId: assignment.bookingId,
      supplierId: assignment.supplierId,
      vehicleId: assignment.vehicleId,
      driverId: assignment.driverId,
      assignedAt: assignment.assignedAt,
      replacedAt: assignment.replacedAt,
      assignedBy: assignment.assignedBy,
      createdAt: assignment.createdAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const assignmentHistoryRepository = new AssignmentHistoryRepository();
