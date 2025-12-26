import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  dob: timestamp("dob"),
  gender: varchar("gender", { length: 20 }),
  address: text("address"),
  password: text("password"),
  firebaseUid: text("firebase_uid"),
  emailVerified: boolean("email_verified").notNull().default(false),
  notes: text("notes"),
  profilePhoto: text("profile_photo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tests = pgTable("tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  category: varchar("category", { length: 100 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: varchar("duration", { length: 50 }).notNull(),
  description: text("description"),
  parameters: jsonb("parameters").$type<TestParameter[]>().notNull(),
  imageUrl: text("image_url"),
});

export const results = pgTable("results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  testId: varchar("test_id").references(() => tests.id).notNull(),
  parameterResults: jsonb("parameter_results").$type<ParameterResult[]>().notNull(),
  technician: text("technician").notNull(),
  referredBy: text("referred_by"),
  collectedAt: timestamp("collected_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  resultId: varchar("result_id").references(() => results.id).notNull(),
  bookingId: varchar("booking_id").references(() => bookings.id),
  pdfPath: text("pdf_path"),
  secureDownloadToken: text("secure_download_token").notNull().unique(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id),
  guestName: text("guest_name"),
  phone: text("phone").notNull(),
  email: text("email"),
  testIds: jsonb("test_ids").$type<string[]>().notNull(),
  healthPackageId: varchar("health_package_id").references(() => healthPackages.id),
  type: varchar("type", { length: 20 }).notNull(),
  slot: timestamp("slot").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  testReportStatus: jsonb("test_report_status").$type<TestReportStatus[]>().default([]),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentStatus: varchar("payment_status", { length: 50 }).notNull().default("pending"),
  transactionId: text("transaction_id"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  paymentScreenshot: text("payment_screenshot"),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }),
  paymentDate: timestamp("payment_date"),
  paymentVerifiedAt: timestamp("payment_verified_at"),
  paymentVerifiedBy: varchar("payment_verified_by").references(() => admins.id),
  userLatitude: decimal("user_latitude", { precision: 10, scale: 7 }),
  userLongitude: decimal("user_longitude", { precision: 10, scale: 7 }),
  distanceFromLab: decimal("distance_from_lab", { precision: 10, scale: 2 }),
  collectionAddress: text("collection_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  bookingId: varchar("booking_id").references(() => bookings.id),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileSize: integer("file_size"),
  notes: text("notes"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const otps = pgTable("otps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contact: text("contact").notNull(),
  otp: varchar("otp", { length: 6 }).notNull(),
  purpose: varchar("purpose", { length: 30 }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: varchar("role", { length: 30 }).notNull().default("technician"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location").notNull(),
  rating: integer("rating").notNull(),
  review: text("review").notNull(),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const advertisements = pgTable("advertisements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  description: text("description").notNull(),
  gradient: varchar("gradient", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
  imageUrl: text("image_url"),
  ctaText: text("cta_text").notNull(),
  ctaLink: text("cta_link").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const healthPackages = pgTable("health_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  testIds: jsonb("test_ids").$type<string[]>().notNull(),
  reportTime: varchar("report_time", { length: 50 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }).notNull(),
  discountPercentage: integer("discount_percentage").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const labSettings = pgTable("lab_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  labName: text("lab_name").notNull(),
  labLatitude: decimal("lab_latitude", { precision: 10, scale: 7 }).notNull(),
  labLongitude: decimal("lab_longitude", { precision: 10, scale: 7 }).notNull(),
  maxCollectionDistance: integer("max_collection_distance").notNull().default(40),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const walkinCollections = pgTable("walkin_collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  doctorName: text("doctor_name"),
  doctorClinic: text("doctor_clinic"),
  testIds: jsonb("test_ids").$type<string[]>().notNull(),
  testReportStatus: jsonb("test_report_status").$type<TestReportStatus[]>().default([]),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  collectedAt: timestamp("collected_at").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  recipientType: varchar("recipient_type", { length: 20 }).notNull(),
  patientId: varchar("patient_id").references(() => patients.id),
  adminId: varchar("admin_id").references(() => admins.id),
  bookingId: varchar("booking_id").references(() => bookings.id),
  reportId: varchar("report_id").references(() => reports.id),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export interface TestParameter {
  name: string;
  unit: string;
  normalRange: string;
  paramCode: string;
}

export interface ParameterResult {
  parameterName: string;
  value: string;
  unit: string;
  normalRange: string;
  isAbnormal?: boolean;
}

export interface TestReportStatus {
  testId: string;
  status: "pending" | "entered" | "finalized";
  resultId?: string;
  reportId?: string;
  enteredAt?: string;
  finalizedAt?: string;
}

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
});

export const insertTestSchema = createInsertSchema(tests).omit({
  id: true,
});

export const insertResultSchema = createInsertSchema(results).omit({
  id: true,
  createdAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  generatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export const insertOtpSchema = createInsertSchema(otps).omit({
  id: true,
  createdAt: true,
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertAdvertisementSchema = createInsertSchema(advertisements).omit({
  id: true,
  createdAt: true,
});

export const insertHealthPackageSchema = createInsertSchema(healthPackages).omit({
  id: true,
  createdAt: true,
});

export const insertLabSettingsSchema = createInsertSchema(labSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertWalkinCollectionSchema = createInsertSchema(walkinCollections).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  uploadedAt: true,
});

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Test = typeof tests.$inferSelect;
export type InsertTest = z.infer<typeof insertTestSchema>;
export type Result = typeof results.$inferSelect;
export type InsertResult = z.infer<typeof insertResultSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Otp = typeof otps.$inferSelect;
export type InsertOtp = z.infer<typeof insertOtpSchema>;
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Advertisement = typeof advertisements.$inferSelect;
export type InsertAdvertisement = z.infer<typeof insertAdvertisementSchema>;
export type HealthPackage = typeof healthPackages.$inferSelect;
export type InsertHealthPackage = z.infer<typeof insertHealthPackageSchema>;
export type LabSettings = typeof labSettings.$inferSelect;
export type InsertLabSettings = z.infer<typeof insertLabSettingsSchema>;
export type WalkinCollection = typeof walkinCollections.$inferSelect;
export type InsertWalkinCollection = z.infer<typeof insertWalkinCollectionSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;

export const notificationTypes = [
  "booking_created",
  "booking_confirmed",
  "package_booking",
  "sample_collected",
  "report_in_progress",
  "report_ready",
  "payment_received",
  "payment_verified"
] as const;
export type NotificationType = typeof notificationTypes[number];

export const recipientTypes = ["patient", "admin", "both"] as const;
export type RecipientType = typeof recipientTypes[number];

export const bookingStatuses = ["pending", "collected", "processing", "report_ready", "delivered"] as const;
export type BookingStatus = typeof bookingStatuses[number];

export const paymentStatuses = ["pending", "paid_unverified", "verified", "cash_on_delivery", "pay_at_lab"] as const;
export type PaymentStatus = typeof paymentStatuses[number];

export const paymentMethods = ["upi", "debit_card", "credit_card", "net_banking", "wallet", "bank_transfer", "cash_on_delivery", "pay_at_lab"] as const;
export type PaymentMethod = typeof paymentMethods[number];
