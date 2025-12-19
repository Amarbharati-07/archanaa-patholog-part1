import { storage } from "./storage";
import { 
  sendBookingConfirmationEmail, 
  sendReportReadyEmail, 
  sendPaymentReceivedEmail,
  sendSampleCollectedEmail,
  sendAdminNotificationEmail,
  type BookingEmailData
} from "./email";
import type { Booking, Patient, Test, HealthPackage } from "@shared/schema";

interface NotificationData {
  type: string;
  title: string;
  message: string;
  recipientType: string;
  patientId?: string | null;
  adminId?: string | null;
  bookingId?: string | null;
  reportId?: string | null;
  metadata?: Record<string, any> | null;
  isRead?: boolean;
  readAt?: Date | null;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@archanapathology.com";

export class NotificationService {
  
  async createBookingNotifications(
    booking: Booking,
    patient: Patient | null,
    tests: Test[],
    healthPackage: HealthPackage | undefined,
    totalAmount: number
  ): Promise<void> {
    const patientName = patient?.name || booking.guestName || "Valued Customer";
    const email = booking.email || patient?.email;
    
    const slotDate = new Date(booking.slot).toLocaleDateString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
    const slotTime = new Date(booking.slot).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    });
    
    const patientNotification: NotificationData = {
      type: "booking_created",
      title: "Booking Confirmed",
      message: `Your ${booking.type === 'home_collection' ? 'home collection' : 'lab visit'} is scheduled for ${slotDate} at ${slotTime}. ${tests.length} test(s) booked.`,
      recipientType: "patient",
      patientId: booking.patientId,
      bookingId: booking.id,
      metadata: {
        testCount: tests.length,
        totalAmount,
        bookingType: booking.type,
        healthPackageName: healthPackage?.name
      }
    };
    
    await storage.createNotification(patientNotification as any);
    
    const adminNotification: NotificationData = {
      type: "booking_created",
      title: "New Booking Received",
      message: `New ${booking.type === 'home_collection' ? 'home collection' : 'lab visit'} booking from ${patientName}. ${tests.length} test(s), Amount: Rs. ${totalAmount.toFixed(2)}`,
      recipientType: "admin",
      patientId: booking.patientId,
      bookingId: booking.id,
      metadata: {
        patientName,
        phone: booking.phone,
        testCount: tests.length,
        totalAmount,
        bookingType: booking.type
      }
    };
    
    await storage.createNotification(adminNotification as any);
    
    if (email) {
      const emailData: BookingEmailData = {
        booking,
        patientName,
        tests,
        healthPackage,
        totalAmount
      };
      await sendBookingConfirmationEmail(email, emailData);
    }
    
    await sendAdminNotificationEmail(
      ADMIN_EMAIL,
      `New Booking - ${patientName}`,
      `A new ${booking.type === 'home_collection' ? 'home collection' : 'lab visit'} booking has been received.`,
      {
        "Patient": patientName,
        "Phone": booking.phone,
        "Tests": tests.map(t => t.name).join(", "),
        "Scheduled": `${slotDate} at ${slotTime}`,
        "Amount": `Rs. ${totalAmount.toFixed(2)}`
      }
    );
  }
  
  async createSampleCollectedNotifications(
    booking: Booking,
    patient: Patient | null,
    testNames: string[]
  ): Promise<void> {
    const patientName = patient?.name || booking.guestName || "Valued Customer";
    const email = booking.email || patient?.email;
    
    const patientNotification: NotificationData = {
      type: "sample_collected",
      title: "Sample Collected",
      message: `Your sample has been collected. ${testNames.length} test(s) are now being processed. You will be notified once results are ready.`,
      recipientType: "patient",
      patientId: booking.patientId,
      bookingId: booking.id,
      metadata: { testNames }
    };
    
    await storage.createNotification(patientNotification as any);
    
    if (email) {
      await sendSampleCollectedEmail(email, patientName, testNames, "Within 24-48 hours");
    }
  }
  
  async createReportReadyNotifications(
    booking: Booking | null,
    patient: Patient,
    testNames: string[],
    reportId: string
  ): Promise<void> {
    const patientNotification: NotificationData = {
      type: "report_ready",
      title: "Report Ready",
      message: `Your test report${testNames.length > 1 ? 's are' : ' is'} now ready! Log in to view and download your results.`,
      recipientType: "patient",
      patientId: patient.id,
      bookingId: booking?.id,
      reportId,
      metadata: { testNames }
    };
    
    await storage.createNotification(patientNotification as any);
    
    const adminNotification: NotificationData = {
      type: "report_ready",
      title: "Report Generated",
      message: `Report generated for ${patient.name}. Tests: ${testNames.join(", ")}`,
      recipientType: "admin",
      patientId: patient.id,
      bookingId: booking?.id,
      reportId,
      metadata: { patientName: patient.name, testNames }
    };
    
    await storage.createNotification(adminNotification as any);
    
    if (patient.email) {
      await sendReportReadyEmail(patient.email, patient.name, testNames);
    }
  }
  
  async createPaymentVerifiedNotifications(
    booking: Booking,
    patient: Patient | null,
    amount: number,
    paymentMethod: string
  ): Promise<void> {
    const patientName = patient?.name || booking.guestName || "Valued Customer";
    const email = booking.email || patient?.email;
    
    const patientNotification: NotificationData = {
      type: "payment_verified",
      title: "Payment Verified",
      message: `Your payment of Rs. ${amount.toFixed(2)} has been verified. Thank you!`,
      recipientType: "patient",
      patientId: booking.patientId,
      bookingId: booking.id,
      metadata: { amount, paymentMethod }
    };
    
    await storage.createNotification(patientNotification as any);
    
    if (email) {
      await sendPaymentReceivedEmail(email, patientName, amount, paymentMethod, booking.id);
    }
  }
  
  async getPatientNotifications(patientId: string) {
    return storage.getNotificationsByPatient(patientId);
  }
  
  async getAdminNotifications() {
    return storage.getAdminNotifications();
  }
  
  async getUnreadCount(patientId?: string) {
    return storage.getUnreadNotificationCount(patientId);
  }
  
  async markAsRead(notificationId: string) {
    return storage.markNotificationRead(notificationId);
  }
  
  async markAllAsRead(patientId?: string) {
    return storage.markAllNotificationsRead(patientId);
  }
}

export const notificationService = new NotificationService();
