/**
 * Tamaiyyo — Supplier onboarding validation schemas.
 *
 * Architecture:
 * - DTOs for supplier onboarding (draft, submission)
 * - Admin verification actions
 * - Aligns with supplier-operations.md §2
 */

import { z } from "zod";
import { commonSchemas } from "../index";

/**
 * Supplier onboarding draft schema.
 * Allows partial data submission before final submission.
 */
export const SupplierOnboardingDraftSchema = z.object({
  businessName: z.string().min(1).max(200).optional(),
  phone: commonSchemas.phone.optional(),
  email: commonSchemas.email.optional(),
  // Payout bank details (stored as JSON)
  payoutBankDetails: z
    .object({
      accountNumber: z.string().optional(),
      ifsc: z.string().optional(),
      accountHolderName: z.string().optional(),
      bankName: z.string().optional(),
    })
    .optional(),
});

export type SupplierOnboardingDraft = z.infer<
  typeof SupplierOnboardingDraftSchema
>;

/**
 * Supplier onboarding submission schema.
 * Requires all mandatory fields for verification.
 */
export const SupplierOnboardingSubmissionSchema = z.object({
  businessName: z.string().min(1).max(200),
  phone: commonSchemas.phone,
  email: commonSchemas.email.optional(),
  // Payout bank details (required for submission)
  payoutBankDetails: z.object({
    accountNumber: z.string().min(1),
    ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
      message: "Invalid IFSC code format",
    }),
    accountHolderName: z.string().min(1),
    bankName: z.string().min(1),
  }),
});

export type SupplierOnboardingSubmission = z.infer<
  typeof SupplierOnboardingSubmissionSchema
>;

/**
 * Admin supplier verification action schema.
 */
export const AdminSupplierVerificationSchema = z.object({
  supplierId: commonSchemas.uuid,
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().optional(), // Required for REJECT
});

export type AdminSupplierVerification = z.infer<
  typeof AdminSupplierVerificationSchema
>;

/**
 * Update supplier status schema (admin action).
 */
export const UpdateSupplierStatusSchema = z.object({
  supplierId: commonSchemas.uuid,
  status: z.enum(["ACTIVE", "SUSPENDED", "REJECTED"]),
  reason: z.string().optional(),
});

export type UpdateSupplierStatus = z.infer<typeof UpdateSupplierStatusSchema>;
