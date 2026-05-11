"""
PDF report generation service.
Uses ReportLab for layout and Matplotlib for charts embedded as PNG images.
"""

import io
import logging
from datetime import datetime, timezone

import matplotlib
matplotlib.use("Agg")  # non-interactive backend — must be set before pyplot import
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable, Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table,
    TableStyle,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.attempt import Attempt
from models.exam import Exam
from models.exam_set import ExamSet
from models.question import Question
from models.user import User

logger = logging.getLogger(__name__)

# ── Brand colours ─────────────────────────────────────────────────────────────
NAVY   = colors.HexColor("#0f172a")
INDIGO = colors.HexColor("#4f46e5")
GREEN  = colors.HexColor("#059669")
RED    = colors.HexColor("#dc2626")
AMBER  = colors.HexColor("#d97706")
SLATE  = colors.HexColor("#64748b")
LIGHT  = colors.HexColor("#f8fafc")

W, H = A4  # 595 × 842 pt


# ── Chart helpers ──────────────────────────────────────────────────────────────

def _fig_to_image(fig, width_cm: float = 12) -> Image:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    img = Image(buf)
    aspect = img.imageHeight / img.imageWidth
    w = width_cm * cm
    img.drawWidth  = w
    img.drawHeight = w * aspect
    return img


def generate_pie_chart(values: list[float], labels: list[str], colors_hex: list[str]) -> Image:
    fig, ax = plt.subplots(figsize=(4, 3))
    wedge_colors = [c if c.startswith("#") else "#" + c for c in colors_hex]
    wedges, texts, autotexts = ax.pie(
        values, labels=labels, colors=wedge_colors,
        autopct="%1.1f%%", startangle=90,
        wedgeprops={"edgecolor": "white", "linewidth": 1.5},
    )
    for t in texts:
        t.set_fontsize(9)
    for a in autotexts:
        a.set_fontsize(8)
        a.set_color("white")
        a.set_fontweight("bold")
    ax.axis("equal")
    fig.patch.set_facecolor("white")
    return _fig_to_image(fig, 9)


def generate_bar_chart(
    categories: list[str], values: list[float], title: str,
    color_hex: str = "#4f46e5", ylabel: str = "Score (%)"
) -> Image:
    fig, ax = plt.subplots(figsize=(7, 3.5))
    bar_colors = [
        "#059669" if v >= 60 else "#dc2626" if ylabel == "Score (%)" else color_hex
        for v in values
    ]
    bars = ax.bar(categories, values, color=bar_colors, edgecolor="white", linewidth=0.8, width=0.55)
    ax.set_title(title, fontsize=10, fontweight="bold", pad=8, color="#0f172a")
    ax.set_ylabel(ylabel, fontsize=8, color="#64748b")
    ax.tick_params(axis="x", labelsize=7, rotation=25)
    ax.tick_params(axis="y", labelsize=7)
    ax.spines[["top", "right"]].set_visible(False)
    ax.set_ylim(0, max(values) * 1.15 + 1)
    for bar, val in zip(bars, values):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 0.5,
            f"{val:.1f}", ha="center", va="bottom", fontsize=7, color="#334155"
        )
    fig.patch.set_facecolor("white")
    fig.tight_layout()
    return _fig_to_image(fig, 13)


def generate_line_chart(
    x_values: list, y_values: list[float], title: str, ylabel: str = "Avg Score (%)"
) -> Image:
    fig, ax = plt.subplots(figsize=(7, 3))
    ax.plot(x_values, y_values, marker="o", color="#4f46e5", linewidth=2, markersize=5)
    ax.fill_between(range(len(x_values)), y_values, alpha=0.1, color="#4f46e5")
    ax.set_title(title, fontsize=10, fontweight="bold", color="#0f172a")
    ax.set_ylabel(ylabel, fontsize=8, color="#64748b")
    ax.set_xticks(range(len(x_values)))
    ax.set_xticklabels([str(x) for x in x_values], fontsize=7, rotation=20)
    ax.tick_params(axis="y", labelsize=7)
    ax.spines[["top", "right"]].set_visible(False)
    fig.patch.set_facecolor("white")
    fig.tight_layout()
    return _fig_to_image(fig, 13)


