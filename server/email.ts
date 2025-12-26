import nodemailer from "nodemailer";

const BREVO_SMTP_HOST = process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com";
const BREVO_SMTP_PORT = parseInt(process.env.BREVO_SMTP_PORT || "587");
const BREVO_SMTP_USER = process.env.BREVO_SMTP_USER;
const BREVO_SMTP_PASS = process.env.BREVO_SMTP_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "archanapathologylaboratory@gmail.com";

const transporter = nodemailer.createTransport({
  host: BREVO_SMTP_HOST,
  port: BREVO_SMTP_PORT,
  secure: false,
  auth: {
    user: BREVO_SMTP_USER,
    pass: BREVO_SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

const SENDER = `"Archana Pathology Lab" <${ADMIN_EMAIL}>`;

export async function sendOtpEmail(to: string, otp: string, purpose: string): Promise<boolean> {
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
      <meta charset="utf-8">
      <style>
        body { font-family: sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { text-align: center; border-bottom: 2px solid #005B96; padding-bottom: 15px; margin-bottom: 20px; }
        .otp { font-size: 36px; font-weight: bold; color: #005B96; text-align: center; margin: 30px 0; letter-spacing: 8px; font-family: monospace; }
        .footer { font-size: 12px; color: #777; text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="color: #005B96; margin: 0;">Archana Pathology Lab</h2>
        </div>
        <p>Hello,</p>
        <p>Use the following One-Time Password (OTP) to ${purposeText}:</p>
        <div class="otp">${otp}</div>
        <p>This code is valid for <strong>5 minutes</strong>. For security, please do not share this OTP with anyone.</p>
        <p>If you did not request this code, you can safely ignore this email.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Archana Pathology Lab. NABL Accredited Diagnostic Center.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: SENDER,
      to,
      subject,
      html,
    });
    console.log(`✅ [SMTP] Email sent to ${to}. Response: ${info.response}`);
    return true;
  } catch (error: any) {
    console.error(`❌ [SMTP] Failed to send email to ${to}:`, {
      message: error.message,
      code: error.code,
      responseCode: error.responseCode,
      command: error.command
    });
    return false;
  }
}

export async function sendAdminNotificationEmail(adminEmail: string, subject: string, message: string, details?: Record<string, string>): Promise<boolean> {
  let detailsHtml = '';
  if (details) {
    detailsHtml = Object.entries(details)
      .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
      .join('');
  }
  
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #005B96;">Admin Notification</h2>
      <p>${message}</p>
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 15px;">
        ${detailsHtml}
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: SENDER,
      to: adminEmail,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send admin notification:", error);
    return false;
  }
}

export async function sendBookingConfirmationEmail(email: string, data: any): Promise<boolean> {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #005B96;">Booking Confirmed</h2>
      <p>Your booking with Archana Pathology Lab has been successfully received.</p>
      <p>Our team will contact you shortly for the next steps.</p>
    </div>
  `;
  try {
    await transporter.sendMail({
      from: SENDER,
      to: email,
      subject: "Booking Confirmed - Archana Pathology Lab",
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send booking confirmation:", error);
    return false;
  }
}

export async function sendReportReadyEmail(email: string, patientName: string, testNames: string[], downloadUrl?: string): Promise<boolean> {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #28a745;">Report Ready</h2>
      <p>Dear ${patientName},</p>
      <p>Your test reports are now available for viewing and download.</p>
      ${downloadUrl ? `<p><a href="${downloadUrl}" style="background: #005B96; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Report</a></p>` : ''}
    </div>
  `;
  try {
    await transporter.sendMail({
      from: SENDER,
      to: email,
      subject: "Your Test Report is Ready - Archana Pathology Lab",
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send report ready email:", error);
    return false;
  }
}

export async function sendPaymentReceivedEmail(email: string, patientName: string, amount: number, paymentMethod: string, bookingId: string): Promise<boolean> {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #28a745;">Payment Received</h2>
      <p>Dear ${patientName},</p>
      <p>We have successfully received your payment of <strong>Rs. ${amount}</strong> via ${paymentMethod}.</p>
      <p>Booking ID: ${bookingId}</p>
    </div>
  `;
  try {
    await transporter.sendMail({
      from: SENDER,
      to: email,
      subject: "Payment Confirmation - Archana Pathology Lab",
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send payment confirmation email:", error);
    return false;
  }
}

export async function sendSampleCollectedEmail(email: string, patientName: string, testNames: string[], expectedTime: string): Promise<boolean> {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #005B96;">Sample Collected</h2>
      <p>Dear ${patientName},</p>
      <p>Your samples have been collected and are being processed.</p>
      <p>Expected report time: <strong>${expectedTime}</strong></p>
    </div>
  `;
  try {
    await transporter.sendMail({
      from: SENDER,
      to: email,
      subject: "Sample Collected - Archana Pathology Lab",
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send sample collection email:", error);
    return false;
  }
}
