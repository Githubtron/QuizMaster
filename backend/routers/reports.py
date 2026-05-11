import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import require_admin, require_professor, require_student
from models.attempt import Attempt
from models.exam import Exam
from models.user import User
from services.pdf_report_service import (
    generate_admin_platform_pdf,
    generate_exam_report_pdf,
    generate_professor_overall_pdf,
    generate_student_result_pdf,
)

router = APIRouter()


def _pdf_response(pdf_bytes: bytes, filename: str) -> StreamingResponse:
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/student/{attempt_id}")
async def student_result_pdf(
    attempt_id: str,
    student: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Student downloads their own result PDF."""
    attempt_res = await db.execute(select(Attempt).where(Attempt.id == attempt_id))
    attempt = attempt_res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.student_id != student.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if attempt.status == "IN_PROGRESS":
        raise HTTPException(status_code=400, detail="Attempt not yet submitted")

    pdf = await generate_student_result_pdf(attempt_id, db)
    return _pdf_response(pdf, f"result_{attempt_id[:8]}.pdf")


@router.get("/exam/{exam_id}")
async def exam_report_pdf(
    exam_id: str,
    professor: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    """Professor (own exams only) or Admin downloads exam report."""
    exam_res = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = exam_res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if professor.role == "PROFESSOR" and exam.created_by != professor.id:
        raise HTTPException(status_code=403, detail="Access denied")

    pdf = await generate_exam_report_pdf(exam_id, db)
    return _pdf_response(pdf, f"exam_report_{exam_id[:8]}.pdf")


@router.get("/professor/overall")
async def professor_overall_pdf(
    professor: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    """Professor downloads their own overall report."""
    if professor.role == "ADMIN":
        raise HTTPException(status_code=403, detail="Use /admin/platform for admin reports")
    pdf = await generate_professor_overall_pdf(professor.id, db)
    return _pdf_response(pdf, f"professor_report_{professor.id[:8]}.pdf")


@router.get("/admin/platform")
async def admin_platform_pdf(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin downloads the full platform report."""
    pdf = await generate_admin_platform_pdf(db)
    return _pdf_response(pdf, "platform_report.pdf")