# ── Style helpers ──────────────────────────────────────────────────────────────

def _styles():
    base = getSampleStyleSheet()
    return {
        "title":   ParagraphStyle("qm_title",   fontSize=20, textColor=colors.white,  spaceAfter=4,  fontName="Helvetica-Bold"),
        "subtitle":ParagraphStyle("qm_sub",     fontSize=10, textColor=colors.HexColor("#94a3b8"), spaceAfter=2),
        "h2":      ParagraphStyle("qm_h2",      fontSize=13, textColor=NAVY,  spaceBefore=12, spaceAfter=6,  fontName="Helvetica-Bold"),
        "h3":      ParagraphStyle("qm_h3",      fontSize=10, textColor=INDIGO, spaceBefore=8, spaceAfter=4,  fontName="Helvetica-Bold"),
        "body":    ParagraphStyle("qm_body",    fontSize=9,  textColor=NAVY,  spaceAfter=3,  leading=13),
        "small":   ParagraphStyle("qm_small",   fontSize=8,  textColor=SLATE, spaceAfter=2),
        "label":   ParagraphStyle("qm_label",   fontSize=8,  textColor=SLATE, alignment=TA_RIGHT),
        "mono":    ParagraphStyle("qm_mono",    fontSize=9,  fontName="Courier", textColor=NAVY),
        "green":   ParagraphStyle("qm_green",   fontSize=9,  textColor=GREEN,  fontName="Helvetica-Bold"),
        "red":     ParagraphStyle("qm_red",     fontSize=9,  textColor=RED,    fontName="Helvetica-Bold"),
        "center":  ParagraphStyle("qm_center",  fontSize=9,  textColor=NAVY,   alignment=TA_CENTER),
    }


def _header_table(title: str, subtitle: str) -> Table:
    """Dark navy banner at the top of each page."""
    s = _styles()
    t = Table(
        [[Paragraph(title, s["title"]), Paragraph(subtitle, s["subtitle"])]],
        colWidths=[13 * cm, None],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("TOPPADDING",    (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("LEFTPADDING",   (0, 0), (-1, -1), 18),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 18),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN",         (1, 0), (1, 0),  "RIGHT"),
    ]))
    return t


def _stat_row(pairs: list[tuple[str, str]]) -> Table:
    """Horizontal row of label/value stat boxes."""
    s = _styles()
    n = len(pairs)
    labels = [Paragraph(lbl, s["small"]) for lbl, _ in pairs]
    values = [Paragraph(val, ParagraphStyle("sv", fontSize=14, fontName="Helvetica-Bold", textColor=INDIGO)) for _, val in pairs]
    col_w = (W - 3.6 * cm) / n
    t = Table([labels, values], colWidths=[col_w] * n)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), LIGHT),
        ("BOX",           (0, 0), (-1, -1), 0.5, colors.HexColor("#e0e7ff")),
        ("INNERGRID",     (0, 0), (-1, -1), 0.5, colors.HexColor("#e0e7ff")),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("ALIGN",         (0, 0), (-1, -1), "LEFT"),
    ]))
    return t


def _divider():
    return HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e0e7ff"), spaceAfter=6, spaceBefore=6)


# ── 1. Student result PDF ──────────────────────────────────────────────────────

