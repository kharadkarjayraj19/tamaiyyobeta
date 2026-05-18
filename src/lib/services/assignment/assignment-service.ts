/**
 * Tamaiyyo — AssignmentService.
 *
 * Architecture:
 * - Orchestrates supplier assignment workflows
 * - Manages booking acceptance, rejection, vehicle/driver assignment
 * - Enforces business rules (ownership, status transitions, compatibility)
 * - Manages transactions
 * - Appends domain events for audit
 */

import { BookingStatus, VehicleStatus, DriverStatus, VehicleCategory } from "@prisma/client";
import {
  bookingRepository,
  type BookingDomain,
} from "@/lib/repositories/booking/booking-repository";
import {
  assignmentHistoryRepository,
  type CreateAssignmentHistoryData,
} from "@/lib/repositories/booking/assignment-history-repository";
import {
  vehicleRepository,
  type VehicleDomain,
} from "@/lib/repositories/vehicle/vehicle-repository";
import {
  driverRepository,
  type DriverDomain,
} from "@/lib/repositories/vehicle/driver-repository";
import {
  bookingPricingSnapshotRepository,
} from "@/lib/repositories/booking/booking-pricing-snapshot-repository";
import {
  domainEventRepository,
  type CreateDomainEventData,
} from "@/lib/repositories/event/domain-event-repository";
import prisma from "@/lib/db/prisma";
import { withTransaction } from "@/lib/db/transactions";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";

/**
 * DTO for supplier booking acceptance.
 */
export interface AcceptBookingRequest {
  bookingId: string;
  supplierId: string;
  notes?: string;
}

/**
 * DTO for supplier booking rejection.
 */
export interface RejectBookingRequest {
  bookingId: string;
  supplierId: string;
  reason: string;
}

/**
 * DTO for vehicle/driver assignment.
 */
export interface AssignVehicleDriverRequest {
  bookingId: string;
  supplierId: string;
  vehicleId: string;
  driverId: string;
}

/**
 * DTO for admin reassignment.
 */
export interface AdminReassignRequest {
  bookingId: string;
  newSupplierId: string;
  adminId: string;
  reason: string;
}

/**
 * AssignmentService — business logic for booking assignments.
 */
export class AssignmentService {
  /**
   * Get supplier booking queue.
   * Returns bookings available for supplier to view.
   */
  async getSupplierBookingQueue(
    supplierId: string,
    filters: {
      status?: BookingStatus;
      fromDate?: Date;
      toDate?: Date;
    },
    offset: number = 0,
    limit: number = 20
  ): Promise<{
    bookings: BookingDomain[];
    total: number;
    offset: number;
    limit: number;
  }> {
    // For REQUESTED bookings, show unassigned bookings (supplierId = null)
    // For other statuses, show bookings assigned to this supplier
    const bookingFilters: any = {};

    if (filters.status === "REQUESTED") {
      // Show unassigned bookings in REQUESTED status
      bookingFilters.status = "REQUESTED";
      bookingFilters.supplierId = null;
    } else {
      // Show bookings assigned to this supplier
      bookingFilters.supplierId = supplierId;
      if (filters.status) {
        bookingFilters.status = filters.status;
      }
    }

    if (filters.fromDate) bookingFilters.fromDate = filters.fromDate;
    if (filters.toDate) bookingFilters.toDate = filters.toDate;

    const [bookings, total] = await Promise.all([
      bookingRepository.list(bookingFilters, offset, limit),
      bookingRepository.count(bookingFilters),
    ]);

    return {
      bookings,
      total,
      offset,
      limit,
    };
  }

  /**
   * Supplier accepts a booking.
   * Transitions: REQUESTED → ACCEPTED
   * Creates initial assignment history with supplier only (no vehicle/driver yet).
   */
  async acceptBooking(
    request: AcceptBookingRequest
  ): Promise<BookingDomain> {
    return withTransaction(prisma, async (tx) => {
      const booking = await bookingRepository.findById(request.bookingId, tx);

      // Business rules for acceptance
      if (booking.status !== "REQUESTED") {
        throw new ValidationError(
          `Cannot accept booking in ${booking.status} status. Must be REQUESTED.`
        );
      }

      if (booking.supplierId !== null) {
        throw new ValidationError(
          "Booking already assigned to a supplier"
        );
      }

      // Update booking: assign supplier and change status to ACCEPTED
      const updatedBooking = await bookingRepository.updateStatusAndSupplier(
        request.bookingId,
        "ACCEPTED",
        request.supplierId,
        tx
      );

      // Create assignment history (supplier only, no vehicle/driver yet)
      const assignmentData: CreateAssignmentHistoryData = {
        bookingId: request.bookingId,
        supplierId: request.supplierId,
        assignedBy: "SUPPLIER",
      };

      await assignmentHistoryRepository.create(assignmentData, tx);

      // Append domain event
      const event: CreateDomainEventData = {
        eventType: "BOOKING_ACCEPTED",
        entityType: "BOOKING",
        entityId: request.bookingId,
        actorType: "SUPPLIER",
        actorId: request.supplierId,
        payload: {
          bookingRef: booking.bookingRef,
          notes: request.notes,
        },
      };

      await domainEventRepository.append(event, tx);

      return updatedBooking;
    });
  }

