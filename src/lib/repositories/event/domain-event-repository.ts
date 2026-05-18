/**
 * Tamaiyyo — DomainEvent repository.
 *
 * Architecture:
 * - Append-only event log for audit/timeline
 * - Generic event payload structure
 * - Polymorphic entity linkage
 */

import type { DomainEvent, ActorType } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";

/**
 * Domain type for DomainEvent (ORM-agnostic).
 */
export interface DomainEventDomain {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorType: ActorType;
  actorId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

/**
 * DTO for creating a domain event.
 */
export interface CreateDomainEventData {
  eventType: string;
  entityType: string;
  entityId: string;
  actorType: ActorType;
  actorId: string;
  payload: Record<string, unknown>;
}

/**
 * DomainEventRepository — Prisma data access for domain events.
 */
export class DomainEventRepository {
  /**
   * Append a domain event to the log.
   */
  async append(
    data: CreateDomainEventData,
    tx?: PrismaTransactionClient
  ): Promise<DomainEventDomain> {
    const client = tx ?? prisma;

    const event = await client.domainEvent.create({
      data: {
        eventType: data.eventType,
        entityType: data.entityType,
        entityId: data.entityId,
        actorType: data.actorType,
        actorId: data.actorId,
        payload: data.payload as any,
        occurredAt: new Date(),
      },
    });

    return this.toDomain(event);
  }

  /**
   * Find events by entity.
   */
  async findByEntity(
    entityType: string,
    entityId: string,
    tx?: PrismaTransactionClient
  ): Promise<DomainEventDomain[]> {
    const client = tx ?? prisma;

    const events = await client.domainEvent.findMany({
      where: { entityType, entityId },
      orderBy: { occurredAt: "asc" },
    });

    return events.map((e: DomainEvent) => this.toDomain(e));
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(event: DomainEvent): DomainEventDomain {
    return {
      id: event.id,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      actorType: event.actorType,
      actorId: event.actorId || "",
      payload: event.payload as Record<string, unknown>,
      occurredAt: event.occurredAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const domainEventRepository = new DomainEventRepository();
