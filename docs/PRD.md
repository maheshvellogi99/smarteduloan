---
css: |
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

  body {
    font-family: 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 13pt;
    line-height: 1.9;
    color: #1a1a2e;
    margin: 0 auto;
    max-width: 860px;
    padding: 30px 40px;
  }

  h1 {
    font-size: 28pt;
    font-weight: 700;
    color: #0f3460;
    border-bottom: 3px solid #0f3460;
    padding-bottom: 10px;
    margin-bottom: 6px;
  }

  h2 {
    font-size: 18pt;
    font-weight: 700;
    color: #16213e;
    border-bottom: 1.5px solid #d0d7de;
    padding-bottom: 6px;
    margin-top: 36px;
  }

  h3 {
    font-size: 14pt;
    font-weight: 600;
    color: #0f3460;
    margin-top: 24px;
  }

  p {
    font-size: 13pt;
    margin: 10px 0 14px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 18px 0;
    font-size: 12pt;
  }

  th {
    background-color: #0f3460;
    color: #ffffff;
    padding: 10px 14px;
    text-align: left;
    font-weight: 600;
  }

  td {
    padding: 9px 14px;
    border-bottom: 1px solid #e0e4ea;
    vertical-align: top;
  }

  tr:nth-child(even) td {
    background-color: #f4f6fa;
  }

  ul, ol {
    font-size: 13pt;
    margin: 8px 0 14px 24px;
    padding: 0;
  }

  li {
    margin-bottom: 6px;
  }

  strong {
    color: #0f3460;
  }

  .subtitle {
    font-size: 13pt;
    color: #555;
    margin-top: 4px;
    font-style: italic;
  }
pdf_options:
  format: A4
  margin:
    top: 25mm
    bottom: 25mm
    left: 20mm
    right: 20mm
---

# SmartEduLoan
## Product Requirements Document (PRD)

<p class="subtitle">A Full-Stack Student Loan Management System</p>

---

## 1. Product Overview

**SmartEduLoan** is a web-based platform designed to simplify and automate the complete lifecycle of student loan management. It brings together three key stakeholders — **Students**, **Administrators**, and **Banks** — on a single, unified digital platform, replacing the traditional paper-based and fragmented loan processes with a streamlined, transparent, and automated system.

The platform enables students to apply for education loans online, tracks their application through review stages, and provides real-time status updates. Admins manage the review pipeline and route applications to partner banks, while banks perform verification through their own dedicated interface.

---

## 2. Problem Statement

Student loan management in educational institutions is often slow, opaque, and manually intensive:

- Students have **no visibility** into where their application stands after submission.
- Administrative staff spend excessive time **manually reviewing and routing** applications.
- Banks lack a **structured digital channel** to receive, review, and process assigned loan requests.
- There is **no automated mechanism** to pre-screen ineligible applicants, leading to wasted time on both sides.
- Loan repayment tracking (EMIs) is disconnected from the application system.

SmartEduLoan addresses all of these problems by creating an end-to-end automated workflow with real-time communication between all stakeholders.

---

## 3. Goals & Objectives

| Goal | Description |
|------|-------------|
| Digitize loan application | Allow students to submit loan applications with documents entirely online |
| Automate credit evaluation | Compute credit scores from student profiles without manual input |
| Streamline admin review | Give admins a single dashboard to track, assign, approve, or reject applications |
| Enable bank verification | Provide banks a dedicated portal to receive and review assigned applications |
| Improve transparency | Let students view exactly where their loan is in the pipeline at any time |
| Automate repayment planning | Generate and display EMI schedules automatically upon loan approval |

---

## 4. Target Users

| Role | Who They Are | What They Do |
|------|-------------|--------------|
| **Student** | Enrolled college/university students seeking education financing | Apply for loans, upload documents, track status, view EMI schedule |
| **Admin** | Institution administrators who oversee the loan process | Review applications, assign them to banks, approve or reject |
| **Bank** | Registered financial institutions partnered with the institution | Verify student documents and submit verdicts on assigned applications |

---

## 5. Key Features

### 5.1 Authentication & Role-Based Access
Students, admins, and banks each register and log in with separate credentials. The system issues a **JWT token** upon login, which controls access to role-specific portals. No user can access another role's data or functionality.

