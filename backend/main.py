"""
QuizMaster — FastAPI application entry point.
Registers all routers, CORS, and the /health endpoint.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from routers import auth, users, categories, questions, exams, attempts, ai_generator, exam_sets, admin, analytics, reports, ws

app = FastAPI(
    title="QuizMaster API",
    version="1.0.0",
    description="Online Quiz and Examination Management System (24CSE48)",
)

# CORS — allow the React dev server and the deployed frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check (UptimeRobot pings this on Render free tier) ─────────────────
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}


# ── All routers ────────────────────────────────────────────────────────────────
app.include_router(auth.router,          prefix="/api/v1/auth",        tags=["auth"])
app.include_router(users.router,         prefix="/api/v1/users",       tags=["users"])
app.include_router(categories.router,    prefix="/api/v1/categories",  tags=["categories"])
app.include_router(questions.router,     prefix="/api/v1/questions",   tags=["questions"])
app.include_router(exams.router,         prefix="/api/v1/exams",       tags=["exams"])
app.include_router(attempts.router,      prefix="/api/v1/attempts",    tags=["attempts"])
app.include_router(ai_generator.router,  prefix="/api/v1/ai",          tags=["ai"])
app.include_router(exam_sets.router,     prefix="/api/v1/sets",        tags=["sets"])
app.include_router(admin.router,         prefix="/api/v1/admin",       tags=["admin"])
app.include_router(analytics.router,     prefix="/api/v1/analytics",   tags=["analytics"])
app.include_router(reports.router,       prefix="/api/v1/reports",     tags=["reports"])
app.include_router(ws.router,            prefix="/api/v1",             tags=["ws"])
