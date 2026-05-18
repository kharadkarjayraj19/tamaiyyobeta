/**
 * Tamaiyyo — SupplierService.
 *
 * Architecture:
 * - Orchestrates supplier onboarding workflows
 * - Owns business rules and status transitions
 * - Manages transactions
 * - Never exposes Prisma directly
 */

import { SupplierAccountStatus } from "@prisma/client";
import {
  supplierAccountRepository,
  type SupplierAccountDomain,
  type CreateSupplierAccountData,
  type UpdateSupplierAccountData,
} from "@/lib/repositories/identity/supplier-repository";
import prisma from "@/lib/db/prisma";
import { withTransaction } from "@/lib/db/transactions";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "@/lib/errors";

/**
 * DTO for supplier onboarding draft save.
 */
export interface SaveSupplierOnboardingDraft {
  identityId: string; // Temporary placeholder until Better Auth integrated
  businessName?: string;
  payoutBankDetails?: Record<string, unknown>;
}

/**
 * DTO for supplier onboarding submission.
 */
export interface SubmitSupplierOnboarding {
  identityId: string; // Temporary placeholder
  businessName: string;
  payoutBankDetails: Record<string, unknown>;
}

/**
 * SupplierService — business logic for supplier operations.
 */
export class SupplierService {
  /**
   * Save supplier onboarding draft.
   * Creates or updates supplier account in PENDING_VERIFICATION state.
   */
  async saveOnboardingDraft(
    data: SaveSupplierOnboardingDraft
  ): Promise<SupplierAccountDomain> {
    return withTransaction(prisma, async (tx) => {
      // Check if supplier already exists for this identity
      const existing = await supplierAccountRepository.findByIdentityId(
        data.identityId,
        tx
      );

      if (existing) {
        // Update draft if still in pending verification
        if (existing.status !== "PENDING_VERIFICATION") {
          throw new ForbiddenError(
            "Cannot update onboarding draft for verified supplier"
          );
        }

        // Update with provided fields
        const updateData: UpdateSupplierAccountData = {};
        if (data.businessName) updateData.businessName = data.businessName;
        if (data.payoutBankDetails)
          updateData.payoutBankDetails = data.payoutBankDetails;

        return supplierAccountRepository.update(existing.id, updateData, tx);
      }

      // Create new draft supplier account
      const createData: CreateSupplierAccountData = {
        identityId: data.identityId,
        businessName: data.businessName || "Draft Supplier",
        payoutBankDetails: data.payoutBankDetails,
      };

      return supplierAccountRepository.create(createData, tx);
    });
  }

  /**
   * Submit supplier onboarding for admin verification.
   * Validates all required fields and transitions to PENDING_VERIFICATION.
   */
  async submitOnboarding(
    data: SubmitSupplierOnboarding
  ): Promise<SupplierAccountDomain> {
    return withTransaction(prisma, async (tx) => {
      // Validate required fields
      if (!data.businessName || data.businessName.trim().length === 0) {
        throw new ValidationError("Business name is required for submission");
      }

      if (!data.payoutBankDetails) {
        throw new ValidationError(
          "Payout bank details are required for submission"
        );
      }

      // Check if supplier exists
      const existing = await supplierAccountRepository.findByIdentityId(
        data.identityId,
        tx
      );

      if (existing) {
        // Can only submit if in PENDING_VERIFICATION
        if (existing.status !== "PENDING_VERIFICATION") {
          throw new ForbiddenError(
            "Supplier account already submitted or verified"
          );
        }

        // Update with submission data
        return supplierAccountRepository.update(
          existing.id,
          {
            businessName: data.businessName,
            payoutBankDetails: data.payoutBankDetails,
          },
          tx
        );
      }

      // Create new supplier account in PENDING_VERIFICATION
      const createData: CreateSupplierAccountData = {
        identityId: data.identityId,
        businessName: data.businessName,
        payoutBankDetails: data.payoutBankDetails,
      };

      return supplierAccountRepository.create(createData, tx);
    });
  }

  /**
   * Get supplier account by ID.
   */
  async getSupplierById(id: string): Promise<SupplierAccountDomain> {
    return supplierAccountRepository.findById(id);
  }

  /**
   * Get supplier account by identity ID.
   */
  async getSupplierByIdentityId(
    identityId: string
  ): Promise<SupplierAccountDomain | null> {
    return supplierAccountRepository.findByIdentityId(identityId);
  }

  /**
   * List suppliers with filters.
   */
  async listSuppliers(
    filters: {
      status?: SupplierAccountStatus;
      search?: string;
    },
    offset: number = 0,
    limit: number = 20
  ): Promise<{
    suppliers: SupplierAccountDomain[];
    total: number;
    offset: number;
    limit: number;
  }> {
    const [suppliers, total] = await Promise.all([
      supplierAccountRepository.list(filters, offset, limit),
      supplierAccountRepository.count(filters),
    ]);

    return {
      suppliers,
      total,
      offset,
      limit,
    };
  }

  /**
   * Update supplier status (admin action).
   * Manages status transitions and records approval metadata.
   */
  async updateSupplierStatus(
    supplierId: string,
    status: SupplierAccountStatus,
    adminId: string,
    reason?: string
  ): Promise<SupplierAccountDomain> {
    return withTransaction(prisma, async (tx) => {
      const supplier = await supplierAccountRepository.findById(supplierId, tx);

      // Business rules for status transitions
      if (status === "ACTIVE") {
        // Can only activate from PENDING_VERIFICATION or SUSPENDED
        if (
          supplier.status !== "PENDING_VERIFICATION" &&
          supplier.status !== "SUSPENDED"
        ) {
          throw new ValidationError(
            `Cannot activate supplier from ${supplier.status} status`
          );
        }

        // Record approval
        return supplierAccountRepository.update(
          supplierId,
          {
            status: "ACTIVE",
            verificationApprovedAt: new Date(),
            verificationApprovedBy: adminId,
          },
          tx
        );
      }

      if (status === "SUSPENDED") {
        // Can only suspend ACTIVE suppliers
        if (supplier.status !== "ACTIVE") {
          throw new ValidationError(
            `Cannot suspend supplier from ${supplier.status} status`
          );
        }

        return supplierAccountRepository.update(
          supplierId,
          { status: "SUSPENDED" },
          tx
        );
      }

      if (status === "REJECTED") {
        // Can reject from PENDING_VERIFICATION
        if (supplier.status !== "PENDING_VERIFICATION") {
          throw new ValidationError(
            `Cannot reject supplier from ${supplier.status} status`
          );
        }

        return supplierAccountRepository.update(
          supplierId,
          { status: "REJECTED" },
          tx
        );
      }

      throw new ValidationError(`Invalid status transition to ${status}`);
    });
  }
}

/**
 * Singleton instance for use in API handlers.
 */
export const supplierService = new SupplierService();