async def generate_student_result_pdf(attempt_id: str, db: AsyncSession) -> bytes:
    # Load data
    attempt_res = await db.execute(select(Attempt).where(Attempt.id == attempt_id))
    attempt = attempt_res.scalar_one_or_none()
    if not attempt:
        raise ValueError("Attempt not found")

    student_res = await db.execute(select(User).where(User.id == attempt.student_id))
    student = student_res.scalar_one()

    exam_res = await db.execute(select(Exam).where(Exam.id == attempt.exam_id))
    exam = exam_res.scalar_one()

    set_res = await db.execute(select(ExamSet).where(ExamSet.id == attempt.set_id))
    exam_set = set_res.scalar_one()

    q_res = await db.execute(select(Question).where(Question.id.in_(exam_set.question_ids)))
    q_map = {q.id: q for q in q_res.scalars().all()}
    ordered_qs = [q_map[qid] for qid in exam_set.question_ids if qid in q_map]

    student_answers: dict = attempt.answers or {}
    correct_count = sum(1 for q in ordered_qs if student_answers.get(q.id) == q.correct_answer)
    total = len(ordered_qs)
    score = attempt.score or 0.0
    passed = score >= 60

    duration_str = "—"
    if attempt.started_at and attempt.submitted_at:
        secs = int((attempt.submitted_at - attempt.started_at).total_seconds())
        duration_str = f"{secs // 60}m {secs % 60}s"

    # Topic performance
    topic_scores: dict[str, list[bool]] = {}
    for q in ordered_qs:
        t = q.topic or q.chapter or "General"
        topic_scores.setdefault(t, [])
        topic_scores[t].append(student_answers.get(q.id) == q.correct_answer)

    s = _styles()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.8*cm, rightMargin=1.8*cm,
                             topMargin=1.5*cm, bottomMargin=1.5*cm)
    story = []

    # ── Page 1: Summary ────────────────────────────────────────────────────────
    story.append(_header_table("Exam Result", f"Generated {datetime.now(timezone.utc).strftime('%d %b %Y')}"))
    story.append(Spacer(1, 12))

    story.append(_stat_row([
        ("Student", student.full_name),
        ("Exam", exam.title[:30]),
        ("Paper Set", exam_set.set_label),
        ("Duration", duration_str),
    ]))
    story.append(Spacer(1, 8))

    pass_color = GREEN if passed else RED
    pass_text  = "PASS" if passed else "FAIL"
    story.append(_stat_row([
        ("Score", f"{score:.1f}%"),
        ("Correct", f"{correct_count} / {total}"),
        ("Status", pass_text),
        ("Date", attempt.submitted_at.strftime("%d %b %Y") if attempt.submitted_at else "—"),
    ]))
    story.append(Spacer(1, 14))

    # Charts row
    pie = generate_pie_chart(
        [correct_count, total - correct_count],
        ["Correct", "Incorrect"],
        ["#059669", "#dc2626"],
    )
    story.append(Paragraph("Performance Overview", s["h2"]))
    story.append(_divider())

    if topic_scores:
        topics = list(topic_scores.keys())
        t_scores = [
            round(sum(v) / len(v) * 100, 1) for v in topic_scores.values()
        ]
        bar = generate_bar_chart(topics, t_scores, "Score by Topic")
        tbl = Table([[pie, bar]], colWidths=[9 * cm, 9 * cm])
        tbl.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0,0),(-1,-1), 0)]))
        story.append(tbl)
    else:
        story.append(pie)

    story.append(PageBreak())

    # ── Page 2: Question breakdown ─────────────────────────────────────────────
    story.append(_header_table("Question Breakdown", exam.title))
    story.append(Spacer(1, 12))

    for i, q in enumerate(ordered_qs, 1):
        student_ans = student_answers.get(q.id)
        is_correct  = student_ans == q.correct_answer
        marker      = "✓" if is_correct else "✗"
        m_style     = s["green"] if is_correct else s["red"]

        story.append(Paragraph(f"<b>Q{i}.</b> {q.content}", s["body"]))
        opts = {"a": q.option_a, "b": q.option_b, "c": q.option_c, "d": q.option_d}
        for letter, text in opts.items():
            style = s["green"] if letter == student_ans and is_correct else \
                    s["red"]   if letter == student_ans and not is_correct else \
                    s["small"]
            story.append(Paragraph(f"  ({letter.upper()}) {text}", style))

        ans_display = student_ans.upper() if student_ans else "Not answered"
        story.append(Paragraph(f"{marker} Your answer: <b>{ans_display}</b>", m_style))

        # Only reveal correct answer when student got it wrong
        if not is_correct:
            story.append(Paragraph(
                f"  Correct answer: <b>{q.correct_answer.upper()}</b>",
                s["green"]
            ))
        story.append(_divider())

    doc.build(story)
    return buf.getvalue()


