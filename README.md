# 🎓 PlacePro — Placement Management System

A full **MERN Stack** application with Google OAuth 2.0 authentication for managing Skill Faculties and Dean accounts in a university placement system.

---

## 🏗️ Architecture

```
placement-system/
├── backend/              # Node.js + Express + MongoDB Atlas
│   ├── config/db.js      # MongoDB connection
│   ├── models/
│   │   ├── User.js       # SuperAdmin & Dean users
│   │   └── SkillFaculty.js
│   ├── routes/
│   │   ├── auth.js       # Google OAuth routes
│   │   ├── skillFaculties.js
│   │   └── users.js
│   ├── middleware/auth.js # JWT protection
│   ├── seed.js           # DB seeder (run once)
│   └── server.js
│
└── frontend/             # React + Vite
    └── src/
        ├── context/AuthContext.jsx
        ├── pages/
        │   ├── Login.jsx         # Google Sign-In
        │   ├── AdminDashboard.jsx
        │   └── DeanDashboard.jsx
        └── components/
            ├── Navbar.jsx
            ├── FacultyModal.jsx  # Add/Edit faculty form
            └── ProtectedRoute.jsx
```

---

## ⚙️ Setup Guide

### Step 1 — Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add **Authorized JavaScript origins**:
   - `http://localhost:5173`
7. Add **Authorized redirect URIs**:
   - `http://localhost:5173`
8. Copy your **Client ID** and **Client Secret**

---

### Step 2 — MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a free cluster
3. Go to **Database Access** → Add a database user
4. Go to **Network Access** → Add IP Address (`0.0.0.0/0` for development)
5. Go to **Databases** → Connect → **Connect your application**
6. Copy the connection string

---

### Step 3 — Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/placement_system?retryWrites=true&w=majority
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=any_long_random_string_here
SESSION_SECRET=another_long_random_string
CLIENT_URL=http://localhost:5173
SUPER_ADMIN_EMAIL=your_actual_gmail@gmail.com
```

> ⚠️ **SUPER_ADMIN_EMAIL** must be your real Gmail address that you'll use to sign in with Google.

---

### Step 4 — Frontend Configuration

```bash
cd frontend
cp .env.example .env
```

Edit `.env`:
```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_API_URL=http://localhost:5000/api
```

---

### Step 5 — Install Dependencies

```bash
# From root
npm run install:all

# Or manually:
cd backend && npm install
cd ../frontend && npm install
```

---

### Step 6 — Seed the Database

```bash
npm run seed
# or: cd backend && node seed.js
```

This creates:
- ✅ Super Admin account (your email from `.env`)
- ✅ 3 sample Skill Faculties: SFET, SFASH, SFMSR
- ✅ Dean accounts for each faculty

---

### Step 7 — Run the App

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

---

## 🔐 How Authentication Works

```
User visits /login
    ↓
Clicks "Sign in with Google"
    ↓
Google returns ID token (credential)
    ↓
Frontend sends token to POST /api/auth/google
    ↓
Backend verifies token with Google
    ↓
Checks if email exists in MongoDB
    ↓
If NOT found → 403 "Access denied"
If found → Returns JWT token
    ↓
Frontend stores JWT in localStorage
    ↓
Redirects based on role:
  super_admin → /admin/dashboard
  dean       → /dean/dashboard
```

---

## 👤 User Roles

### Super Admin
- Pre-seeded in DB via `SUPER_ADMIN_EMAIL` env variable
- Can create, edit, delete Skill Faculties
- When a faculty is created, the dean's email is auto-registered
- Dashboard shows all faculties with stats

### Dean
- Created automatically when Super Admin adds a Skill Faculty
- Can login with their Google account using the registered email
- Dashboard shows their faculty details, departments, and placement portal

---

## 🏫 Skill Faculties

Supported faculty codes (any code works, these are examples):
| Code | Full Name |
|------|-----------|
| SFET | Skill Faculty of Engineering & Technology |
| SFASH | Skill Faculty of Arts, Science & Humanities |
| SFMSR | Skill Faculty of Management, Social Science & Research |

---

## 📡 API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/google` | Public | Google OAuth login |
| GET | `/api/auth/me` | Auth | Get current user |
| POST | `/api/auth/logout` | Auth | Logout |
| GET | `/api/skill-faculties` | Auth | Get all faculties |
| POST | `/api/skill-faculties` | Super Admin | Create faculty |
| PUT | `/api/skill-faculties/:id` | Super Admin | Update faculty |
| DELETE | `/api/skill-faculties/:id` | Super Admin | Delete faculty |
| GET | `/api/users/deans` | Super Admin | Get all deans |
| GET | `/api/users/stats` | Super Admin | Get system stats |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Vite |
| Auth UI | @react-oauth/google |
| Styling | CSS Modules (custom design system) |
| HTTP | Axios |
| Backend | Node.js, Express.js |
| Auth | Google OAuth 2.0, JWT, Passport.js |
| Database | MongoDB Atlas (Mongoose) |
| Notifications | react-hot-toast |

---

## 🚀 Production Deployment

1. Update `CLIENT_URL` in backend `.env` to your production domain
2. Add your production domain to Google OAuth authorized origins
3. Set `NODE_ENV=production` in backend
4. Build frontend: `cd frontend && npm run build`
5. Serve `frontend/dist` with your preferred static host (Vercel, Netlify)
6. Deploy backend to Railway, Render, or any Node.js host