  /**
   * Supplier rejects a booking.
   * Transitions: REQUESTED → CANCELLED
   * Records cancellation reason.
   */
  async rejectBooking(
    request: RejectBookingRequest
  ): Promise<BookingDomain> {
    return withTransaction(prisma, async (tx) => {
      const booking = await bookingRepository.findById(request.bookingId, tx);

      // Business rules for rejection
      if (booking.status !== "REQUESTED") {
        throw new ValidationError(
          `Cannot reject booking in ${booking.status} status. Must be REQUESTED.`
        );
      }

      if (booking.supplierId !== null) {
        throw new ValidationError(
          "Booking already assigned to a supplier. Use cancellation instead."
        );
      }

      // Cancel booking with rejection reason
      const cancelledBooking = await bookingRepository.cancel(
        request.bookingId,
        "SUPPLIER",
        request.reason,
        tx
      );

      // Append domain event
      const event: CreateDomainEventData = {
        eventType: "BOOKING_REJECTED",
        entityType: "BOOKING",
        entityId: request.bookingId,
        actorType: "SUPPLIER",
        actorId: request.supplierId,
        payload: {
          bookingRef: booking.bookingRef,
          reason: request.reason,
        },
      };

      await domainEventRepository.append(event, tx);

      return cancelledBooking;
    });
  }

  /**
   * Assign vehicle and driver to booking.
   * Transitions: ACCEPTED → READY_FOR_TRIP
   * Validates ownership, status, and compatibility.
   */
  async assignVehicleDriver(
    request: AssignVehicleDriverRequest
  ): Promise<BookingDomain> {
    return withTransaction(prisma, async (tx) => {
      const booking = await bookingRepository.findById(request.bookingId, tx);

      // Business rules for assignment
      if (booking.status !== "ACCEPTED") {
        throw new ValidationError(
          `Cannot assign vehicle/driver to booking in ${booking.status} status. Must be ACCEPTED.`
        );
      }

      if (booking.supplierId !== request.supplierId) {
        throw new ForbiddenError(
          "Supplier does not own this booking"
        );
      }

      // Fetch vehicle and driver
      const vehicle = await vehicleRepository.findById(request.vehicleId, tx);
      const driver = await driverRepository.findById(request.driverId, tx);

      // Validate ownership
      this.validateVehicleOwnership(vehicle, request.supplierId);
      this.validateDriverOwnership(driver, request.supplierId);

      // Validate status
      this.validateVehicleStatus(vehicle);
      this.validateDriverStatus(driver);

      // Validate vehicle category compatibility
      await this.validateVehicleCompatibility(booking.id, vehicle, tx);

      // Get current assignment (if exists)
      const currentAssignment = await assignmentHistoryRepository.findCurrentByBookingId(
        request.bookingId,
        tx
      );

      // Mark current assignment as replaced if it exists
      if (currentAssignment) {
        await assignmentHistoryRepository.markAsReplaced(
          currentAssignment.id,
          tx
        );
      }

      // Create new assignment history with vehicle and driver
      const assignmentData: CreateAssignmentHistoryData = {
        bookingId: request.bookingId,
        supplierId: request.supplierId,
        vehicleId: request.vehicleId,
        driverId: request.driverId,
        assignedBy: "SUPPLIER",
      };

      await assignmentHistoryRepository.create(assignmentData, tx);

      // Update booking status to READY_FOR_TRIP
      const updatedBooking = await bookingRepository.update(
        request.bookingId,
        { status: "READY_FOR_TRIP" },
        tx
      );

      // Append domain event
      const eventType = currentAssignment
        ? "ASSIGNMENT_CHANGED"
        : "ASSIGNMENT_CREATED";

      const event: CreateDomainEventData = {
        eventType,
        entityType: "BOOKING",
        entityId: request.bookingId,
        actorType: "SUPPLIER",
        actorId: request.supplierId,
        payload: {
          bookingRef: booking.bookingRef,
          vehicleId: request.vehicleId,
          driverId: request.driverId,
          vehicleCategory: vehicle.category,
          driverName: driver.name,
        },
      };

      await domainEventRepository.append(event, tx);

      return updatedBooking;
    });
  }

