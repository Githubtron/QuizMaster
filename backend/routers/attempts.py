from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user, require_professor, require_student
from routers.ws import manager as ws_manager
from services.email_service import send_result_email
from models.attempt import Attempt
from models.exam import Exam
from models.exam_set import ExamSet
from models.question import Question
from models.user import User
from schemas.attempt import AttemptCreate, AttemptOut, AttemptOutWithStudent, AttemptResult, AttemptSubmit
from schemas.question import QuestionOut
from services.exam_set_service import assign_set_to_student
from services.grading_service import grade_attempt

router = APIRouter()


@router.post("/", response_model=AttemptOut, status_code=status.HTTP_201_CREATED)
async def start_attempt(
    payload: AttemptCreate,
    student: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    exam_result = await db.execute(select(Exam).where(Exam.id == payload.exam_id))
    exam = exam_result.scalar_one_or_none()
    if not exam or not exam.is_active:
        raise HTTPException(status_code=404, detail="Exam not found or inactive")

    now = datetime.now(timezone.utc)
    if exam.scheduled_start and now < exam.scheduled_start:
        opens = exam.scheduled_start.strftime("%b %d, %Y at %H:%M UTC")
        raise HTTPException(status_code=403, detail=f"Exam hasn't started yet. Opens {opens}.")
    if exam.scheduled_end and now > exam.scheduled_end:
        raise HTTPException(status_code=403, detail="Exam window has closed.")

    existing_result = await db.execute(
        select(Attempt).where(
            Attempt.exam_id == exam.id,
            Attempt.student_id == student.id,
            Attempt.status == "IN_PROGRESS",
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        return existing

    done_result = await db.execute(
        select(Attempt).where(
            Attempt.exam_id == exam.id,
            Attempt.student_id == student.id,
            Attempt.status.in_(["SUBMITTED", "TIMED_OUT"]),
        )
    )
    if done_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You have already submitted this exam")

    try:
        exam_set = await assign_set_to_student(exam, student.id, db)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    attempt = Attempt(
        exam_id=exam.id,
        student_id=student.id,
        set_id=exam_set.id,
        answers={},
    )
    db.add(attempt)
    await db.flush()
    return attempt


@router.post("/{attempt_id}/submit", response_model=AttemptResult)
async def submit_attempt(
    attempt_id: str,
    payload: AttemptSubmit,
    background_tasks: BackgroundTasks,
    student: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Attempt).where(Attempt.id == attempt_id))
    attempt = result.scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.student_id != student.id:
        raise HTTPException(status_code=403, detail="Not your attempt")
    if attempt.status != "IN_PROGRESS":
        raise HTTPException(status_code=409, detail="Attempt already submitted")

    attempt.answers = payload.answers
    result = await grade_attempt(attempt, db)
    await ws_manager.broadcast_role("PROFESSOR", {
        "type": "SUBMISSION",
        "student_name": student.full_name,
        "exam_title": result.exam_title,
        "score": result.score,
        "message": f'{student.full_name} submitted “{result.exam_title}” — {result.score:.1f}%',
    })
    background_tasks.add_task(
        send_result_email,
        student.email,
        student.full_name,
        result.exam_title,
        result.score,
    )
    return result


@router.get("/{attempt_id}/questions", response_model=list[QuestionOut])
async def get_attempt_questions(
    attempt_id: str,
    student: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Returns ordered questions for an in-progress attempt — correct_answer excluded."""
    result = await db.execute(select(Attempt).where(Attempt.id == attempt_id))
    attempt = result.scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.student_id != student.id:
        raise HTTPException(status_code=403, detail="Not your attempt")
    if attempt.status != "IN_PROGRESS":
        raise HTTPException(status_code=400, detail="Attempt is not in progress")

    set_result = await db.execute(select(ExamSet).where(ExamSet.id == attempt.set_id))
    exam_set = set_result.scalar_one()

    q_result = await db.execute(
        select(Question).where(Question.id.in_(exam_set.question_ids))
    )
    q_map = {q.id: q for q in q_result.scalars().all()}
    return [q_map[qid] for qid in exam_set.question_ids if qid in q_map]


@router.get("/my", response_model=list[AttemptOut])
async def my_attempts(
    student: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attempt)
        .where(Attempt.student_id == student.id)
        .order_by(Attempt.started_at.desc())
    )
    return result.scalars().all()


@router.get("/{attempt_id}/result", response_model=AttemptResult)
async def get_result(
    attempt_id: str,
    student: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Attempt).where(Attempt.id == attempt_id))
    attempt = result.scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.student_id != student.id:
        raise HTTPException(status_code=403, detail="Not your attempt")
    if attempt.status == "IN_PROGRESS":
        raise HTTPException(status_code=400, detail="Attempt not yet submitted")

    return await grade_attempt(attempt, db)


@router.get("/exam/{exam_id}", response_model=list[AttemptOutWithStudent])
async def exam_attempts(
    exam_id: str,
    professor: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    """All attempts for an exam — PROFESSOR (own exams only) or ADMIN."""
    exam_result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = exam_result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    # Professors can view results for any exam (not restricted to their own)

    result = await db.execute(
        select(Attempt)
        .where(Attempt.exam_id == exam_id)
        .order_by(Attempt.submitted_at.desc())
    )
    attempts = result.scalars().all()

    # Batch-load student names
    student_ids = list({a.student_id for a in attempts})
    if student_ids:
        users_res = await db.execute(select(User).where(User.id.in_(student_ids)))
        student_map = {u.id: u.full_name for u in users_res.scalars().all()}
    else:
        student_map = {}

    # Batch-load set labels
    set_ids = list({a.set_id for a in attempts})
    if set_ids:
        sets_res = await db.execute(select(ExamSet).where(ExamSet.id.in_(set_ids)))
        set_map = {s.id: s.set_label for s in sets_res.scalars().all()}
    else:
        set_map = {}

    out = []
    for a in attempts:
        item = AttemptOutWithStudent.model_validate(a)
        item.student_name = student_map.get(a.student_id)
        item.set_label = set_map.get(a.set_id)
        out.append(item)
    return out


# ── Admin backward-compat endpoint ────────────────────────────────────────────

@router.get("/admin/all", response_model=list[AttemptOut])
async def all_attempts(
    exam_id: str | None = None,
    _prof: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    q = select(Attempt)
    if exam_id:
        q = q.where(Attempt.exam_id == exam_id)
    result = await db.execute(q.order_by(Attempt.submitted_at.desc()))
    return result.scalars().all()
