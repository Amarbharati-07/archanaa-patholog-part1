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

## Development

### Running Locally
The application runs on port 5000. Use the workflow "Start application" which executes:
```bash
npm run dev
```

### Database
- Uses PostgreSQL via Drizzle ORM
- Schema defined in `shared/schema.ts`
- Push schema changes with: `node node_modules/drizzle-kit/bin.cjs push`

### Default Admin Credentials
- Username: admin
- Password: admin123

## Deployment
Configured for autoscale deployment:
- Build: `npm run build`
- Start: `npm run start`

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `RAZORPAY_KEY_ID` - Razorpay API key (optional)
- `RAZORPAY_KEY_SECRET` - Razorpay secret (optional)

## Recent Changes
- 2025-12-23: Initial import and Replit environment setup
- Fixed ESM compatibility in vite.config.ts for __dirname
- Configured database and seeded initial data