# ── 2. Professor per-exam report PDF ──────────────────────────────────────────

async def generate_exam_report_pdf(exam_id: str, db: AsyncSession) -> bytes:
    exam_res = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = exam_res.scalar_one_or_none()
    if not exam:
        raise ValueError("Exam not found")

    attempts_res = await db.execute(
        select(Attempt).where(
            Attempt.exam_id == exam_id,
            Attempt.status.in_(["SUBMITTED", "TIMED_OUT"]),
        )
    )
    attempts = attempts_res.scalars().all()

    student_ids = [a.student_id for a in attempts]
    students_res = await db.execute(select(User).where(User.id.in_(student_ids)))
    student_map = {u.id: u for u in students_res.scalars().all()}

    scores = [a.score or 0.0 for a in attempts]
    passed = [s for s in scores if s >= 60]
    avg    = round(sum(scores) / len(scores), 2) if scores else 0
    high   = round(max(scores), 2) if scores else 0
    low    = round(min(scores), 2) if scores else 0
    pass_rate = round(len(passed) / len(scores) * 100, 2) if scores else 0

    # Question analysis
    set_ids = list({a.set_id for a in attempts})
    sets_res = await db.execute(select(ExamSet).where(ExamSet.id.in_(set_ids)))
    sets_map = {s.id: s for s in sets_res.scalars().all()}

    all_qids: set[str] = set()
    for es in sets_map.values():
        all_qids.update(es.question_ids)
    q_res = await db.execute(select(Question).where(Question.id.in_(all_qids)))
    q_map = {q.id: q for q in q_res.scalars().all()}

    q_correct: dict[str, int] = {}
    q_total:   dict[str, int] = {}
    for a in attempts:
        es = sets_map.get(a.set_id)
        if not es:
            continue
        for qid in es.question_ids:
            q_total[qid]   = q_total.get(qid, 0) + 1
            if a.answers.get(qid) == (q_map[qid].correct_answer if qid in q_map else None):
                q_correct[qid] = q_correct.get(qid, 0) + 1

    topic_scores: dict[str, list[float]] = {}
    for qid, q in q_map.items():
        t = q.topic or q.chapter or "General"
        if q_total.get(qid, 0) > 0:
            pct = round(q_correct.get(qid, 0) / q_total[qid] * 100, 1)
            topic_scores.setdefault(t, []).append(pct)

    s = _styles()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.8*cm, rightMargin=1.8*cm,
                             topMargin=1.5*cm, bottomMargin=1.5*cm)
    story = []

    # ── Page 1: Exam overview ──────────────────────────────────────────────────
    story.append(_header_table(exam.title, "Exam Performance Report"))
    story.append(Spacer(1, 12))

    story.append(_stat_row([
        ("Total Students", str(len(attempts))),
        ("Avg Score",      f"{avg}%"),
        ("Highest",        f"{high}%"),
        ("Lowest",         f"{low}%"),
        ("Pass Rate",      f"{pass_rate}%"),
    ]))
    story.append(Spacer(1, 14))

    if scores:
        # Score distribution bar chart
        buckets = ["0-20", "21-40", "41-60", "61-80", "81-100"]
        counts  = [0] * 5
        for sc in scores:
            idx = min(int(sc // 20), 4)
            counts[idx] += 1

        bar = generate_bar_chart(buckets, counts, "Score Distribution", ylabel="Students")
        pie = generate_pie_chart(
            [len(passed), len(scores) - len(passed)],
            ["Pass", "Fail"],
            ["#059669", "#dc2626"],
        )
        tbl = Table([[bar, pie]], colWidths=[11 * cm, 7 * cm])
        tbl.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0,0),(-1,-1), 0)]))
        story.append(Paragraph("Score Distribution & Pass/Fail Ratio", s["h2"]))
        story.append(_divider())
        story.append(tbl)

    story.append(PageBreak())

    # ── Page 2: Topic analysis ─────────────────────────────────────────────────
    story.append(_header_table(exam.title, "Topic Analysis"))
    story.append(Spacer(1, 12))

    if topic_scores:
        topics = list(topic_scores.keys())
        t_avgs = [round(sum(v) / len(v), 1) for v in topic_scores.values()]
        story.append(generate_bar_chart(topics, t_avgs, "Average Correct % by Topic"))
        story.append(Spacer(1, 10))

    # Question difficulty table
    story.append(Paragraph("Question-wise Correct Answer Rate", s["h2"]))
    story.append(_divider())

    q_rows = [["#", "Question (truncated)", "Correct %", "Flag"]]
    for i, (qid, q) in enumerate(q_map.items(), 1):
        if q_total.get(qid, 0) == 0:
            continue
        pct = round(q_correct.get(qid, 0) / q_total[qid] * 100, 1)
        flag = "DIFFICULT" if pct < 50 else ""
        q_rows.append([str(i), q.content[:60] + ("…" if len(q.content) > 60 else ""), f"{pct}%", flag])

    if len(q_rows) > 1:
        tbl = Table(q_rows, colWidths=[1*cm, 10*cm, 2.5*cm, 3*cm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0),  INDIGO),
            ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
            ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 7),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [LIGHT, colors.white]),
            ("TEXTCOLOR",     (3, 1), (3, -1),  RED),
            ("FONTNAME",      (3, 1), (3, -1),  "Helvetica-Bold"),
            ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#e0e7ff")),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING",   (0, 0), (-1, -1), 5),
        ]))
        story.append(tbl)

    story.append(PageBreak())

    # ── Page 3: Student performance table ─────────────────────────────────────
    story.append(_header_table(exam.title, "Student Performance Rankings"))
    story.append(Spacer(1, 12))

    ranked = sorted(attempts, key=lambda a: a.score or 0, reverse=True)
    rows   = [["Rank", "Student Name", "Score", "Status", "Time Taken"]]
    for rank, a in enumerate(ranked, 1):
        stu = student_map.get(a.student_id)
        dur = "—"
        if a.started_at and a.submitted_at:
            secs = int((a.submitted_at - a.started_at).total_seconds())
            dur  = f"{secs // 60}m {secs % 60}s"
        rows.append([
            str(rank),
            stu.full_name if stu else a.student_id[:8],
            f"{a.score:.1f}%" if a.score is not None else "—",
            "PASS" if (a.score or 0) >= 60 else "FAIL",
            dur,
        ])

    tbl = Table(rows, colWidths=[1.5*cm, 7*cm, 2.5*cm, 2.5*cm, 3*cm])
    style = [
        ("BACKGROUND",    (0, 0), (-1, 0),  INDIGO),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 8),
        ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#e0e7ff")),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [LIGHT, colors.white]),
    ]
    # Highlight top 3
    for r in range(1, min(4, len(rows))):
        style.append(("BACKGROUND", (0, r), (-1, r), colors.HexColor("#eef2ff")))
        style.append(("FONTNAME",   (0, r), (-1, r), "Helvetica-Bold"))
    tbl.setStyle(TableStyle(style))
    story.append(tbl)

    doc.build(story)
    return buf.getvalue()


