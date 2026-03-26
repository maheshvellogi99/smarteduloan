# SmartEduLoan — Project

A full-stack student loan management system built with **HTML, CSS, Vanilla JS** (frontend) and **Node.js + Express.js + MongoDB** (backend).

## Project Structure

```
FSD_project/
├── backend/               # Node.js + Express API server
│   └── src/
│       ├── models/        # Mongoose schemas (User, StudentProfile, Loan, Bank, BankProduct)
│       ├── routes/        # Express route handlers (auth, student, admin, bank)
│       ├── middleware/    # JWT auth middleware
│       ├── services/      # Credit score calculator, EMI service
│       └── server.js      # Entry point
│
└── frontend/
    └── public/            # Pure HTML + CSS + Vanilla JS (no build step!)
        ├── index.html     # Root (redirects to login)
        ├── login.html     # Login page
        ├── register.html  # Registration page
        ├── student/
        │   ├── dashboard.html
        │   ├── profile.html
        │   ├── apply.html
        │   └── loans.html
        ├── admin/
        │   ├── dashboard.html
        │   ├── applications.html
        │   └── banks.html
        ├── bank/
        │   └── dashboard.html
        ├── css/
        │   ├── style.css
        │   └── dashboard.css
        └── js/
            ├── api.js      # Fetch wrapper with JWT headers
            ├── utils.js    # Shared helpers (auth check, toast, format)
            ├── auth.js     # Login / Register logic
            ├── student.js  # Student portal logic
            ├── admin.js    # Admin portal logic
            └── bank.js     # Bank portal logic
```

## How to Run

### 1. Start the Backend

```bash
cd backend
npm install
node src/server.js
```

Backend runs on: **http://localhost:5001**

### 2. Serve the Frontend

Open a new terminal:

```bash
cd frontend
npx serve public -p 3000
```

Frontend is available at: **http://localhost:3000**

> The API URL is hardcoded to `http://localhost:5001/api` in `frontend/public/js/api.js`.

---

## Default Accounts

| Role  | Email                    | Password  |
|-------|--------------------------|-----------|
| Admin | admin@smartedu.com       | admin123  |

Students and Banks can self-register via the `/register.html` page.

## User Roles & Portals

| Role    | Portal URL             | Description                              |
|---------|------------------------|------------------------------------------|
| Student | `/student/dashboard`   | Apply for loans, track status            |
| Admin   | `/admin/dashboard`     | Manage applications, approve/reject loans|
| Bank    | `/bank/dashboard`      | Verify assigned applications             |
