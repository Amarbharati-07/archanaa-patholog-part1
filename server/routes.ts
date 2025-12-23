import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomBytes, createHash, createHmac } from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { verifyFirebaseToken } from "./firebase-admin";
import { sendOtpEmail } from "./email";
import { notificationService } from "./notification.service";
import multer from "multer";
import path from "path";
import fs from "fs";
import Razorpay from "razorpay";

const uploadsDir = path.join(process.cwd(), "uploads", "banners");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "banner-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadBanner = multer({
  storage: bannerStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Prescriptions upload directory
const prescriptionsDir = path.join(process.cwd(), "uploads", "prescriptions");
if (!fs.existsSync(prescriptionsDir)) {
  fs.mkdirSync(prescriptionsDir, { recursive: true });
}

const prescriptionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, prescriptionsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "prescription-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadPrescription = multer({
  storage: prescriptionStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /jpeg|jpg|png|pdf|image\/jpeg|image\/png|application\/pdf/.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpg, png) and PDF files are allowed"));
    }
  },
});

// Profile photos upload directory
const profilePhotosDir = path.join(process.cwd(), "uploads", "profiles");
if (!fs.existsSync(profilePhotosDir)) {
  fs.mkdirSync(profilePhotosDir, { recursive: true });
}

const profilePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePhotosDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const JWT_SECRET = process.env.SESSION_SECRET || "archana-pathology-secret-key";

// Initialize Razorpay instance (only if credentials are available)
const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpayInstance: Razorpay | null = null;
if (razorpayKeyId && razorpayKeySecret) {
  razorpayInstance = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  });
  console.log("Razorpay initialized successfully");
} else {
  console.log("Razorpay credentials not found - payment gateway disabled");
}

// Generate a random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate secure download token
function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

// JWT token verification middleware
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; type: string };
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