# ── 3. Professor overall report PDF ───────────────────────────────────────────

async def generate_professor_overall_pdf(professor_id: str, db: AsyncSession) -> bytes:
    prof_res = await db.execute(select(User).where(User.id == professor_id))
    professor = prof_res.scalar_one_or_none()
    if not professor:
        raise ValueError("Professor not found")

    exams_res = await db.execute(select(Exam).where(Exam.created_by == professor_id))
    exams = exams_res.scalars().all()
    exam_ids = [e.id for e in exams]
    exam_map = {e.id: e for e in exams}

    attempts_res = await db.execute(
        select(Attempt).where(
            Attempt.exam_id.in_(exam_ids),
            Attempt.status.in_(["SUBMITTED", "TIMED_OUT"]),
        )
    )
    attempts = attempts_res.scalars().all()

    student_ids = list({a.student_id for a in attempts})
    students_res = await db.execute(select(User).where(User.id.in_(student_ids)))
    student_map = {u.id: u for u in students_res.scalars().all()}

    scores_by_exam: dict[str, list[float]] = {}
    for a in attempts:
        scores_by_exam.setdefault(a.exam_id, []).append(a.score or 0)

    overall_avg = (
        round(sum(a.score or 0 for a in attempts) / len(attempts), 2) if attempts else 0
    )

    s = _styles()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.8*cm, rightMargin=1.8*cm,
                             topMargin=1.5*cm, bottomMargin=1.5*cm)
    story = []

    # ── Page 1: Summary ────────────────────────────────────────────────────────
    story.append(_header_table(f"Professor Report: {professor.full_name}", datetime.now(timezone.utc).strftime("%d %b %Y")))
    story.append(Spacer(1, 12))

    story.append(_stat_row([
        ("Total Exams",   str(len(exams))),
        ("Total Students", str(len(student_ids))),
        ("Total Attempts", str(len(attempts))),
        ("Overall Avg",   f"{overall_avg}%"),
    ]))
    story.append(Spacer(1, 14))

    if scores_by_exam:
        e_titles = [exam_map[eid].title[:20] for eid in scores_by_exam]
        e_avgs   = [round(sum(v) / len(v), 1) for v in scores_by_exam.values()]
        story.append(Paragraph("Exam-wise Average Scores", s["h2"]))
        story.append(_divider())
        story.append(generate_bar_chart(e_titles, e_avgs, "Exam Performance"))

        # Trend line: average score per exam (sorted by created_at)
        sorted_exams = sorted(exams, key=lambda e: e.created_at)
        trend_x = [e.title[:12] for e in sorted_exams if e.id in scores_by_exam]
        trend_y = [
            round(sum(scores_by_exam[e.id]) / len(scores_by_exam[e.id]), 1)
            for e in sorted_exams if e.id in scores_by_exam
        ]
        if len(trend_y) > 1:
            story.append(Spacer(1, 8))
            story.append(generate_line_chart(trend_x, trend_y, "Student Performance Trend"))

    story.append(PageBreak())

    # ── Page 2: Exam comparison table ─────────────────────────────────────────
    story.append(_header_table(f"Professor Report: {professor.full_name}", "Exam Comparison"))
    story.append(Spacer(1, 12))

    if scores_by_exam:
        best_eid  = max(scores_by_exam, key=lambda eid: sum(scores_by_exam[eid]) / len(scores_by_exam[eid]))
        worst_eid = min(scores_by_exam, key=lambda eid: sum(scores_by_exam[eid]) / len(scores_by_exam[eid]))

        rows = [["Exam Name", "Students", "Avg Score", "Pass Rate", "Date", "Note"]]
        for eid, sc_list in scores_by_exam.items():
            e    = exam_map[eid]
            avg  = round(sum(sc_list) / len(sc_list), 1)
            pr   = round(sum(1 for s in sc_list if s >= 60) / len(sc_list) * 100, 1)
            note = "BEST" if eid == best_eid else ("WORST" if eid == worst_eid else "")
            rows.append([
                e.title[:25], str(len(sc_list)), f"{avg}%", f"{pr}%",
                e.created_at.strftime("%d %b"), note,
            ])

        tbl = Table(rows, colWidths=[6.5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2*cm, 2*cm])
        style = [
            ("BACKGROUND",    (0, 0), (-1, 0),  INDIGO),
            ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
            ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 8),
            ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#e0e7ff")),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [LIGHT, colors.white]),
        ]
        # colour note column
        for r, row in enumerate(rows[1:], 1):
            if row[-1] == "BEST":
                style.append(("TEXTCOLOR", (5, r), (5, r), GREEN))
                style.append(("FONTNAME",  (5, r), (5, r), "Helvetica-Bold"))
            elif row[-1] == "WORST":
                style.append(("TEXTCOLOR", (5, r), (5, r), RED))
                style.append(("FONTNAME",  (5, r), (5, r), "Helvetica-Bold"))
        tbl.setStyle(TableStyle(style))
        story.append(tbl)

    story.append(PageBreak())

    # ── Page 3: Student insights ───────────────────────────────────────────────
    story.append(_header_table(f"Professor Report: {professor.full_name}", "Student Insights"))
    story.append(Spacer(1, 12))

    student_avg: dict[str, list[float]] = {}
    for a in attempts:
        student_avg.setdefault(a.student_id, []).append(a.score or 0)

    ranked_students = sorted(
        student_avg.items(),
        key=lambda kv: sum(kv[1]) / len(kv[1]),
        reverse=True,
    )

    consistent  = [(sid, avgs) for sid, avgs in ranked_students if sum(avgs) / len(avgs) >= 70]
    needs_attn  = [(sid, avgs) for sid, avgs in ranked_students if sum(avgs) / len(avgs) < 50]

    story.append(Paragraph("Top Performing Students", s["h2"]))
    story.append(_divider())
    rows = [["Student", "Exams", "Avg Score"]]
    for sid, avgs in consistent[:10]:
        stu = student_map.get(sid)
        rows.append([stu.full_name if stu else sid[:8], str(len(avgs)), f"{round(sum(avgs)/len(avgs),1)}%"])
    if len(rows) > 1:
        tbl = Table(rows, colWidths=[9*cm, 3*cm, 4*cm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), INDIGO),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 8),
            ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#e0e7ff")),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [LIGHT, colors.white]),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ]))
        story.append(tbl)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Students Needing Attention (Avg < 50%)", s["h2"]))
    story.append(_divider())
    rows2 = [["Student", "Exams", "Avg Score"]]
    for sid, avgs in needs_attn[:10]:
        stu = student_map.get(sid)
        rows2.append([stu.full_name if stu else sid[:8], str(len(avgs)), f"{round(sum(avgs)/len(avgs),1)}%"])
    if len(rows2) > 1:
        tbl2 = Table(rows2, colWidths=[9*cm, 3*cm, 4*cm])
        tbl2.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), RED),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 8),
            ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#e0e7ff")),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [LIGHT, colors.white]),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ]))
        story.append(tbl2)

    doc.build(story)
    return buf.getvalue()


