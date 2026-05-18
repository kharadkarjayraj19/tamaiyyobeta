/**
 * Tamaiyyo — Upload repository (placeholder implementation).
 *
 * Architecture:
 * - Prisma queries for upload metadata
 * - Files stored externally (S3/object storage)
 * - Supports soft-delete and archival
 */

import type { Upload } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";
import { NotFoundError } from "@/lib/errors";

/**
 * Domain type for Upload (ORM-agnostic).
 */
export interface UploadDomain {
  id: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  entityType: string;
  entityId: string;
  deletedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
}

/**
 * DTO for creating an upload record.
 */
export interface CreateUploadData {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  entityType: string;
  entityId: string;
}

/**
 * UploadRepository — Prisma data access for upload metadata.
 */
export class UploadRepository {
  /**
   * Find upload by ID.
   * @throws NotFoundError if upload doesn't exist
   */
  async findById(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<UploadDomain> {
    const client = tx ?? prisma;
    const upload = await client.upload.findUnique({
      where: { id },
    });

    if (!upload) {
      throw new NotFoundError("Upload", id);
    }

    return this.toDomain(upload);
  }

  /**
   * Find uploads by entity (polymorphic).
   */
  async findByEntity(
    entityType: string,
    entityId: string,
    includeDeleted: boolean = false,
    tx?: PrismaTransactionClient
  ): Promise<UploadDomain[]> {
    const client = tx ?? prisma;

    const where: any = {
      entityType,
      entityId,
    };

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    const uploads = await client.upload.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return uploads.map((u: Upload) => this.toDomain(u));
  }

  /**
   * Create upload metadata record.
   */
  async create(
    data: CreateUploadData,
    tx?: PrismaTransactionClient
  ): Promise<UploadDomain> {
    const client = tx ?? prisma;

    const upload = await client.upload.create({
      data,
    });

    return this.toDomain(upload);
  }

  /**
   * Soft-delete upload.
   */
  async softDelete(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<UploadDomain> {
    const client = tx ?? prisma;

    try {
      const upload = await client.upload.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return this.toDomain(upload);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2025"
      ) {
        throw new NotFoundError("Upload", id);
      }
      throw error;
    }
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(upload: Upload): UploadDomain {
    return {
      id: upload.id,
      storageKey: upload.storageKey,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      uploadedBy: upload.uploadedBy,
      entityType: upload.entityType,
      entityId: upload.entityId,
      deletedAt: upload.deletedAt,
      archivedAt: upload.archivedAt,
      createdAt: upload.createdAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const uploadRepository = new UploadRepository();
