# GITAM Faculty Research Publications Portal — Setup Guide

## Prerequisites

Make sure the following are installed on your machine before starting:

- **Node.js** (v18 or above) — https://nodejs.org
- **Git** — https://git-scm.com
- **A code editor** (VS Code recommended)

To verify Node.js is installed, open a terminal and run:
```
node -v
```
It should print something like `v18.x.x` or higher.

---

## Step 1 — Clone the Repository

Open a terminal (Command Prompt or PowerShell on Windows) and run:

```
git clone https://github.com/ghoshonkar5/publications.git
cd publications
```

---

## Step 2 — Add the Environment Files

You will receive **two `.env` files** from Onkar. Place them as follows:

| File | Where to place it |
|------|-------------------|
| `.env` (frontend) | Inside the root folder: `publications/` |
| `.env` (backend) | Inside the backend folder: `publications/gitam-backend/` |

> **Important:** These files contain API keys and database credentials. Do not share them publicly or commit them to Git.

Your folder structure should look like this after placing the files:

```
publications/
├── .env                  ← frontend env file here
├── package.json
├── src/
└── gitam-backend/
    ├── .env              ← backend env file here
    ├── package.json
    └── src/
```

---

## Step 3 — Install Dependencies

You need to install packages for both the frontend and backend. Run these commands one at a time.

**Frontend (from the root `publications/` folder):**
```
npm install
```

**Backend (go into the backend folder first):**
```
cd gitam-backend
npm install
```

---

## Step 4 — Start the Application

You need **two terminal windows** open at the same time — one for the backend, one for the frontend.

**Terminal 1 — Start the Backend:**
```
cd publications/gitam-backend
npm run dev
```

You should see:
```
🚀 GITAM Backend Server running on port 5000
✅ Connected to Neon PostgreSQL database
```

**Terminal 2 — Start the Frontend:**
```
cd publications
npm run dev
```

You should see:
```
VITE v5.x.x  ready in XXX ms
➜  Local:   http://localhost:3000/
```

---

## Step 5 — Open in Browser

Go to: **http://localhost:3000**

The application should load and be fully functional. All data is stored on a cloud database (Neon PostgreSQL) so no local database setup is needed.

---

## Troubleshooting

**Port already in use error:**
If port 5000 or 3000 is already in use, close any other running applications and try again. On Windows you can run:
```
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

**`npm install` fails:**
Make sure you are in the correct folder before running the command. The frontend and backend are separate — each needs its own `npm install`.

**Backend not connecting to database:**
Make sure the `gitam-backend/.env` file is present and contains the correct `DATABASE_URL`. Do not rename or move the file.

**Page loads but shows no data:**
Make sure the backend is running (Terminal 1). The frontend needs the backend on port 5000 to fetch data.

---

## Summary of Commands

```
# Clone
git clone https://github.com/ghoshonkar5/publications.git
cd publications

# Install frontend
npm install

# Install backend
cd gitam-backend
npm install
cd ..

# Run backend (Terminal 1)
cd gitam-backend && npm run dev

# Run frontend (Terminal 2)
cd publications && npm run dev
```

---

*For any issues, contact Onkar.*
