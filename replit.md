# Archana Pathology Lab Application

## Overview
This is a full-stack pathology lab management application built with React, Express, and PostgreSQL. It enables patients to book lab tests, view results, and manage their health records. Admin users can manage tests, patients, bookings, and generate reports.

## Architecture

### Stack
- **Frontend**: React 18 with Vite, TailwindCSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Passport.js with local strategy, Firebase for optional phone auth

### Project Structure
```
├── client/           # React frontend
│   ├── src/          # Source files
│   └── public/       # Static assets
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API routes
│   ├── db.ts         # Database connection
│   ├── storage.ts    # Data access layer
│   └── vite.ts       # Vite dev middleware
├── shared/           # Shared code
│   └── schema.ts     # Database schema (Drizzle)
├── uploads/          # File uploads directory
└── script/           # Build scripts
```

### Key Features
- Patient registration and authentication
- Lab test catalog with categories
- Health package bookings
- Online appointment scheduling
- Test result reports
- Admin dashboard for lab management
- Payment integration (Razorpay)
- Email notifications (Nodemailer)
- Prescription management with role-based access

## Development

### Running Locally
The application runs on port 5000. Use the workflow "Start application" which executes:
```bash
npm run dev
```

### Database
- Uses PostgreSQL via Drizzle ORM
- Schema defined in `shared/schema.ts`
- Push schema changes with: `npm run db:push`

### Default Admin Credentials
- Username: admin
- Password: admin123

## Deployment to Render

### Required Environment Variables
Before deploying to Render, set these environment variables in your Render project settings:

```
DATABASE_URL=postgresql://username:password@host/database
NODE_ENV=production
SESSION_SECRET=your-random-secret-here
PORT=5000
```

### Optional Environment Variables (for email notifications)
```
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
ADMIN_EMAIL=admin@archanapathology.com
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

### Build & Deployment Config
- Build: `npm run build`
- Start: `npm run start` (uses cross-env for environment variables)
- Deployment target: Autoscale with 5000 port binding

## API Endpoints

### Authentication
- `POST /api/auth/register` - Patient registration
- `POST /api/auth/login-email` - Email login
- `POST /api/auth/request-otp` - Request OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/admin/login` - Admin login

### Bookings
- `POST /api/bookings` - Create booking (public)
- `GET /api/patient/bookings` - Get patient bookings (authenticated)
- `PATCH /api/patient/bookings/:id/payment` - Update payment status

### Prescriptions (Role-Based Access)
- `POST /api/prescriptions/upload` - Upload prescription (patients)
- `GET /api/prescriptions` - Get prescriptions (patients see own, admins can filter by patientId)
- `GET /api/bookings/:id/prescriptions` - Get booking prescriptions (admin)

### Reports
- `GET /api/patient/reports` - Get patient reports
- `GET /api/reports/download/:token` - Download report securely

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/patients` - List patients
- `GET /api/admin/bookings` - List bookings
- `GET /api/admin/reports` - List reports

### Public
- `GET /api/tests` - Get all tests
- `GET /api/health-packages` - Get health packages
- `GET /api/advertisements` - Get active advertisements
- `GET /api/reviews` - Get approved reviews

## Recent Changes

### 2025-12-23
- **Database Schema**: Removed redundant `prescriptionPath` from bookings table (prescriptions table handles this)
- **API Enhancement**: Implemented role-based access control for `/api/prescriptions` endpoint
  - Admins: Can view all prescriptions by patientId parameter
  - Patients: Can only view their own prescriptions
- **Production Fix**: Moved `cross-env` from devDependencies to dependencies for production deployments
- **Error Handling**: Made notification service non-blocking in bookings endpoint to prevent cascading failures
- **Build**: Production build successful, app verified working at localhost:5000

## Security Features
- JWT authentication for protected endpoints
- Password hashing with bcrypt
- Secure prescription download tokens
- Role-based access control (patient/admin)
- Email verification for patient registration
- OTP-based authentication support

## Troubleshooting

### 502 Bad Gateway in Production
- Verify DATABASE_URL is set in environment
- Check Render logs for database connection errors
- Ensure port binding is correct (port 5000)

### Email Notifications Not Working
- These are optional and fail gracefully
- Set EMAIL_USER and EMAIL_PASS to enable (Gmail app password required)
- Without credentials, notifications are logged to console

### Database Connection Issues
- Ensure PostgreSQL is running and accessible
- Verify DATABASE_URL format: `postgresql://user:pass@host:5432/dbname`
- Run `npm run db:push` to sync schema