  /**
   * Admin reassigns booking to a different supplier.
   * Marks current assignment as replaced, creates new assignment.
   */
  async adminReassignBooking(
    request: AdminReassignRequest
  ): Promise<BookingDomain> {
    return withTransaction(prisma, async (tx) => {
      const booking = await bookingRepository.findById(request.bookingId, tx);

      // Can only reassign if not already completed/cancelled
      if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
        throw new ValidationError(
          `Cannot reassign booking in ${booking.status} status`
        );
      }

      // Get current assignment
      const currentAssignment = await assignmentHistoryRepository.findCurrentByBookingId(
        request.bookingId,
        tx
      );

      if (currentAssignment) {
        // Mark current assignment as replaced
        await assignmentHistoryRepository.markAsReplaced(
          currentAssignment.id,
          tx
        );
      }

      // Create new assignment (supplier only, vehicle/driver cleared)
      const assignmentData: CreateAssignmentHistoryData = {
        bookingId: request.bookingId,
        supplierId: request.newSupplierId,
        assignedBy: "ADMIN",
      };

      await assignmentHistoryRepository.create(assignmentData, tx);

      // Update booking with new supplier, reset to ACCEPTED status
      const updatedBooking = await bookingRepository.updateStatusAndSupplier(
        request.bookingId,
        "ACCEPTED",
        request.newSupplierId,
        tx
      );

      // Append domain event
      const event: CreateDomainEventData = {
        eventType: "BOOKING_REASSIGNED",
        entityType: "BOOKING",
        entityId: request.bookingId,
        actorType: "ADMIN",
        actorId: request.adminId,
        payload: {
          bookingRef: booking.bookingRef,
          fromSupplierId: currentAssignment?.supplierId,
          toSupplierId: request.newSupplierId,
          reason: request.reason,
        },
      };

      await domainEventRepository.append(event, tx);

      return updatedBooking;
    });
  }

  /**
   * Validate vehicle ownership.
   */
  private validateVehicleOwnership(
    vehicle: VehicleDomain,
    supplierId: string
  ): void {
    if (vehicle.supplierId !== supplierId) {
      throw new ForbiddenError(
        "Vehicle does not belong to this supplier"
      );
    }
  }

  /**
   * Validate driver ownership.
   */
  private validateDriverOwnership(
    driver: DriverDomain,
    supplierId: string
  ): void {
    if (driver.supplierId !== supplierId) {
      throw new ForbiddenError(
        "Driver does not belong to this supplier"
      );
    }
  }

  /**
   * Validate vehicle status.
   */
  private validateVehicleStatus(vehicle: VehicleDomain): void {
    if (vehicle.deletedAt !== null) {
      throw new ValidationError("Vehicle is deleted");
    }

    if (vehicle.status !== "ACTIVE") {
      throw new ValidationError(
        `Vehicle status is ${vehicle.status}. Must be ACTIVE.`
      );
    }
  }

  /**
   * Validate driver status.
   */
  private validateDriverStatus(driver: DriverDomain): void {
    if (driver.deletedAt !== null) {
      throw new ValidationError("Driver is deleted");
    }

    if (driver.status !== "ACTIVE") {
      throw new ValidationError(
        `Driver status is ${driver.status}. Must be ACTIVE.`
      );
    }
  }

  /**
   * Validate vehicle category compatibility with booking.
   */
  private async validateVehicleCompatibility(
    bookingId: string,
    vehicle: VehicleDomain,
    tx: any
  ): Promise<void> {
    // Get pricing snapshot to check booked category
    const snapshot = await bookingPricingSnapshotRepository.findByBookingId(
      bookingId,
      tx
    );

    if (vehicle.category !== snapshot.category) {
      throw new ValidationError(
        `Vehicle category ${vehicle.category} does not match booked category ${snapshot.category}`
      );
    }
  }
}

/**
 * Singleton instance for use in API handlers.
 */
export const assignmentService = new AssignmentService();
