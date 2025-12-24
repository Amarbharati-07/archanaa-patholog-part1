import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase } from "./seed";
import dotenv from "dotenv";

dotenv.config();

// ✅ ENVIRONMENT VALIDATION - FAIL FAST
const requiredEnvVars = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "JWT_SECRET",
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error("❌ FATAL: Missing required environment variables:", missingVars.join(", "));
  process.exit(1);
}

// ✅ LOG LOADED ENVIRONMENT VARIABLES
console.log("✅ Environment Variables Loaded:");
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 50)}...`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || "development"}`);
console.log(`   PORT: ${process.env.PORT || "5000"}`);
console.log(`   EMAIL_USER: ${process.env.EMAIL_USER ? "✅ Configured" : "⚠️ Not configured (dev mode)"}`);
console.log(`   BREVO_SMTP: ${process.env.BREVO_SMTP_HOST ? "✅ Configured" : "⚠️ Not configured"}`);
console.log(`   RAZORPAY: ${process.env.RAZORPAY_KEY_ID ? "✅ Configured" : "⚠️ Not configured (payments disabled)"}`);

const app = express();
const httpServer = createServer(app);

/* ================= RAW BODY SUPPORT ================= */
declare module "http" {
  interface IncomingMessage {
    rawBody: Buffer;
  }
}

/* ================= MIDDLEWARE ================= */
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static("uploads"));

/* ================= LOGGER ================= */
export const log = (message: string, source = "express") => {
  console.log(`${new Date().toLocaleTimeString()} [${source}] ${message}`);
};

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  let capturedJsonResponse: any;

  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    capturedJsonResponse = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    if (path.startsWith("/api")) {
      log(
        `${req.method} ${path} ${res.statusCode} in ${Date.now() - start}ms :: ${
          capturedJsonResponse ? JSON.stringify(capturedJsonResponse) : ""
        }`
      );
    }
  });

  next();
});

/* ================= MAIN BOOTSTRAP ================= */
(async () => {
  try {
    // ✅ Register all API routes (auth, otp, payment, admin, etc.)
    await registerRoutes(httpServer, app);

    // ✅ Seed DB (safe, idempotent)
    await seedDatabase();

    // ✅ Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("❌ Server Error:", err);
      res.status(err.status || 500).json({
        message: err.message || "Internal Server Error",
      });
    });

    // ✅ Frontend handling
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);

    httpServer.listen(
      {
        port,
        host: "0.0.0.0",
      },
      () => log(`Server running at http://localhost:${port}`)
    );
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();
