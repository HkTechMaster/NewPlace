# 🎓 PlacePro — Placement Management System

A full **MERN Stack** application with Google OAuth 2.0 authentication for managing Skill Faculties and Dean accounts in a university placement system.


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