# ── 4. Admin platform report PDF ──────────────────────────────────────────────

async def generate_admin_platform_pdf(db: AsyncSession) -> bytes:
    users_res = await db.execute(select(User))
    all_users = users_res.scalars().all()
    professors = [u for u in all_users if u.role == "PROFESSOR"]
    students   = [u for u in all_users if u.role == "STUDENT"]

    exams_res = await db.execute(select(Exam))
    exams = exams_res.scalars().all()
    exam_map = {e.id: e for e in exams}

    attempts_res = await db.execute(select(Attempt))
    all_attempts = attempts_res.scalars().all()
    submitted = [a for a in all_attempts if a.status in ("SUBMITTED", "TIMED_OUT")]
    passed    = [a for a in submitted if (a.score or 0) >= 60]

    s = _styles()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.8*cm, rightMargin=1.8*cm,
                             topMargin=1.5*cm, bottomMargin=1.5*cm)
    story = []

    story.append(_header_table("Platform Report", datetime.now(timezone.utc).strftime("%d %b %Y")))
    story.append(Spacer(1, 12))

    story.append(_stat_row([
        ("Professors",    str(len(professors))),
        ("Students",      str(len(students))),
        ("Total Exams",   str(len(exams))),
        ("Total Attempts",str(len(all_attempts))),
    ]))
    story.append(Spacer(1, 8))

    pass_rate = round(len(passed) / len(submitted) * 100, 2) if submitted else 0
    avg_score = round(sum(a.score or 0 for a in submitted) / len(submitted), 2) if submitted else 0
    story.append(_stat_row([
        ("Submitted",  str(len(submitted))),
        ("Pass Rate",  f"{pass_rate}%"),
        ("Fail Rate",  f"{100 - pass_rate:.2f}%"),
        ("Avg Score",  f"{avg_score}%"),
    ]))
    story.append(Spacer(1, 14))

    # Exams per professor bar chart
    prof_map = {u.id: u for u in professors}
    prof_exam_counts: dict[str, int] = {}
    for e in exams:
        if e.created_by in prof_map:
            name = prof_map[e.created_by].full_name[:18]
            prof_exam_counts[name] = prof_exam_counts.get(name, 0) + 1
    if prof_exam_counts:
        story.append(Paragraph("Exams per Professor", s["h2"]))
        story.append(_divider())
        story.append(generate_bar_chart(
            list(prof_exam_counts.keys()),
            list(prof_exam_counts.values()),
            "Exams Created",
            ylabel="Exams",
        ))
        story.append(Spacer(1, 8))

    # Pass/fail pie
    if submitted:
        story.append(Paragraph("Platform Pass / Fail Ratio", s["h2"]))
        story.append(_divider())
        story.append(generate_pie_chart(
            [len(passed), len(submitted) - len(passed)],
            ["Pass", "Fail"],
            ["#059669", "#dc2626"],
        ))
        story.append(Spacer(1, 8))

    # Top performing professors
    prof_scores: dict[str, list[float]] = {}
    for a in submitted:
        exam = exam_map.get(a.exam_id)
        if exam and exam.created_by in prof_map:
            prof_scores.setdefault(exam.created_by, []).append(a.score or 0)

    if prof_scores:
        story.append(Paragraph("Top Performing Professors (by Avg Student Score)", s["h2"]))
        story.append(_divider())
        ranked = sorted(
            prof_scores.items(),
            key=lambda kv: sum(kv[1]) / len(kv[1]),
            reverse=True,
        )
        rows = [["Professor", "Exams", "Students Examined", "Avg Score"]]
        for pid, sc_list in ranked:
            prof = prof_map[pid]
            n_exams = sum(1 for e in exams if e.created_by == pid)
            rows.append([prof.full_name, str(n_exams), str(len(sc_list)), f"{round(sum(sc_list)/len(sc_list),1)}%"])
        tbl = Table(rows, colWidths=[7*cm, 2.5*cm, 4*cm, 3*cm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), INDIGO),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 8),
            ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#e0e7ff")),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [LIGHT, colors.white]),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ]))
        story.append(tbl)
        story.append(Spacer(1, 10))

    # Most attempted exams
    exam_attempt_counts: dict[str, int] = {}
    for a in all_attempts:
        exam_attempt_counts[a.exam_id] = exam_attempt_counts.get(a.exam_id, 0) + 1
    if exam_attempt_counts:
        story.append(Paragraph("Most Attempted Exams", s["h2"]))
        story.append(_divider())
        top_exams = sorted(exam_attempt_counts.items(), key=lambda kv: kv[1], reverse=True)[:10]
        rows = [["Exam Name", "Attempts"]]
        for eid, cnt in top_exams:
            e = exam_map.get(eid)
            rows.append([e.title[:40] if e else eid[:8], str(cnt)])
        tbl = Table(rows, colWidths=[13*cm, 3.5*cm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), INDIGO),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 8),
            ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#e0e7ff")),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [LIGHT, colors.white]),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ]))
        story.append(tbl)

    doc.build(story)
    return buf.getvalue()
