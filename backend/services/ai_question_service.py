"""
AI question generation — OpenRouter primary, Groq fallback.
Accepts raw text (already extracted from PDF) and returns validated MCQ dicts.
"""

import json
import logging
import re

import httpx
from groq import Groq

from core.config import settings

logger = logging.getLogger(__name__)

# Token budget per chunk sent to the model
CHUNK_TOKEN_BUDGET = 600

# One hardcoded few-shot example shown to the model every call
FEW_SHOT_EXAMPLE = """[
  {
    "question": "Which data structure uses LIFO ordering?",
    "option_a": "Queue",
    "option_b": "Stack",
    "option_c": "Heap",
    "option_d": "Graph",
    "correct_answer": "b",
    "difficulty": "EASY",
    "topic": "Data Structures"
  }
]"""

SYSTEM_PROMPT = """You are an expert exam question writer for computer science courses.
Generate multiple-choice questions (MCQs) strictly in JSON array format.
Each question must have exactly these keys:
  question, option_a, option_b, option_c, option_d, correct_answer, difficulty, topic
Rules:
- correct_answer must be exactly "a", "b", "c", or "d"
- difficulty must be exactly "EASY", "MEDIUM", or "HARD"
- Each option must be under 120 characters
- Do not include the correct answer text verbatim in the question stem
- Generate 5 questions per chunk unless the content is too short
- Return ONLY the JSON array — no markdown fences, no explanation"""


def _chunk_text(text: str, max_tokens: int = CHUNK_TOKEN_BUDGET) -> list[str]:
    """Rough token-based chunking (1 token ≈ 4 chars)."""
    max_chars = max_tokens * 4
    words = text.split()
    chunks, current = [], []
    current_len = 0
    for word in words:
        wlen = len(word) + 1
        if current_len + wlen > max_chars and current:
            chunks.append(" ".join(current))
            current, current_len = [], 0
        current.append(word)
        current_len += wlen
    if current:
        chunks.append(" ".join(current))
    return chunks


def _validate_questions(raw: list[dict]) -> list[dict]:
    """Post-parse filter — drops malformed or low-quality questions."""
    valid = []
    required = {"question", "option_a", "option_b", "option_c", "option_d",
                "correct_answer", "difficulty", "topic"}
    for item in raw:
        if not isinstance(item, dict):
            continue
        if not required.issubset(item.keys()):
            logger.warning("Skipped: missing keys → %s", set(item.keys()))
            continue
        if item.get("correct_answer", "").lower() not in {"a", "b", "c", "d"}:
            logger.warning("Skipped: invalid correct_answer → %s", item.get("correct_answer"))
            continue
        options = [item["option_a"], item["option_b"], item["option_c"], item["option_d"]]
        if any(len(o) > 120 for o in options):
            logger.warning("Skipped: option too long in '%s'", item["question"][:40])
            continue
        stem_lower = item["question"].lower()
        correct_key = f"option_{item['correct_answer'].lower()}"
        if item.get(correct_key, "").lower() in stem_lower:
            logger.warning("Skipped: answer text appears in stem → '%s'", item["question"][:40])
            continue
        item["correct_answer"] = item["correct_answer"].lower()
        item["difficulty"] = item["difficulty"].upper()
        valid.append(item)
    return valid


def _parse_json_from_response(text: str) -> list[dict]:
    """Extract JSON array even if the model wrapped it in markdown fences."""
    text = text.strip()
    # Strip ```json ... ``` or ``` ... ```
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def _build_prompt(chunk: str) -> str:
    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"### FEW-SHOT EXAMPLE ###\n{FEW_SHOT_EXAMPLE}\n\n"
        f"### DOCUMENT CONTENT ###\n{chunk}\n\n"
        "### INSTRUCTIONS ###\n"
        "Generate 5 MCQs from the document content above. "
        "Return only the JSON array."
    )


async def generate_questions_from_text(
    text: str,
    category_name: str = "General",
    num_questions: int = 10,
) -> list[dict]:
    """
    Entry point — called by the AI router.
    Tries Gemini; falls back to Groq on any failure.
    Returns a list of validated question dicts.
    """
    chunks = _chunk_text(text)
    questions: list[dict] = []

    for chunk in chunks:
        if len(questions) >= num_questions:
            break
        prompt = _build_prompt(chunk)
        batch = await _try_openrouter(prompt) or await _try_groq(prompt)
        if batch:
            questions.extend(_validate_questions(batch))

    return questions[:num_questions]


async def _try_openrouter(prompt: str) -> list[dict] | None:
    if not settings.OPENROUTER_API_KEY or settings.OPENROUTER_API_KEY.startswith("placeholder"):
        return None
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "google/gemini-2.5-flash",
                    "messages": [
                        {"role": "system", "content": "Return only valid JSON arrays. No markdown."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.4,
                    "max_tokens": 2048,
                },
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            return _parse_json_from_response(content)
    except Exception as exc:
        logger.warning("OpenRouter failed: %s — falling back to Groq", exc)
        return None


async def _try_groq(prompt: str) -> list[dict] | None:
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY.startswith("placeholder"):
        logger.error("No valid AI API key configured")
        return None
    try:
        client = Groq(api_key=settings.GROQ_API_KEY)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Return only valid JSON arrays. No markdown."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
            max_tokens=2048,
        )
        return _parse_json_from_response(response.choices[0].message.content)
    except Exception as exc:
        logger.error("Groq also failed: %s", exc)
        return None
