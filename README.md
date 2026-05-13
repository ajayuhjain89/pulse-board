# PulseBoard

PulseBoard is a minimal, real-time polling platform built on the MERN stack. It prioritizes fluid interface design and instant data synchronization, serving as a lightweight alternative to traditional polling software.

The application design system is heavily inspired by modern interfaces like Vercel and Linear. It utilizes custom native CSS spring physics, staggered orchestration, and tokenized DOM variables to achieve a premium 120Hz feel without relying on bloated animation libraries.

## Technical Overview

- **Client:** React 19, Vite, Tailwind CSS v4.3
- **Server:** Node.js, Express, MongoDB (Mongoose)
- **Real-time Engine:** Socket.io
- **Authentication pipeline:** JWT sessions, Google OAuth integration, and isolated NodeMailer/SendGrid OTP verification flows.

## Repository Structure

The architecture is split into a standard client-server monorepo.

```text
pulse-board/
├── backend/     # Express REST API & Websocket listener
└── frontend/    # React Single Page Application
```

## Local Setup

### 1. External Requirements
Before running the application, ensure you have:
- A local MongoDB instance or a remote Atlas connection string.
- A Google OAuth Client ID.
- A SendGrid API key for the transactional email pipeline.

### 2. Backend Initialization
Navigate to the `backend` directory to install dependencies and configure the environment.

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/pulse-board
JWT_SECRET=your_jwt_signing_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id

# SMTP Configuration (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
EMAIL_FROM="PulseBoard Auth" <noreply@yourdomain.com>
```

Boot the server:
```bash
npm run dev
```

### 3. Frontend Initialization
In a separate terminal, navigate to your `frontend` directory.

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory:
```env
VITE_API_URL=http://localhost:5001/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

Start the Vite development pipeline:
```bash
npm run dev
```

## Design & Architecture Notes

- **Native UI Physics:** Button transitions and card reveals utilize explicit cubic-bezier curves (e.g., `cubic-bezier(0.16, 1, 0.3, 1)`) to emulate native OS spring physics. This maintains absolute 60/120fps performance by offloading calculations directly to the GPU instead of JavaScript.
- **Micro-interactions:** Skeletons utilize CSS-driven gradient saturation to create a glass-shimmering effect, and frosted navigations compute `backdrop-filter` dynamically based on scroll delta.
- **Stateless Poll Streams:** Socket.io handles vote mutations over isolated channels. Clients join volatile room hashes mapped identically to the poll ID in view, ensuring network operations remain perfectly isolated.
