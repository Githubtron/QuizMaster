# QuizMaster — Online Quiz & Examination Management System

An AI-powered full-stack web application built for academic 
examination management. Designed for institutions to conduct 
fair, automated, and insightful online examinations.

## Features

### Roles
- **Admin** — Manage users, platform analytics, system config
- **Professor** — Create exams, manage question bank, view results
- **Student** — Take exams, view results, download reports

### AI Question Generation
- Upload any PDF → AI automatically generates MCQs
- Powered by Google Gemini (primary) and Groq (fallback)
- Smart validation ensures question quality

### Paper Set Generation
- Automatically generates unique paper sets (Set A, Set B, Set C)
- No two students get the same question paper
- Balanced by topic and difficulty level

### Timed Examinations
- Countdown timer with auto-submit
- Unique paper set assigned per student
- Instant auto-grading on submission

### PDF Analytics Reports
- **Student** — Result PDF with score, charts, question breakdown
- **Professor** — Per exam report + overall performance analytics
- **Admin** — Platform-wide usage and performance report

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS, Shadcn/ui, Framer Motion |
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| AI | Google Gemini, Groq |
| Auth | JWT (python-jose) |
| PDF Generation | ReportLab, Matplotlib |
| Deployment | Render |

## Subject
24CSE48 — Online Quiz and Examination Management System