// Admin-only middleware
function adminOnly(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.type !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ==================== AUTH ROUTES ====================

  // Request OTP
  app.post("/api/auth/request-otp", async (req, res) => {
    try {
      const { contact, purpose } = req.body;
      
      if (!contact || !purpose) {
        return res.status(400).json({ message: "Contact and purpose are required" });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await storage.createOtp({
        contact,
        otp,
        purpose,
        expiresAt,
      });

      // In production, send OTP via SMS/Email
      console.log(`OTP for ${contact}: ${otp}`);

      res.json({ message: "OTP sent successfully", debug_otp: otp });
    } catch (error) {
      console.error("Error requesting OTP:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  // Verify OTP
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { contact, otp, purpose } = req.body;

      if (!contact || !otp || !purpose) {
        return res.status(400).json({ message: "Contact, OTP, and purpose are required" });
      }

      const otpRecord = await storage.verifyOtp(contact, otp, purpose);
      
      if (!otpRecord) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      await storage.deleteOtp(otpRecord.id);

      // Find or create patient
      let patient = await storage.getPatientByPhone(contact) || 
                    await storage.getPatientByEmail(contact);

      if (!patient && purpose === "register") {
        return res.status(400).json({ message: "Patient not found. Please register first." });
      }

      if (!patient) {
        return res.status(400).json({ message: "Patient not found" });
      }

      const token = jwt.sign({ id: patient.id, type: 'patient' }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ patient, token });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Register new patient
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, phone, email, gender, dob } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ message: "Name and phone are required" });
      }

      // Check if patient already exists
      const existing = await storage.getPatientByPhone(phone);
      if (existing) {
        return res.status(400).json({ message: "Phone number already registered" });
      }

      const patientId = await storage.generatePatientId();
      
      const patient = await storage.createPatient({
        patientId,
        name,
        phone,
        email: email || null,
        gender: gender || null,
        dob: dob ? new Date(dob) : null,
        address: null,
        password: null,
        notes: null,
      });

      // Generate and send OTP
      const otp = generateOTP();
      await storage.createOtp({
        contact: phone,
        otp,
        purpose: "register",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      console.log(`OTP for ${phone}: ${otp}`);

      res.json({ message: "Registration successful. OTP sent.", patientId: patient.patientId, debug_otp: otp });
    } catch (error) {
      console.error("Error registering:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Firebase Login - Now with proper server-side token verification
  app.post("/api/auth/firebase-login", async (req, res) => {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ message: "Firebase ID token is required" });
      }

      const verified = await verifyFirebaseToken(idToken);
      if (!verified) {
        return res.status(401).json({ message: "Invalid or expired Firebase token" });
      }

      const phone = verified.phone;
      if (!phone) {
        return res.status(400).json({ message: "Phone number not found in Firebase account" });
      }

      let patient = await storage.getPatientByPhone(phone);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found. Please register first." });
      }

      if (patient.firebaseUid && patient.firebaseUid !== verified.uid) {
        return res.status(403).json({ message: "Phone number linked to another account" });
      }

      if (!patient.firebaseUid) {
        patient = await storage.updatePatientFirebaseUid(patient.id, verified.uid);
      }

      const token = jwt.sign({ id: patient!.id, type: 'patient' }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ patient, token });
    } catch (error) {
      console.error("Error in Firebase login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Firebase Register - Now with proper server-side token verification
  app.post("/api/auth/firebase-register", async (req, res) => {
    try {
      const { name, idToken, email, gender, dob } = req.body;

      if (!name || !idToken) {
        return res.status(400).json({ message: "Name and Firebase ID token are required" });
      }

      const verified = await verifyFirebaseToken(idToken);
      if (!verified) {
        return res.status(401).json({ message: "Invalid or expired Firebase token" });
      }

      const phone = verified.phone;
      if (!phone) {
        return res.status(400).json({ message: "Phone number not found in Firebase account" });
      }

      const existing = await storage.getPatientByPhone(phone);
      if (existing) {
        if (existing.firebaseUid === verified.uid) {
          const token = jwt.sign({ id: existing.id, type: 'patient' }, JWT_SECRET, { expiresIn: '7d' });
          return res.json({ patient: existing, token });
        }
        return res.status(400).json({ message: "Phone number already registered" });
      }

      const patientId = await storage.generatePatientId();
      
      const patient = await storage.createPatient({
        patientId,
        name,
        phone,
        email: email || verified.email || null,
        gender: gender || null,
        dob: dob ? new Date(dob) : null,
        address: null,
        password: null,
        firebaseUid: verified.uid,
        notes: null,
      });

      const token = jwt.sign({ id: patient.id, type: 'patient' }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ patient, token });
    } catch (error) {
      console.error("Error in Firebase register:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // ==================== EMAIL/PASSWORD AUTH ROUTES ====================

  // Register with email and password
  app.post("/api/auth/register-email", async (req, res) => {
    try {
      const { name, email, phone, password, gender, dob } = req.body;

      if (!name || !email || !phone || !password) {
        return res.status(400).json({ message: "Name, email, phone, and password are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Validate password strength
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Check if email already exists
      const existingEmail = await storage.getPatientByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Check if phone already exists
      const existingPhone = await storage.getPatientByPhone(phone);
      if (existingPhone) {
        return res.status(400).json({ message: "Phone number already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const patientId = await storage.generatePatientId();
      
      const patient = await storage.createPatient({
        patientId,
        name,
        phone,
        email,
        gender: gender || null,
        dob: dob ? new Date(dob) : null,
        address: null,
        password: hashedPassword,
        emailVerified: false,
        notes: null,
      });

      // Generate and send email verification OTP
      const otp = generateOTP();
      await storage.createOtp({
        contact: email,
        otp,
        purpose: "email_verification",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await sendOtpEmail(email, otp, "email_verification");
      
      // Don't return password in response
      const { password: _, ...patientData } = patient as any;
      res.json({ 
        message: "Registration successful. Please verify your email.", 
        patient: patientData,
        requiresVerification: true 
      });
    } catch (error) {
      console.error("Error in email registration:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Resend email verification OTP
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const patient = await storage.getPatientByEmail(email);
      if (!patient) {
        return res.status(404).json({ message: "Email not found" });
      }

      if (patient.emailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }

      const otp = generateOTP();
      await storage.createOtp({
        contact: email,
        otp,
        purpose: "email_verification",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await sendOtpEmail(email, otp, "email_verification");

      res.json({ message: "Verification OTP sent successfully" });
    } catch (error) {
      console.error("Error resending verification:", error);
      res.status(500).json({ message: "Failed to resend verification" });
    }
  });

  // Verify email with OTP
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      // Get OTP record to check attempts
      const otpRecord = await storage.getOtpByContact(email, "email_verification");
      
      if (!otpRecord) {
        return res.status(400).json({ message: "No verification request found. Please request a new OTP." });
      }

      // Check max attempts (3)
      if (otpRecord.attempts >= 3) {
        await storage.deleteOtp(otpRecord.id);
        return res.status(400).json({ message: "Maximum attempts exceeded. Please request a new OTP." });
      }

      // Increment attempts
      await storage.incrementOtpAttempts(otpRecord.id);

      // Verify OTP
      if (otpRecord.otp !== otp) {
        const remainingAttempts = 2 - otpRecord.attempts;
        return res.status(400).json({ 
          message: `Invalid OTP. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining.` : 'Please request a new OTP.'}` 
        });
      }

      // Delete OTP
      await storage.deleteOtp(otpRecord.id);

      // Get patient and update emailVerified
      const patient = await storage.getPatientByEmail(email);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      await storage.updatePatientEmailVerified(patient.id, true);

      // Generate token and return patient data
      const token = jwt.sign({ id: patient.id, type: 'patient' }, JWT_SECRET, { expiresIn: '7d' });
      
      const { password: _, ...patientData } = patient as any;
      res.json({ 
        message: "Email verified successfully",
        patient: { ...patientData, emailVerified: true }, 
        token 
      });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Login with email and password
  app.post("/api/auth/login-email", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          message: "Email and password are required",
          errorCode: "MISSING_FIELDS"
        });
      }

      const patient = await storage.getPatientByEmail(email);
      
      // Email not found - user hasn't registered
      if (!patient) {
        return res.status(404).json({ 
          message: "Email is not registered. Please sign up first.",
          errorCode: "EMAIL_NOT_FOUND"
        });
      }

      // No password set (registered via Firebase/phone)
      if (!patient.password) {
        return res.status(401).json({ 
          message: "Password not set. Please use forgot password to set one.",
          errorCode: "PASSWORD_NOT_SET"
        });
      }

      // Wrong password
      const valid = await bcrypt.compare(password, patient.password);
      if (!valid) {
        return res.status(401).json({ 
          message: "Incorrect password. Please try again.",
          errorCode: "WRONG_PASSWORD"
        });
      }

      // Check if email is verified (account not active)
      if (!patient.emailVerified) {
        return res.status(403).json({ 
          message: "Your account is not active. Please verify your email or contact support.",
          errorCode: "EMAIL_NOT_VERIFIED",
          requiresVerification: true,
          email: patient.email
        });
      }

      const token = jwt.sign({ id: patient.id, type: 'patient' }, JWT_SECRET, { expiresIn: '7d' });
      
      // Don't return password in response
      const { password: _, ...patientData } = patient as any;
      res.json({ patient: patientData, token });
    } catch (error) {
      console.error("Error in email login:", error);
      res.status(500).json({ 
        message: "Something went wrong. Please try again later.",
        errorCode: "INTERNAL_ERROR"
      });
    }
  });

  // Request password reset OTP
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const patient = await storage.getPatientByEmail(email);
      
      if (!patient) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If this email is registered, you will receive a password reset OTP" });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes for reset

      await storage.createOtp({
        contact: email,
        otp,
        purpose: "password_reset",
        expiresAt,
      });

      // Send OTP via Email
      await sendOtpEmail(email, otp, "password_reset");

      res.json({ message: "If this email is registered, you will receive a password reset OTP" });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ message: "Failed to send reset OTP" });
    }
  });

  // Reset password with OTP
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: "Email, OTP, and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const otpRecord = await storage.verifyOtp(email, otp, "password_reset");
      
      if (!otpRecord) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      await storage.deleteOtp(otpRecord.id);

      const patient = await storage.getPatientByEmail(email);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Hash and update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updatePatientPassword(patient.id, hashedPassword);

      res.json({ message: "Password reset successful. You can now login with your new password." });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const admin = await storage.getAdminByUsername(username);
      
      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: admin.id, type: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
      const { password: _, ...adminData } = admin;
      res.json({ admin: adminData, token });
    } catch (error) {
      console.error("Error in admin login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // ==================== PUBLIC ROUTES ====================

  // Get all tests
  app.get("/api/tests", async (req, res) => {
    try {
      const tests = await storage.getAllTests();
      res.json(tests);
    } catch (error) {
      console.error("Error fetching tests:", error);
      res.status(500).json({ message: "Failed to fetch tests" });
    }
  });

  // ==================== RAZORPAY PAYMENT ROUTES ====================

  // Get Razorpay key for frontend
  app.get("/api/payment/razorpay-key", (req, res) => {
    if (!razorpayKeyId) {
      return res.status(503).json({ message: "Payment gateway not configured" });
    }
    res.json({ keyId: razorpayKeyId });
  });

  // Create Razorpay order
  app.post("/api/payment/create-order", async (req, res) => {
    try {
      if (!razorpayInstance) {
        return res.status(503).json({ message: "Payment gateway not configured" });
      }

      const { amount, testIds, phone, email, name } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }

      if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
        return res.status(400).json({ message: "Test IDs are required" });
      }

      // Create Razorpay order
      const order = await razorpayInstance.orders.create({
        amount: Math.round(amount * 100), // Razorpay expects amount in paise
        currency: "INR",
        receipt: `order_${Date.now()}`,
        notes: {
          testIds: testIds.join(","),
          phone: phone || "",
          email: email || "",
          name: name || "",
        },
      });

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId,
      });
    } catch (error) {
      console.error("Error creating Razorpay order:", error);
      res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  // Verify Razorpay payment
  app.post("/api/payment/verify", async (req, res) => {
    try {
      if (!razorpayKeySecret) {
        return res.status(503).json({ message: "Payment gateway not configured" });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: "Missing payment verification details" });
      }

      // Verify signature
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = createHmac("sha256", razorpayKeySecret)
        .update(body)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ message: "Invalid payment signature" });
      }

      res.json({
        success: true,
        message: "Payment verified successfully",
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Payment verification failed" });
    }
  });

  // Create booking (public - allows guest bookings)
  app.post("/api/bookings", async (req, res) => {
    try {
      const { patientId, guestName, phone, email, testIds, type, slot, paymentMethod, transactionId, amountPaid, razorpayOrderId, razorpayPaymentId } = req.body;

      if (!phone || !testIds || !type || !slot) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (!paymentMethod) {
        return res.status(400).json({ message: "Payment method is required" });
      }

      // Determine payment status based on method
      const isCashPayment = paymentMethod === 'cash_on_delivery' || paymentMethod === 'pay_at_lab';
      // If razorpay payment is verified, mark as verified
      const isRazorpayVerified = razorpayPaymentId && razorpayOrderId;
      const paymentStatus = isCashPayment ? paymentMethod : (isRazorpayVerified ? 'verified' : 'paid_unverified');

      const booking = await storage.createBooking({
        patientId: patientId || null,
        guestName: guestName || null,
        phone,
        email: email || null,
        testIds,
        type,
        slot: new Date(slot),
        status: "pending",
        paymentMethod,
        paymentStatus,
        transactionId: transactionId || null,
        razorpayOrderId: razorpayOrderId || null,
        razorpayPaymentId: razorpayPaymentId || null,
        amountPaid: amountPaid || null,
        paymentDate: new Date(),
      });

      // Send booking confirmation notifications (non-blocking, don't fail if this errors)
      setImmediate(async () => {
        try {
          const patient = patientId ? await storage.getPatient(patientId) : null;
          const tests = await Promise.all(testIds.map((id: string) => storage.getTest(id)));
          const validTests = tests.filter((t): t is NonNullable<typeof t> => t !== undefined);
          const totalAmount = validTests.reduce((sum, t) => sum + parseFloat(t.price), 0);
          
          await notificationService.createBookingNotifications(
            booking,
            patient || null,
            validTests,
            undefined,
            totalAmount
          );
        } catch (notifError) {
          console.error("Error sending booking notifications (non-blocking):", notifError);
        }
      });

      res.json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking", error: (error as any)?.message || "Unknown error" });
    }
  });

  // Upload prescription (authenticated patients)
  app.post("/api/prescriptions/upload", authenticateToken, uploadPrescription.single("prescription"), async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.type !== 'patient') {
        return res.status(403).json({ message: "Only patients can upload prescriptions" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { bookingId, notes } = req.body;

      const prescription = await storage.createPrescription({
        patientId: user.id,
        bookingId: bookingId || null,
        fileName: req.file.originalname,
        filePath: `/uploads/prescriptions/${req.file.filename}`,
        fileType: path.extname(req.file.originalname).toLowerCase().replace('.', ''),
        fileSize: req.file.size,
        notes: notes || null,
      });

      // Note: bookingId is stored directly in the prescription record for better data organization

      res.json(prescription);
    } catch (error) {
      console.error("Error uploading prescription:", error);
      res.status(500).json({ message: "Failed to upload prescription" });
    }
  });

  // Get prescriptions (role-based access control)
  app.get("/api/prescriptions", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const patientId = (req.query.patientId as string) || user.id;

      // If admin, can see all prescriptions or filter by patientId
      if (user.type === 'admin') {
        if (patientId) {
          const prescriptions = await storage.getPrescriptionsByPatient(patientId);
          return res.json(prescriptions);
        }
        // For admin, if no patientId specified, return empty (admins should use other endpoints)
        return res.json([]);
      }

      // Patients can only see their own prescriptions
      if (user.type !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const prescriptions = await storage.getPrescriptionsByPatient(user.id);
      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      res.status(500).json({ message: "Failed to fetch prescriptions" });
    }
  });

  // Get prescriptions for a specific booking (admin)
  app.get("/api/bookings/:id/prescriptions", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const prescriptions = await storage.getPrescriptionsByBooking(id);
      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching booking prescriptions:", error);
      res.status(500).json({ message: "Failed to fetch prescriptions" });
    }
  });

  // Upload profile photo (authenticated patients)
  app.post("/api/profile/photo", authenticateToken, uploadProfilePhoto.single("photo"), async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.type !== 'patient') {
        return res.status(403).json({ message: "Only patients can upload profile photos" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const photoUrl = `/uploads/profiles/${req.file.filename}`;
      const updatedPatient = await storage.updatePatient(user.id, {
        profilePhoto: photoUrl,
      });

      if (!updatedPatient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      res.json({ profilePhoto: photoUrl, patient: updatedPatient });
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      res.status(500).json({ message: "Failed to upload profile photo" });
    }
  });

  // Update patient profile (name, phone - email read-only)
  app.patch("/api/profile", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.type !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { name, phone, address, dob, gender } = req.body;
      
      const updateData: any = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (dob) updateData.dob = new Date(dob);
      if (gender) updateData.gender = gender;

      const updatedPatient = await storage.updatePatient(user.id, updateData);

      if (!updatedPatient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      const { password: _, ...patientData } = updatedPatient as any;
      res.json(patientData);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get patient's booking history with full details
  app.get("/api/my-orders", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.type !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const bookings = await storage.getBookingsByPatient(user.id);
      
      // Enrich bookings with test/package details
      const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
        const tests = await Promise.all(booking.testIds.map(async (testId: string) => {
          const test = await storage.getTest(testId);
          return test;
        }));

        let healthPackage = null;
        if (booking.healthPackageId) {
          healthPackage = await storage.getHealthPackage(booking.healthPackageId);
        }

        // Get prescriptions for this booking
        const prescriptions = await storage.getPrescriptionsByBooking(booking.id);

        return {
          ...booking,
          tests: tests.filter(t => t !== undefined),
          healthPackage,
          prescriptions,
        };
      }));

      res.json(enrichedBookings);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get patient's reports and documents
  app.get("/api/my-documents", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.type !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const [prescriptions, reports] = await Promise.all([
        storage.getPrescriptionsByPatient(user.id),
        storage.getReportsByPatient(user.id),
      ]);

      // Enrich reports with test details
      const enrichedReports = await Promise.all(reports.map(async (report) => {
        const result = await storage.getResult(report.resultId);
        const test = result ? await storage.getTest(result.testId) : null;
        return {
          ...report,
          testName: test?.name,
          testCode: test?.code,
        };
      }));

      res.json({
        prescriptions,
        reports: enrichedReports,
      });
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Download report (public with token)
  app.get("/api/reports/download/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const report = await storage.getReportByToken(token);

      if (!report) {
        return res.status(404).json({ message: "Report not found or link expired" });
      }

      // Check payment status before allowing download
      // For reports with a booking, verify payment status
      if (report.bookingId) {
        const booking = await storage.getBooking(report.bookingId);
        if (!booking) {
          return res.status(403).json({ 
            message: "Unable to verify payment status. Please contact support." 
          });
        }
        const allowedPaymentStatuses = ['verified', 'cash_on_delivery', 'pay_at_lab'];
        if (!allowedPaymentStatuses.includes(booking.paymentStatus)) {
          return res.status(403).json({ 
            message: "Payment is not verified. Please complete your payment to access the report." 
          });
        }
      }
      // Reports without bookingId are legacy reports created before payment tracking
      // These are allowed to be downloaded (admin-created reports)

      // In production, serve the actual PDF file
      // For now, generate a simple HTML response
      const patient = await storage.getPatient(report.patientId);
      const result = await storage.getResult(report.resultId);
      const test = result ? await storage.getTest(result.testId) : null;

      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Report - ${patient?.patientId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #005B96; }
            .header { text-align: center; border-bottom: 2px solid #87CEEB; padding-bottom: 20px; }
            .patient-info { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #87CEEB; color: white; }
            .abnormal { color: red; font-weight: bold; }
            .normal { color: green; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Archana Pathology Lab</h1>
            <p>NABL Accredited | ISO 9001 Certified</p>
          </div>
          <div class="patient-info">
            <strong>Patient ID:</strong> ${patient?.patientId}<br>
            <strong>Name:</strong> ${patient?.name}<br>
            <strong>Phone:</strong> ${patient?.phone}<br>
            <strong>Date:</strong> ${new Date(report.generatedAt).toLocaleDateString()}
          </div>
          <h2>${test?.name || 'Test Report'}</h2>
          <table>
            <tr>
              <th>Parameter</th>
              <th>Value</th>
              <th>Unit</th>
              <th>Normal Range</th>
              <th>Status</th>
            </tr>
            ${(result?.parameterResults as any[] || []).map((p: any) => `
              <tr>
                <td>${p.parameterName}</td>
                <td>${p.value}</td>
                <td>${p.unit}</td>
                <td>${p.normalRange}</td>
                <td class="${p.isAbnormal ? 'abnormal' : 'normal'}">${p.isAbnormal ? 'Abnormal' : 'Normal'}</td>
              </tr>
            `).join('')}
          </table>
          <div class="footer">
            <p>This is a computer generated report.</p>
            <p>Archana Pathology Lab | Contact: +91 98765 43210 | info@archanapathology.com</p>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error downloading report:", error);
      res.status(500).json({ message: "Failed to download report" });
    }
  });

  // ==================== PATIENT ROUTES ====================

  // Get patient bookings
  app.get("/api/patient/bookings", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const bookings = await storage.getBookingsByPatient(user.id);
      
      // Fetch test details for each booking
      const bookingsWithTests = await Promise.all(
        bookings.map(async (booking) => {
          const tests = await Promise.all(
            (booking.testIds as string[]).map(id => storage.getTest(id))
          );
          return { ...booking, tests: tests.filter(Boolean) };
        })
      );

      res.json(bookingsWithTests);
    } catch (error) {
      console.error("Error fetching patient bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Get patient reports (with payment status check) - grouped by booking
  app.get("/api/patient/reports", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const reports = await storage.getReportsByPatient(user.id);
      const bookings = await storage.getBookingsByPatient(user.id);
      
      // Process reports with details
      const reportsWithDetails = await Promise.all(
        reports.map(async (report) => {
          const result = await storage.getResult(report.resultId);
          const test = result ? await storage.getTest(result.testId) : null;
          
          // Find associated booking to check payment status
          let associatedBooking = report.bookingId 
            ? bookings.find(b => b.id === report.bookingId)
            : null;
          
          // Fallback: match by testId if no direct bookingId link
          if (!associatedBooking && result?.testId) {
            associatedBooking = bookings.find(b => 
              (b.testIds as string[]).some(testId => testId === result.testId)
            );
          }
          
          const paymentVerified = associatedBooking?.paymentStatus === 'verified' || 
                                  associatedBooking?.paymentStatus === 'cash_on_delivery' ||
                                  associatedBooking?.paymentStatus === 'pay_at_lab';
          
          return { 
            ...report, 
            test,
            paymentVerified,
            paymentStatus: associatedBooking?.paymentStatus || 'pending',
            secureDownloadToken: paymentVerified ? report.secureDownloadToken : null,
            bookingId: report.bookingId || associatedBooking?.id || null
          };
        })
      );

      // Group reports by booking
      const groupedReports: Record<string, {
        bookingId: string;
        bookingDate: Date;
        bookingType: string;
        healthPackageId: string | null;
        healthPackageName: string | null;
        paymentVerified: boolean;
        paymentStatus: string;
        reports: typeof reportsWithDetails;
      }> = {};

      for (const report of reportsWithDetails) {
        // If no booking ID, create a unique key for each unlinked report
        // This ensures unlinked reports are NOT merged together
        const groupKey = report.bookingId || `individual-${report.id}`;
        const booking = report.bookingId ? bookings.find(b => b.id === report.bookingId) : null;
        
        if (!groupedReports[groupKey]) {
          // Get health package name if applicable
          let healthPackageName = null;
          if (booking?.healthPackageId) {
            const pkg = await storage.getHealthPackage(booking.healthPackageId);
            healthPackageName = pkg?.name || null;
          }
          
          groupedReports[groupKey] = {
            bookingId: groupKey,
            bookingDate: booking?.slot || report.generatedAt,
            bookingType: booking?.type || 'walkin',
            healthPackageId: booking?.healthPackageId || null,
            healthPackageName,
            paymentVerified: report.paymentVerified,
            paymentStatus: report.paymentStatus,
            reports: []
          };
        }
        
        groupedReports[groupKey].reports.push(report);
      }

      // Convert to array and sort by booking date (most recent first)
      const groupedArray = Object.values(groupedReports).sort((a, b) => 
        new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()
      );

      res.json(groupedArray);
    } catch (error) {
      console.error("Error fetching patient reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  // Update booking payment
  app.patch("/api/patient/bookings/:id/payment", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const { paymentMethod, transactionId, amountPaid } = req.body;

      if (!paymentMethod || !amountPaid) {
        return res.status(400).json({ message: "Payment method and amount are required" });
      }

      // Verify the booking belongs to this patient
      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.patientId !== user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Determine payment status based on method
      const isCashPayment = paymentMethod === 'cash_on_delivery' || paymentMethod === 'pay_at_lab';
      const paymentStatus = isCashPayment ? paymentMethod : 'paid_unverified';

      const updated = await storage.updateBookingPayment(id, {
        paymentMethod,
        paymentStatus,
        transactionId: transactionId || undefined,
        amountPaid,
        paymentDate: new Date(),
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating payment:", error);
      res.status(500).json({ message: "Failed to update payment" });
    }
  });

  // ==================== ADMIN ROUTES ====================

  // Dashboard stats
  app.get("/api/admin/dashboard", authenticateToken, adminOnly, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Get all patients
  app.get("/api/admin/patients", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { q } = req.query;
      const patients = q 
        ? await storage.searchPatients(q as string)
        : await storage.getAllPatients();
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  // Create patient
  app.post("/api/admin/patients", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { name, phone, email, gender, address } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ message: "Name and phone are required" });
      }

      const patientId = await storage.generatePatientId();
      
      const patient = await storage.createPatient({
        patientId,
        name,
        phone,
        email: email || null,
        gender: gender || null,
        dob: null,
        address: address || null,
        password: null,
        notes: null,
      });

      res.json(patient);
    } catch (error) {
      console.error("Error creating patient:", error);
      res.status(500).json({ message: "Failed to create patient" });
    }
  });

  // Get patient details with all bookings, reports, and packages
  app.get("/api/admin/patients/:id/details", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const patient = await storage.getPatient(id);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Fetch all data once upfront for efficiency
      const [allBookings, allReports, healthPackages] = await Promise.all([
        storage.getAllBookings(),
        storage.getAllReports(),
        storage.getAllHealthPackages()
      ]);

      const patientBookings = allBookings.filter(b => b.patientId === id);
      const patientReports = allReports.filter(r => r.patientId === id);

      // Enhance bookings with test details and report status
      const bookingsWithDetails = await Promise.all(
        patientBookings.map(async (booking) => {
          const tests = await Promise.all(
            (booking.testIds as string[]).map(testId => storage.getTest(testId))
          );
          const healthPackage = booking.healthPackageId 
            ? healthPackages.find(p => p.id === booking.healthPackageId) 
            : null;
          
          // Get reports for this booking from pre-fetched data
          const bookingReports = patientReports.filter(r => r.bookingId === booking.id);
          
          // Get report details
          const reportsWithDetails = await Promise.all(
            bookingReports.map(async (report) => {
              const result = await storage.getResult(report.resultId);
              const test = result ? await storage.getTest(result.testId) : null;
              return { ...report, result, test };
            })
          );

          return { 
            ...booking, 
            tests: tests.filter(Boolean),
            healthPackage,
            reports: reportsWithDetails
          };
        })
      );

      // Get standalone reports (not linked to bookings)
      const standaloneReports = patientReports.filter(r => !r.bookingId);
      
      const standaloneReportsWithDetails = await Promise.all(
        standaloneReports.map(async (report) => {
          const result = await storage.getResult(report.resultId);
          const test = result ? await storage.getTest(result.testId) : null;
          return { ...report, result, test };
        })
      );

      // Calculate stats from pre-fetched data
      const totalTests = patientBookings.reduce((acc, b) => acc + (b.testIds as string[]).length, 0);
      const completedReports = patientReports.length;
      const pendingBookings = patientBookings.filter(b => b.status !== 'report_ready').length;

      res.json({
        patient,
        bookings: bookingsWithDetails,
        standaloneReports: standaloneReportsWithDetails,
        stats: {
          totalBookings: patientBookings.length,
          totalTests,
          completedReports,
          pendingBookings
        }
      });
    } catch (error) {
      console.error("Error fetching patient details:", error);
      res.status(500).json({ message: "Failed to fetch patient details" });
    }
  });

  // Get all bookings
  app.get("/api/admin/bookings", authenticateToken, adminOnly, async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      
      const bookingsWithDetails = await Promise.all(
        bookings.map(async (booking) => {
          const patient = booking.patientId ? await storage.getPatient(booking.patientId) : null;
          const tests = await Promise.all(
            (booking.testIds as string[]).map(id => storage.getTest(id))
          );
          return { ...booking, patient, tests: tests.filter(Boolean) };
        })
      );

      res.json(bookingsWithDetails);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Update booking status
  app.patch("/api/admin/bookings/:id/status", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const booking = await storage.updateBookingStatus(id, status);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.json(booking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Verify booking payment
  app.patch("/api/admin/bookings/:id/verify-payment", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const admin = (req as any).user;

      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.paymentStatus !== 'paid_unverified') {
        return res.status(400).json({ message: "Payment is not pending verification" });
      }

      const updated = await storage.verifyBookingPayment(id, admin.id);
      if (!updated) {
        return res.status(500).json({ message: "Failed to verify payment" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  // Get all reports
  app.get("/api/admin/reports", authenticateToken, adminOnly, async (req, res) => {
    try {
      const reports = await storage.getAllReports();
      
      const reportsWithDetails = await Promise.all(
        reports.map(async (report) => {
          const patient = await storage.getPatient(report.patientId);
          const result = await storage.getResult(report.resultId);
          const test = result ? await storage.getTest(result.testId) : null;
          return { ...report, patient, test };
        })
      );

      res.json(reportsWithDetails);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  // Generate report
  app.post("/api/admin/reports/generate", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { patientId, testId, technician, referredBy, collectedAt, parameterResults, remarks } = req.body;

      if (!patientId || !testId || !technician || !parameterResults) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Create result
      const result = await storage.createResult({
        patientId,
        testId,
        technician,
        referredBy: referredBy || null,
        collectedAt: new Date(collectedAt),
        parameterResults,
      });

      // Generate secure token
      const secureDownloadToken = generateSecureToken();

      // Create report
      const report = await storage.createReport({
        patientId,
        resultId: result.id,
        pdfPath: null,
        secureDownloadToken,
      });

      // In production: Generate PDF, send email/SMS notifications

      res.json({ report, result, downloadUrl: `/api/reports/download/${secureDownloadToken}` });
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Get booking details with tests and report status for admin
  app.get("/api/admin/bookings/:id/report-details", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Get patient details
      let patient = null;
      if (booking.patientId) {
        patient = await storage.getPatient(booking.patientId);
      }

      // Get all tests for this booking
      const tests = await Promise.all(
        booking.testIds.map(async (testId: string) => {
          const test = await storage.getTest(testId);
          return test;
        })
      );

      // Get health package if applicable
      let healthPackage = null;
      if (booking.healthPackageId) {
        healthPackage = await storage.getHealthPackage(booking.healthPackageId);
      }

      // Get test report status from booking
      const testReportStatus = booking.testReportStatus || [];

      // Merge tests with their report status
      const testsWithStatus = tests.filter(t => t).map((test: any) => {
        const status = testReportStatus.find((s: any) => s.testId === test.id);
        return {
          ...test,
          reportStatus: status?.status || "pending",
          resultId: status?.resultId || null,
          reportId: status?.reportId || null,
          enteredAt: status?.enteredAt || null,
          finalizedAt: status?.finalizedAt || null,
        };
      });

      // Calculate progress
      const totalTests = testsWithStatus.length;
      const completedTests = testsWithStatus.filter((t: any) => t.reportStatus === "finalized").length;
      const enteredTests = testsWithStatus.filter((t: any) => t.reportStatus === "entered").length;

      res.json({
        booking,
        patient,
        healthPackage,
        tests: testsWithStatus,
        progress: {
          total: totalTests,
          completed: completedTests,
          entered: enteredTests,
          pending: totalTests - completedTests - enteredTests,
        },
      });
    } catch (error) {
      console.error("Error fetching booking report details:", error);
      res.status(500).json({ message: "Failed to fetch booking details" });
    }
  });

  // Save report for a specific test in a booking
  app.post("/api/admin/bookings/:bookingId/tests/:testId/report", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { bookingId, testId } = req.params;
      const { technician, referredBy, parameterResults, remarks, finalize } = req.body;

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (!booking.testIds.includes(testId)) {
        return res.status(400).json({ message: "Test not part of this booking" });
      }

      const patientId = booking.patientId;
      if (!patientId) {
        return res.status(400).json({ message: "Booking has no patient linked" });
      }

      // Create result
      const result = await storage.createResult({
        patientId,
        testId,
        technician: technician || "Lab Technician",
        referredBy: referredBy || null,
        collectedAt: new Date(),
        parameterResults,
      });

      // Generate secure token
      const secureDownloadToken = generateSecureToken();

      // Create report with booking link
      const report = await storage.createReport({
        patientId,
        resultId: result.id,
        bookingId,
        pdfPath: null,
        secureDownloadToken,
      });

      // Update booking test report status
      const testReportStatus = booking.testReportStatus || [];
      const existingIndex = testReportStatus.findIndex((s: any) => s.testId === testId);
      const newStatus = {
        testId,
        status: (finalize ? "finalized" : "entered") as "pending" | "entered" | "finalized",
        resultId: result.id,
        reportId: report.id,
        enteredAt: new Date().toISOString(),
        finalizedAt: finalize ? new Date().toISOString() : undefined,
      };

      if (existingIndex >= 0) {
        testReportStatus[existingIndex] = newStatus as any;
      } else {
        testReportStatus.push(newStatus as any);
      }

      // Check if all tests are finalized
      const allFinalized = booking.testIds.every((tid: string) => {
        const status = testReportStatus.find((s: any) => s.testId === tid);
        return status?.status === "finalized";
      });

      // Update booking with new status
      const updatedBooking = await storage.updateBooking(bookingId, {
        testReportStatus,
        status: allFinalized ? "report_ready" : booking.status,
      });

      // Send notifications when report is finalized
      if (finalize && allFinalized) {
        try {
          const patient = await storage.getPatient(patientId);
          if (patient) {
            const testNames = await Promise.all(
              booking.testIds.map(async (tid: string) => {
                const test = await storage.getTest(tid);
                return test?.name || "Test";
              })
            );
            await notificationService.createReportReadyNotifications(
              booking,
              patient,
              testNames,
              report.id
            );
          }
        } catch (notifError) {
          console.error("Error sending report notifications:", notifError);
        }
      }

      res.json({
        report,
        result,
        booking: updatedBooking,
        allCompleted: allFinalized,
        downloadUrl: `/api/reports/download/${secureDownloadToken}`,
      });
    } catch (error) {
      console.error("Error saving test report:", error);
      res.status(500).json({ message: "Failed to save report" });
    }
  });

  // Finalize a test report in a booking
  app.patch("/api/admin/bookings/:bookingId/tests/:testId/finalize", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { bookingId, testId } = req.params;

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const testReportStatus = booking.testReportStatus || [];
      const statusIndex = testReportStatus.findIndex((s: any) => s.testId === testId);

      if (statusIndex < 0) {
        return res.status(400).json({ message: "No report found for this test" });
      }

      testReportStatus[statusIndex].status = "finalized";
      testReportStatus[statusIndex].finalizedAt = new Date().toISOString();

      // Check if all tests are finalized
      const allFinalized = booking.testIds.every((tid: string) => {
        const status = testReportStatus.find((s: any) => s.testId === tid);
        return status?.status === "finalized";
      });

      const updatedBooking = await storage.updateBooking(bookingId, {
        testReportStatus,
        status: allFinalized ? "report_ready" : booking.status,
      });

      res.json({
        booking: updatedBooking,
        allCompleted: allFinalized,
      });
    } catch (error) {
      console.error("Error finalizing report:", error);
      res.status(500).json({ message: "Failed to finalize report" });
    }
  });

  // Create test
  app.post("/api/admin/tests", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { name, code, category, price, duration, description, parameters, imageUrl } = req.body;

      if (!name || !code || !category || !price || !duration || !parameters) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const existing = await storage.getTestByCode(code);
      if (existing) {
        return res.status(400).json({ message: "Test code already exists" });
      }

      const test = await storage.createTest({
        name,
        code,
        category,
        price: price.toString(),
        duration,
        description: description || null,
        parameters,
        imageUrl: imageUrl || null,
      });

      res.json(test);
    } catch (error) {
      console.error("Error creating test:", error);
      res.status(500).json({ message: "Failed to create test" });
    }
  });

  // ==================== REVIEWS ROUTES ====================

  // Get approved reviews (public)
  app.get("/api/reviews", async (req, res) => {
    try {
      const reviews = await storage.getApprovedReviews();
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Submit a review (public)
  app.post("/api/reviews", async (req, res) => {
    try {
      const { name, location, rating, review } = req.body;

      if (!name || !location || !rating || !review) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      const newReview = await storage.createReview({
        name,
        location,
        rating,
        review,
        isApproved: false,
      });

      res.json({ message: "Review submitted successfully. It will appear after approval.", review: newReview });
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to submit review" });
    }
  });

  // Get all reviews (admin)
  app.get("/api/admin/reviews", authenticateToken, adminOnly, async (req, res) => {
    try {
      const reviews = await storage.getAllReviews();
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Approve/reject review (admin)
  app.patch("/api/admin/reviews/:id/approve", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const { isApproved } = req.body;

      const review = await storage.updateReviewApproval(id, isApproved);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      res.json(review);
    } catch (error) {
      console.error("Error updating review:", error);
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  // Delete review (admin)
  app.delete("/api/admin/reviews/:id", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteReview(id);
      res.json({ message: "Review deleted successfully" });
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // ==================== ADVERTISEMENTS ROUTES ====================

  // Get active advertisements (public)
  app.get("/api/advertisements", async (req, res) => {
    try {
      const ads = await storage.getActiveAdvertisements();
      res.json(ads);
    } catch (error) {
      console.error("Error fetching advertisements:", error);
      res.status(500).json({ message: "Failed to fetch advertisements" });
    }
  });

  // Get all advertisements (admin)
  app.get("/api/admin/advertisements", authenticateToken, adminOnly, async (req, res) => {
    try {
      const ads = await storage.getAllAdvertisements();
      res.json(ads);
    } catch (error) {
      console.error("Error fetching advertisements:", error);
      res.status(500).json({ message: "Failed to fetch advertisements" });
    }
  });

  // Upload banner image (admin)
  app.post("/api/admin/upload-banner", authenticateToken, adminOnly, uploadBanner.single("banner"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const imageUrl = `/uploads/banners/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading banner:", error);
      res.status(500).json({ message: "Failed to upload banner" });
    }
  });

  // Create advertisement (admin)
  app.post("/api/admin/advertisements", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { title, subtitle, description, gradient, icon, imageUrl, ctaText, ctaLink, isActive, sortOrder } = req.body;

      if (!title || !subtitle || !description || !gradient || !icon || !ctaText || !ctaLink) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const ad = await storage.createAdvertisement({
        title,
        subtitle,
        description,
        gradient,
        icon,
        imageUrl: imageUrl || null,
        ctaText,
        ctaLink,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder || 0,
      });

      res.json(ad);
    } catch (error) {
      console.error("Error creating advertisement:", error);
      res.status(500).json({ message: "Failed to create advertisement" });
    }
  });

  // Update advertisement (admin)
  app.patch("/api/admin/advertisements/:id", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const ad = await storage.updateAdvertisement(id, updates);
      if (!ad) {
        return res.status(404).json({ message: "Advertisement not found" });
      }

      res.json(ad);
    } catch (error) {
      console.error("Error updating advertisement:", error);
      res.status(500).json({ message: "Failed to update advertisement" });
    }
  });

  // Delete advertisement (admin)
  app.delete("/api/admin/advertisements/:id", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAdvertisement(id);
      res.json({ message: "Advertisement deleted successfully" });
    } catch (error) {
      console.error("Error deleting advertisement:", error);
      res.status(500).json({ message: "Failed to delete advertisement" });
    }
  });

  // ==================== HEALTH PACKAGES ROUTES ====================

  // Get all active health packages (public)
  app.get("/api/health-packages", async (req, res) => {
    try {
      const { category } = req.query;
      let packages;
      if (category && typeof category === 'string') {
        packages = await storage.getHealthPackagesByCategory(category);
      } else {
        packages = await storage.getActiveHealthPackages();
      }
      
      // Calculate discounted prices
      const packagesWithPrices = packages.map(pkg => {
        const originalPrice = Number(pkg.originalPrice);
        const discountedPrice = originalPrice * (1 - pkg.discountPercentage / 100);
        return {
          ...pkg,
          discountedPrice: discountedPrice.toFixed(2),
          savings: (originalPrice - discountedPrice).toFixed(2),
        };
      });
      
      res.json(packagesWithPrices);
    } catch (error) {
      console.error("Error fetching health packages:", error);
      res.status(500).json({ message: "Failed to fetch health packages" });
    }
  });

  // Get single health package with tests details (public)
  app.get("/api/health-packages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const pkg = await storage.getHealthPackage(id);
      
      if (!pkg) {
        return res.status(404).json({ message: "Health package not found" });
      }

      // Get tests included in the package
      const allTests = await storage.getAllTests();
      const includedTests = allTests.filter(test => pkg.testIds.includes(test.id));

      const originalPrice = Number(pkg.originalPrice);
      const discountedPrice = originalPrice * (1 - pkg.discountPercentage / 100);

      res.json({
        ...pkg,
        discountedPrice: discountedPrice.toFixed(2),
        savings: (originalPrice - discountedPrice).toFixed(2),
        tests: includedTests,
      });
    } catch (error) {
      console.error("Error fetching health package:", error);
      res.status(500).json({ message: "Failed to fetch health package" });
    }
  });

  // Get all health packages (admin)
  app.get("/api/admin/health-packages", authenticateToken, adminOnly, async (req, res) => {
    try {
      const packages = await storage.getAllHealthPackages();
      res.json(packages);
    } catch (error) {
      console.error("Error fetching health packages:", error);
      res.status(500).json({ message: "Failed to fetch health packages" });
    }
  });

  // Create health package (admin)
  app.post("/api/admin/health-packages", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { name, category, description, testIds, reportTime, originalPrice, discountPercentage, isActive, imageUrl, sortOrder } = req.body;

      if (!name || !category || !testIds || !reportTime || !originalPrice) {
        return res.status(400).json({ message: "Name, category, tests, report time, and price are required" });
      }

      const pkg = await storage.createHealthPackage({
        name,
        category,
        description: description || null,
        testIds,
        reportTime,
        originalPrice,
        discountPercentage: discountPercentage || 0,
        isActive: isActive !== undefined ? isActive : true,
        imageUrl: imageUrl || null,
        sortOrder: sortOrder || 0,
      });

      res.json(pkg);
    } catch (error) {
      console.error("Error creating health package:", error);
      res.status(500).json({ message: "Failed to create health package" });
    }
  });

  // Update health package (admin)
  app.patch("/api/admin/health-packages/:id", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const pkg = await storage.updateHealthPackage(id, updates);
      if (!pkg) {
        return res.status(404).json({ message: "Health package not found" });
      }

      res.json(pkg);
    } catch (error) {
      console.error("Error updating health package:", error);
      res.status(500).json({ message: "Failed to update health package" });
    }
  });

  // Delete health package (admin)
  app.delete("/api/admin/health-packages/:id", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteHealthPackage(id);
      res.json({ message: "Health package deleted successfully" });
    } catch (error) {
      console.error("Error deleting health package:", error);
      res.status(500).json({ message: "Failed to delete health package" });
    }
  });

  // ==================== LAB SETTINGS & LOCATION ROUTES ====================

  // Get lab settings (public - for distance calculation)
  app.get("/api/lab-settings", async (req, res) => {
    try {
      let settings = await storage.getLabSettings();
      
      // Return default settings if none exist
      if (!settings) {
        settings = {
          id: '',
          labName: "Archana Pathology Lab",
          labLatitude: "26.8467" as any,
          labLongitude: "80.9462" as any,
          maxCollectionDistance: 40,
          address: "Lucknow, Uttar Pradesh",
          phone: null,
          email: null,
          updatedAt: new Date(),
        };
      }

      res.json({
        labName: settings.labName,
        latitude: Number(settings.labLatitude),
        longitude: Number(settings.labLongitude),
        maxCollectionDistance: settings.maxCollectionDistance,
        address: settings.address,
      });
    } catch (error) {
      console.error("Error fetching lab settings:", error);
      res.status(500).json({ message: "Failed to fetch lab settings" });
    }
  });

  // Calculate distance from lab
  app.post("/api/calculate-distance", async (req, res) => {
    try {
      const { userLatitude, userLongitude } = req.body;

      if (!userLatitude || !userLongitude) {
        return res.status(400).json({ message: "User coordinates are required" });
      }

      let settings = await storage.getLabSettings();
      
      // Default lab location (Lucknow)
      const labLat = settings ? Number(settings.labLatitude) : 26.8467;
      const labLng = settings ? Number(settings.labLongitude) : 80.9462;
      const maxDistance = settings?.maxCollectionDistance || 40;

      // Haversine formula to calculate distance
      const R = 6371; // Earth's radius in km
      const dLat = (userLatitude - labLat) * Math.PI / 180;
      const dLon = (userLongitude - labLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(labLat * Math.PI / 180) * Math.cos(userLatitude * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      const isWithinRange = distance <= maxDistance;

      res.json({
        distance: distance.toFixed(2),
        isWithinRange,
        maxDistance,
        message: isWithinRange 
          ? `Sample collection available (${distance.toFixed(1)} km from lab)`
          : `Sample collection not available beyond ${maxDistance} km. You are ${distance.toFixed(1)} km away.`,
      });
    } catch (error) {
      console.error("Error calculating distance:", error);
      res.status(500).json({ message: "Failed to calculate distance" });
    }
  });

  // Update lab settings (admin)
  app.post("/api/admin/lab-settings", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { labName, labLatitude, labLongitude, maxCollectionDistance, address, phone, email } = req.body;

      if (!labName || !labLatitude || !labLongitude) {
        return res.status(400).json({ message: "Lab name and coordinates are required" });
      }

      const settings = await storage.updateLabSettings({
        labName,
        labLatitude,
        labLongitude,
        maxCollectionDistance: maxCollectionDistance || 40,
        address: address || null,
        phone: phone || null,
        email: email || null,
      });

      res.json(settings);
    } catch (error) {
      console.error("Error updating lab settings:", error);
      res.status(500).json({ message: "Failed to update lab settings" });
    }
  });

  // Get lab settings (admin - full details)
  app.get("/api/admin/lab-settings", authenticateToken, adminOnly, async (req, res) => {
    try {
      const settings = await storage.getLabSettings();
      res.json(settings || null);
    } catch (error) {
      console.error("Error fetching lab settings:", error);
      res.status(500).json({ message: "Failed to fetch lab settings" });
    }
  });

  // ==================== WALK-IN COLLECTIONS ROUTES ====================

  // Get all walk-in collections
  app.get("/api/admin/walkin-collections", authenticateToken, adminOnly, async (req, res) => {
    try {
      const collections = await storage.getAllWalkinCollections();
      res.json(collections);
    } catch (error) {
      console.error("Error fetching walk-in collections:", error);
      res.status(500).json({ message: "Failed to fetch walk-in collections" });
    }
  });

  // Get walk-in collection details with patient and tests
  app.get("/api/admin/walkin-collections/:id", authenticateToken, adminOnly, async (req, res) => {
    try {
      const collection = await storage.getWalkinCollection(req.params.id);
      if (!collection) {
        return res.status(404).json({ message: "Walk-in collection not found" });
      }

      const patient = await storage.getPatient(collection.patientId);
      const allTests = await storage.getAllTests();
      const tests = allTests.filter(t => collection.testIds.includes(t.id));

      res.json({
        collection,
        patient,
        tests,
      });
    } catch (error) {
      console.error("Error fetching walk-in collection details:", error);
      res.status(500).json({ message: "Failed to fetch walk-in collection details" });
    }
  });

  // Create walk-in collection
  app.post("/api/admin/walkin-collections", authenticateToken, adminOnly, async (req, res) => {
    try {
      const createSchema = z.object({
        patientId: z.string().min(1, "Patient ID is required"),
        doctorName: z.string().nullable().optional(),
        doctorClinic: z.string().nullable().optional(),
        testIds: z.array(z.string()).min(1, "At least one test is required"),
        notes: z.string().nullable().optional(),
      });

      const validationResult = createSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors 
        });
      }

      const { patientId, doctorName, doctorClinic, testIds, notes } = validationResult.data;

      const testReportStatus = testIds.map((testId: string) => ({
        testId,
        status: "pending" as const,
      }));

      const collection = await storage.createWalkinCollection({
        patientId,
        doctorName: doctorName || null,
        doctorClinic: doctorClinic || null,
        testIds,
        testReportStatus,
        status: "pending",
        collectedAt: new Date(),
        notes: notes || null,
      });

      res.status(201).json(collection);
    } catch (error) {
      console.error("Error creating walk-in collection:", error);
      res.status(500).json({ message: "Failed to create walk-in collection" });
    }
  });

  // Update walk-in collection status
  app.patch("/api/admin/walkin-collections/:id/status", authenticateToken, adminOnly, async (req, res) => {
    try {
      const updateSchema = z.object({
        status: z.enum(["pending", "processing", "report_ready", "completed"]),
      });

      const validationResult = updateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors 
        });
      }

      const { status } = validationResult.data;
      const collection = await storage.updateWalkinCollection(req.params.id, { status });
      if (!collection) {
        return res.status(404).json({ message: "Walk-in collection not found" });
      }
      res.json(collection);
    } catch (error) {
      console.error("Error updating walk-in collection status:", error);
      res.status(500).json({ message: "Failed to update walk-in collection status" });
    }
  });

  // Save report for a test in walk-in collection
  app.post("/api/admin/walkin-collections/:collectionId/tests/:testId/report", authenticateToken, adminOnly, async (req, res) => {
    try {
      const { collectionId, testId } = req.params;

      const reportSchema = z.object({
        technician: z.string().optional(),
        referredBy: z.string().optional(),
        parameterResults: z.array(z.object({
          parameterName: z.string(),
          value: z.string(),
          unit: z.string(),
          normalRange: z.string(),
          isAbnormal: z.boolean(),
        })),
        remarks: z.string().optional(),
        finalize: z.boolean(),
      });

      const validationResult = reportSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors 
        });
      }

      const { technician, referredBy, parameterResults, remarks, finalize } = validationResult.data;

      const collection = await storage.getWalkinCollection(collectionId);
      if (!collection) {
        return res.status(404).json({ message: "Walk-in collection not found" });
      }

      const test = await storage.getTest(testId);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }

      // Create result
      const result = await storage.createResult({
        patientId: collection.patientId,
        testId,
        parameterResults,
        technician: technician || "Lab Technician",
        referredBy: referredBy || null,
        collectedAt: collection.collectedAt,
      });

      // Update test report status
      const testReportStatus = collection.testReportStatus || [];
      const existingIndex = testReportStatus.findIndex(t => t.testId === testId);
      const newStatus = {
        testId,
        status: finalize ? "finalized" as const : "entered" as const,
        resultId: result.id,
        enteredAt: new Date().toISOString(),
        finalizedAt: finalize ? new Date().toISOString() : undefined,
      };

      if (existingIndex >= 0) {
        testReportStatus[existingIndex] = newStatus;
      } else {
        testReportStatus.push(newStatus);
      }

      // If finalized, create report
      let reportId: string | undefined;
      if (finalize) {
        const secureToken = randomBytes(32).toString('hex');
        const report = await storage.createReport({
          patientId: collection.patientId,
          resultId: result.id,
          secureDownloadToken: secureToken,
        });
        reportId = report.id;
        if (existingIndex >= 0) {
          testReportStatus[existingIndex].reportId = reportId;
        } else {
          testReportStatus[testReportStatus.length - 1].reportId = reportId;
        }
      }

      // Check if all tests are completed
      const allCompleted = collection.testIds.every(tid => 
        testReportStatus.find(t => t.testId === tid && t.status === "finalized")
      );

      await storage.updateWalkinCollection(collectionId, {
        testReportStatus,
        status: allCompleted ? "report_ready" : "processing",
      });

      res.json({ 
        success: true, 
        resultId: result.id,
        reportId,
        allCompleted,
      });
    } catch (error) {
      console.error("Error saving walk-in collection report:", error);
      res.status(500).json({ message: "Failed to save report" });
    }
  });

  // Delete walk-in collection
  app.delete("/api/admin/walkin-collections/:id", authenticateToken, adminOnly, async (req, res) => {
    try {
      await storage.deleteWalkinCollection(req.params.id);
      res.json({ message: "Walk-in collection deleted successfully" });
    } catch (error) {
      console.error("Error deleting walk-in collection:", error);
      res.status(500).json({ message: "Failed to delete walk-in collection" });
    }
  });

  // ==================== NOTIFICATION ROUTES ====================

  app.get("/api/notifications", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (user.type === 'admin') {
        const notifications = await notificationService.getAdminNotifications();
        const unreadCount = await notificationService.getUnreadCount();
        res.json({ notifications, unreadCount });
      } else {
        const notifications = await notificationService.getPatientNotifications(user.id);
        const unreadCount = await notificationService.getUnreadCount(user.id);
        res.json({ notifications, unreadCount });
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const isAdmin = user.type === 'admin';
      const count = await notificationService.getUnreadCount(isAdmin ? undefined : user.id);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.patch("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      // Verify ownership before marking as read
      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      // Patients can only mark their own notifications as read
      if (user.type !== 'admin') {
        if (notification.patientId !== user.id) {
          return res.status(403).json({ message: "Not authorized to modify this notification" });
        }
        if (notification.recipientType !== 'patient' && notification.recipientType !== 'both') {
          return res.status(403).json({ message: "Not authorized to modify this notification" });
        }
      }
      
      const updatedNotification = await notificationService.markAsRead(id);
      res.json(updatedNotification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/mark-all-read", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const isAdmin = user.type === 'admin';
      await notificationService.markAllAsRead(isAdmin ? undefined : user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  return httpServer;
}
