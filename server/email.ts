import nodemailer from "nodemailer";
import type { Booking, Patient, Test, HealthPackage } from "@shared/schema";

const LAB_NAME = "Archana Pathology Lab";
const LAB_EMAIL = "info@archanapathology.com";
const LAB_PHONE = "+91 98765 43210";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_API_KEY = process.env.BREVO_API_KEY;

let transporter: any = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log('📧 [TRANSPORTER] Using Gmail for local dev');
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    return transporter;
  }

  return null;
};

async function sendViaBrevoAPI(to: string, subject: string, html: string): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY not configured');
      return false;
    }

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: LAB_NAME,
          email: process.env.BREVO_SENDER_EMAIL || "noreply@archanapathology.com"
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Brevo API error:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('✅ Email sent via Brevo API:', result.messageId);
    return true;

  } catch (error: any) {
    console.error('❌ Brevo API request failed:', error.message);
    return false;
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (BREVO_API_KEY) {
    console.log('📤 [EMAIL] Sending via Brevo API');
    const success = await sendViaBrevoAPI(to, subject, html);
    if (success) return true;
  }

  try {
    const transporterInstance = getTransporter();
    if (transporterInstance) {
      console.log('📤 [EMAIL] Falling back to SMTP');
      await transporterInstance.sendMail({
        from: `"${LAB_NAME}" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      });
      console.log('✅ Email sent via SMTP');
      return true;
    }
  } catch (error: any) {
    console.error('❌ SMTP fallback failed:', error.message);
  }

  console.log('[DEV MODE] No email service available - email would be sent to:', to);
  return true;
}

function getBaseEmailTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #005B96, #0081D5); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .header p { margin: 5px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 30px 25px; background: white; }
        .info-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #005B96; }
        .info-box h3 { margin: 0 0 10px; color: #005B96; font-size: 16px; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #666; font-size: 14px; }
        .info-value { color: #333; font-weight: 500; font-size: 14px; }
        .btn { display: inline-block; background: #005B96; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 15px 0; }
        .btn:hover { background: #004a7a; }
        .status-badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-success { background: #d4edda; color: #155724; }
        .status-processing { background: #cce5ff; color: #004085; }
        .footer { background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e9ecef; }
        .footer p { margin: 5px 0; color: #666; font-size: 13px; }
        .footer a { color: #005B96; text-decoration: none; }
        .highlight { color: #005B96; font-weight: 600; }
        .test-list { margin: 15px 0; padding: 0; }
        .test-item { background: #f8f9fa; padding: 10px 15px; margin: 5px 0; border-radius: 4px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${LAB_NAME}</h1>
          <p>NABL Accredited | Quality Healthcare</p>
        </div>
        ${content}
        <div class="footer">
          <p><strong>${LAB_NAME}</strong></p>
          <p>NABL Accredited Diagnostic Center</p>
          <p>Contact: ${LAB_PHONE} | <a href="mailto:${LAB_EMAIL}">${LAB_EMAIL}</a></p>
          <p style="margin-top: 15px; font-size: 11px; color: #999;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendOtpEmail(to: string, otp: string, purpose: string): Promise<boolean> {
  console.log(`📧 [SENDOTP] Starting email send for ${to} (purpose: ${purpose})`);
  
  const subject = purpose === "email_verification" 
    ? "Verify Your Email - Archana Pathology Lab"
    : "Password Reset OTP - Archana Pathology Lab";
  
  const purposeText = purpose === "email_verification"
    ? "verify your email address"
    : "reset your password";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #005B96, #87CEEB); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .otp-box { background: #005B96; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .warning { color: #e74c3c; font-size: 14px; margin-top: 20px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Archana Pathology Lab</h1>
        </div>
        <div class="content">
          <h2>Your One-Time Password</h2>
          <p>Use the following OTP to ${purposeText}:</p>
          <div class="otp-box">${otp}</div>
          <p>This OTP is valid for <strong>5 minutes</strong> and can only be used once.</p>
          <p class="warning">If you did not request this OTP, please ignore this email or contact our support team.</p>
        </div>
        <div class="footer">
          <p>Archana Pathology Lab | NABL Accredited</p>
          <p>Contact: +91 98765 43210 | info@archanapathology.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  setImmediate(async () => {
    try {
      await sendEmail(to, subject, html);
    } catch (error: any) {
      console.error(`❌ [SENDOTP] Email send FAILED for ${to}:`, {
        message: error?.message,
        code: error?.code,
        command: error?.command,
      });
      console.log(`🔑 [FALLBACK] OTP for ${to}: ${otp}`);
    }
  });

  return true;
}

export interface BookingEmailData {
  booking: Booking;
  patientName: string;
  tests: Test[];
  healthPackage?: HealthPackage;
  totalAmount: number;
}

export async function sendBookingConfirmationEmail(email: string, data: BookingEmailData): Promise<boolean> {
  const { patientName, tests, healthPackage, totalAmount, booking } = data;
  const slotDate = new Date(booking.slot).toLocaleDateString('en-IN', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  const slotTime = new Date(booking.slot).toLocaleTimeString('en-IN', { 
    hour: '2-digit', minute: '2-digit' 
  });
  
  const testListHtml = tests.map(t => `<div class="test-item">${t.name}</div>`).join('');
  
  const content = `
    <div class="content">
      <h2 style="color: #005B96; margin-bottom: 20px;">Booking Confirmed!</h2>
      <p>Dear <span class="highlight">${patientName}</span>,</p>
      <p>Thank you for choosing ${LAB_NAME}. Your ${booking.type === 'home_collection' ? 'home collection' : 'lab visit'} has been successfully booked.</p>
      
      <div class="info-box">
        <h3>Booking Details</h3>
        <div class="info-row"><span class="info-label">Booking ID</span><span class="info-value">${booking.id.slice(-8).toUpperCase()}</span></div>
        <div class="info-row"><span class="info-label">Date</span><span class="info-value">${slotDate}</span></div>
        <div class="info-row"><span class="info-label">Time</span><span class="info-value">${slotTime}</span></div>
        <div class="info-row"><span class="info-label">Type</span><span class="info-value">${booking.type === 'home_collection' ? 'Home Collection' : 'Lab Visit'}</span></div>
        ${booking.collectionAddress ? `<div class="info-row"><span class="info-label">Address</span><span class="info-value">${booking.collectionAddress}</span></div>` : ''}
      </div>
      
      ${healthPackage ? `
        <div class="info-box">
          <h3>Health Package</h3>
          <div class="info-row"><span class="info-label">Package</span><span class="info-value">${healthPackage.name}</span></div>
        </div>
      ` : ''}
      
      <div class="info-box">
        <h3>Tests Included</h3>
        <div class="test-list">${testListHtml}</div>
      </div>
      
      <div class="info-box">
        <h3>Payment Summary</h3>
        <div class="info-row"><span class="info-label">Total Amount</span><span class="info-value" style="color: #005B96; font-size: 16px;">₹${totalAmount.toFixed(2)}</span></div>
        <div class="info-row"><span class="info-label">Payment Status</span><span class="status-badge ${booking.paymentStatus === 'verified' ? 'status-success' : 'status-pending'}">${booking.paymentStatus}</span></div>
      </div>
      
      <p style="margin-top: 25px;">If you have any questions, please contact us at ${LAB_PHONE}.</p>
    </div>
  `;

  return sendEmail(email, `Booking Confirmed - ${LAB_NAME}`, getBaseEmailTemplate(content));
}

export async function sendReportReadyEmail(email: string, patientName: string, testNames: string[], downloadUrl?: string): Promise<boolean> {
  const testListHtml = testNames.map(t => `<div class="test-item">${t}</div>`).join('');
  
  const content = `
    <div class="content">
      <h2 style="color: #28a745; margin-bottom: 20px;">Your Report is Ready!</h2>
      <p>Dear <span class="highlight">${patientName}</span>,</p>
      <p>Great news! Your test results are now available.</p>
      
      <div class="info-box">
        <h3>Tests Completed</h3>
        <div class="test-list">${testListHtml}</div>
      </div>
      
      ${downloadUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${downloadUrl}" class="btn">Download Report</a>
        </div>
      ` : `
        <p>Please log in to your account to view and download your reports.</p>
      `}
      
      <p style="margin-top: 25px;">If you have any questions about your results, please consult with your physician or contact our lab at ${LAB_PHONE}.</p>
    </div>
  `;

  return sendEmail(email, `Your Test Report is Ready - ${LAB_NAME}`, getBaseEmailTemplate(content));
}

export async function sendPaymentReceivedEmail(email: string, patientName: string, amount: number, paymentMethod: string, bookingId: string): Promise<boolean> {
  const content = `
    <div class="content">
      <h2 style="color: #28a745; margin-bottom: 20px;">Payment Received</h2>
      <p>Dear <span class="highlight">${patientName}</span>,</p>
      <p>We have received your payment. Thank you!</p>
      
      <div class="info-box">
        <h3>Payment Details</h3>
        <div class="info-row"><span class="info-label">Booking Reference</span><span class="info-value">${bookingId.slice(-8).toUpperCase()}</span></div>
        <div class="info-row"><span class="info-label">Amount</span><span class="info-value" style="color: #28a745; font-weight: 600;">₹${amount.toFixed(2)}</span></div>
        <div class="info-row"><span class="info-label">Payment Method</span><span class="info-value">${paymentMethod.replace(/_/g, ' ').toUpperCase()}</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="status-badge status-success">Verified</span></div>
      </div>
      
      <p style="margin-top: 25px;">If you have any questions, please contact us at ${LAB_PHONE}.</p>
    </div>
  `;

  return sendEmail(email, `Payment Confirmation - ${LAB_NAME}`, getBaseEmailTemplate(content));
}

export async function sendAdminNotificationEmail(adminEmail: string, subject: string, message: string, details?: Record<string, string>): Promise<boolean> {
  let detailsHtml = '';
  if (details) {
    detailsHtml = Object.entries(details)
      .map(([key, value]) => `<div class="info-row"><span class="info-label">${key}</span><span class="info-value">${value}</span></div>`)
      .join('');
  }
  
  const content = `
    <div class="content">
      <h2 style="color: #005B96; margin-bottom: 20px;">Admin Notification</h2>
      <p>${message}</p>
      
      ${detailsHtml ? `
        <div class="info-box">
          <h3>Details</h3>
          ${detailsHtml}
        </div>
      ` : ''}
      
      <p style="margin-top: 25px; color: #666; font-size: 13px;">This is an automated notification from ${LAB_NAME} system.</p>
    </div>
  `;

  return sendEmail(adminEmail, subject, getBaseEmailTemplate(content));
}

export async function sendSampleCollectedEmail(email: string, patientName: string, testNames: string[], expectedTime: string): Promise<boolean> {
  const testListHtml = testNames.map(t => `<div class="test-item">${t}</div>`).join('');
  
  const content = `
    <div class="content">
      <h2 style="color: #005B96; margin-bottom: 20px;">Sample Collected Successfully</h2>
      <p>Dear <span class="highlight">${patientName}</span>,</p>
      <p>Your sample has been collected and is now being processed at our laboratory.</p>
      
      <div class="info-box">
        <h3>Tests Being Processed</h3>
        <div class="test-list">${testListHtml}</div>
      </div>
      
      <div class="info-box">
        <h3>Expected Report Time</h3>
        <p style="margin: 0; color: #005B96; font-weight: 600;">${expectedTime}</p>
      </div>
      
      <p>We will notify you via email and SMS once your reports are ready.</p>
      <p style="margin-top: 25px;">If you have any questions, please contact us at ${LAB_PHONE}.</p>
    </div>
  `;

  return sendEmail(email, `Sample Collected - ${LAB_NAME}`, getBaseEmailTemplate(content));
}