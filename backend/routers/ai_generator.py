from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import require_professor
from models.category import Category
from models.question import Question
from models.user import User
from schemas.question import QuestionOutAdmin
from services.ai_question_service import generate_questions_from_text
from services.pdf_service import extract_text_from_pdf

router = APIRouter()

MAX_PDF_MB = 10


@router.post("/generate", response_model=list[QuestionOutAdmin], status_code=status.HTTP_201_CREATED)
async def generate_from_pdf(
    file: UploadFile = File(..., description="PDF file to extract questions from"),
    category_id: str = Form(...),
    num_questions: int = Form(default=10, ge=1, le=50),
    admin: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    # Validate category exists
    cat_result = await db.execute(select(Category).where(Category.id == category_id))
    if not cat_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Category not found")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > MAX_PDF_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"PDF must be under {MAX_PDF_MB} MB")

    try:
        text = extract_text_from_pdf(pdf_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    if len(text.strip()) < 100:
        raise HTTPException(status_code=422, detail="PDF contained too little extractable text")

    raw_questions = await generate_questions_from_text(
        text=text,
        category_name=category_id,
        num_questions=num_questions,
    )
    if not raw_questions:
        raise HTTPException(status_code=502, detail="AI failed to generate questions — check API keys")

    # Persist all generated questions
    saved: list[Question] = []
    for q_data in raw_questions:
        question = Question(
            content=q_data["question"],
            category_id=category_id,
            difficulty=q_data.get("difficulty", "MEDIUM"),
            topic=q_data.get("topic"),
            option_a=q_data["option_a"],
            option_b=q_data["option_b"],
            option_c=q_data["option_c"],
            option_d=q_data["option_d"],
            correct_answer=q_data["correct_answer"],
            created_by=admin.id,
        )
        db.add(question)
        saved.append(question)

    await db.flush()
    return saved