### 5.2 Student Portal
- **Profile Setup:** Students fill in academic details (institution, course, year, percentage), financial background (income, existing loans), and address information.
- **Loan Application:** Students apply for a loan by specifying the requested amount, tenure, purpose, and uploading documents.
- **Status Tracking:** A real-time timeline shows every stage of the application — submitted, under review, assigned to bank, approved, or rejected.
- **Credit Score Display:** Students can see their computed credit score on their profile page.

### 5.3 Admin Portal
- **Dashboard Overview:** Summary cards showing total, pending, approved, and rejected application counts.
- **Application Management:** Searchable and filterable list of all loan applications with quick-action buttons.
- **Bank Assignment:** Admins can route any application to a registered bank for verification.
- **Approve / Reject:** Final decision-making with a mandatory reason field on rejection.
- **Bank Management:** Admins can add new banks and view existing registered bank partners.

### 5.4 Bank Portal
- **Assigned Applications:** Banks only see the loan applications that have been routed to them by the admin — no cross-bank data leakage.
- **Document Review:** Banks can view all uploaded student documents and profile data for due diligence.
- **Verification Verdict:** Banks submit their verification outcome, which feeds back to the admin for final decision.

### 5.5 Automated Credit Scoring
The system automatically calculates a numeric credit score for each student based on their profile data — academic performance, income-to-expense ratio, and existing liabilities. **Any loan application where the credit score falls below 600 is automatically rejected** before it reaches the admin, immediately notifying the student with a reason.

### 5.6 Loan Product Catalog
Banks can define and manage their own loan products within the system, specifying applicable interest rates, minimum/maximum tenure, and maximum loan amount. Students can browse eligible products when applying.

---

## 6. User Stories

| ID | As a… | I want to… | So that… |
|----|-------|-----------|----------|
| US-01 | Student | Register and log in securely | I can access my personal loan portal |
| US-02 | Student | Fill out my academic and financial profile | The system can evaluate my creditworthiness |
| US-03 | Student | Apply for a loan and upload required documents | I can formally request education financing |
| US-04 | Student | Track my loan status in real time | I know exactly where my application stands |
| US-05 | Student | See my loan status and bank details after approval | I can track progress after approval |
| US-06 | Admin | View all pending loan applications in one place | I can process them efficiently without missing any |
| US-07 | Admin | Assign an application to a bank | The bank can independently verify the student's case |
| US-08 | Admin | Approve or reject an application with a reason | Final decisions are recorded and communicated clearly |
| US-09 | Bank | View only the applications assigned to me | I focus on my workload without seeing unrelated cases |
| US-10 | Bank | Review student documents before submitting a verdict | My verification is well-informed and accurate |
| US-11 | System | Automatically reject applications with credit score < 600 | Only eligible applicants reach the human review stage |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | All API responses should be returned within 500ms under normal operating conditions |
| **Security** | All routes (except login and registration) must be protected by JWT authentication; passwords must be hashed using bcrypt |
| **Usability** | The interface should be intuitive enough for non-technical students and admins to navigate without training |
| **Scalability** | The backend must follow a modular architecture (routes, models, services) to allow future expansion |
| **Reliability** | File uploads must be validated for correct file type and size before being stored |
| **Maintainability** | Code must follow consistent conventions and separation of concerns |

---

## 8. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | HTML5, CSS3, Vanilla JavaScript | User interface, dynamic content without a framework |
| Backend | Node.js, Express.js | REST API server, business logic |
| Database | MongoDB (via Mongoose ODM) | Persistent data storage |
| Authentication | JSON Web Tokens (JWT) | Stateless, secure session management |
| File Handling | Multer | Multipart form data and document uploads |

---

## 9. Constraints

- **No frontend framework:** The UI is built with pure HTML, CSS, and JavaScript — no React, Angular, or Vue.
- **Local deployment only:** The application runs on localhost during development; no cloud hosting is required.
- **Single database instance:** One MongoDB database serves all roles and data without replication.
- **No live payment gateway:** EMI "Pay Now" is a UI interaction only; no real financial transaction is processed.

---

## 10. Success Metrics

- A student can complete the full loan application flow — registration to submission — without errors or confusion.
- An admin can approve, reject, or assign an application in fewer than 5 interactions.
- The credit score auto-rejection fires correctly for all applications with a score below 600.
- All three portals (Student, Admin, Bank) are cleanly separated, with no unauthorized cross-role data access.
