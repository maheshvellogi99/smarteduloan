# SmartEduLoan - Comprehensive Student Loan Management System

SmartEduLoan is a full-stack web application designed to streamline the student loan process. It connects Students, Administrators, and Bank Managers on a unified platform, facilitating loan applications, credit scoring, document verification, and disbursal.

## 🌟 Features

*   **Role-Based Access Control (RBAC):** Distinct dashboards for Students, Admins, and Bank Officials.
*   **Automated Credit Scoring:** Dynamic evaluation of student eligibility based on academic scores, attendance, family income, and past financial behavior.
*   **Loan Application & Tracking:** Students can apply for education, skill, or personal loans and track their status in real-time.
*   **Document Management:** Secure upload and verification of necessary documents (Aadhaar, Admission Letters, Income Certificates, etc.).
*   **EMI Calculation:** Built-in EMI services to calculate monthly installments for approved loans.
*   **Email Notifications:** Automated email alerts for application updates, approvals, and disbursals.
*   **Bank Product Integration:** Admins can manage associating educational loans with specific bank products seamlessly.

---

## 📂 Project Structure & File Functions

The project is divided into a Node.js/Express backend API and a vanilla HTML/CSS/JS frontend.

### 🔙 Backend (`/backend`)
A Node.js REST API providing the core logic, database models, and services.

*   `package.json`: Defines backend npm dependencies (Express, Mongoose, JWT, bcrypt, multer, nodemailer) and scripts.
*   **`src/`**: Main source code directory.
    *   `server.js`: The application entry point. Configures Express, CORS, MongoDB connection, and mounts API routes.
    *   **`models/`**: Mongoose database schemas defining the data structure.
        *   `User.js`: Schema for system users (Student, Admin, Bank). Stores authentication details and roles.
        *   `StudentProfile.js`: Stores detailed academic, financial, and personal information for student users.
        *   `Loan.js`: Schema tracking loan applications, status, bank verification, and disbursed amounts.
        *   `Bank.js`: Represents bank entities operating within the system.
        *   `BankProduct.js`: Represents specific loan products offered by banks.
    *   **`routes/`**: API endpoint definitions.
        *   `auth.js`: Endpoints for user registration, login, and token generation.
        *   `student.js`: Endpoints for student actions (profile updates, loan applications, document uploads).
        *   `admin.js`: Endpoints for admin actions (reviewing applications, managing banks/users).
        *   `bank.js`: Endpoints for bank officials to verify applications and manage disbursals.
    *   **`middleware/`**: Custom Express middlewares (JWT verification logic to secure routes).
    *   **`services/`**: Core business logic modules.
        *   `creditScoreService.js`: Algorithm to calculate a student's credit score based on various academic and financial parameters.
        *   `emiService.js`: Utility functions to calculate EMI (Equated Monthly Installment) and loan amortization.
        *   `emailService.js`: Handles sending automated email notifications using `nodemailer`.

### 🖥️ Frontend (`/frontend`)
A lightweight, fast frontend utilizing vanilla Web Technologies without a build pipeline.

*   `package.json`: Contains basic scripts to serve the static files locally.
*   `README.md`: Basic frontend setup instructions.
*   **`public/`**: Publicly served web files.
    *   `index.html`: Root page; generally redirects users to authentication.
    *   `login.html` & `register.html`: User authentication interfaces.
    *   **`student/`**, **`admin/`**, **`bank/`**: Role-specific HTML views (dashboards, application pages, profiling).
    *   **`css/`**: Shared and page-specific stylesheets (`style.css`, `dashboard.css`) providing a responsive layout.
    *   **`js/`**: Client-side logic and API interaction.
        *   `api.js`: A fetch wrapper that attaches JWT headers for authenticated requests to the backend.
        *   `auth.js`: Handles form submissions for login and registration.
        *   `utils.js`: Shared utility functions (UI toasts, formatting tools, local storage helpers).
        *   `student.js`, `admin.js`, `bank.js`: Scripts governing the dynamic behavior and data fetching for their respective dashboards.

---

## 🚀 Setup & Installation

Follow these steps to run the application locally.

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd FSD_project/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (create a `.env` file if necessary, ensuring `MONGO_URI` is correct).
4. Start the server:
   ```bash
   npm start
   ```
   *The API will run on `http://localhost:5001`.*

### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd FSD_project/frontend
   ```
2. Install tools and serve public folder:
   ```bash
   npm install
   npm start
   ```
   *The frontend will be available at `http://localhost:3000`.*

---

## 💡 Suggested Enhancements & Future Features

To make the SmartEduLoan system even more robust and useful, consider implementing the following enhancements:

### 1. Advanced Security & Authentication
*   **Two-Factor Authentication (2FA):** Add an extra layer of security for logins, especially for Admin and Bank roles.
*   **OAuth Integration:** Allow students to sign in using Google or Microsoft accounts.
*   **Rate Limiting & Bot Protection:** Implement `express-rate-limit` to prevent brute-force login attempts and DDoS attacks.

### 2. Enhanced Financial Features
*   **Payment Gateway Integration:** Integrate Stripe or Razorpay to allow students to pay their EMIs directly through the portal.
*   **Dynamic Loan Interest Rates:** Fetch real-time interest rates from a central banking API rather than hardcoding or manually updating them.
*   **Co-applicant Management:** Allow students to add parents/guardians as co-applicants with their own credit profile assessments.

### 3. User Experience (UX) Improvements
*   **Intercom/In-App Chat:** Allow direct communication between students and bank officials or admins within the platform to resolve queries quickly.
*   **Interactive Analytics Dashboard:** Add visual charts (using libraries like Chart.js) for admins to track loan disbursement metrics and default rates over time.
*   **Mobile-First PWA:** Convert the frontend into a Progressive Web App so users can install it on their mobile devices for offline capabilities and push notifications.

### 4. Technical / Architecture Upgrades
*   **Automated Testing:** Implement a testing suite using Jest and Supertest to automatically verify API endpoints and business logic (like credit score calculation).
*   **Containerization (Docker):** Create `Dockerfile` and `docker-compose.yml` to ensure consistent environments across development, testing, and production.
*   **Cloud Storage for Documents:** Instead of storing uploads locally (`/uploads`), integrate AWS S3 or Google Cloud Storage for better scalability and security of sensitive documents.
