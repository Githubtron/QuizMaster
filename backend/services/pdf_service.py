"""
PDF text extraction using PyMuPDF (fitz).
Returns clean plain text ready to be chunked for AI question generation.
"""

import logging
import re

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract all text from a PDF given as raw bytes.
    Cleans up hyphenated line breaks and excess whitespace.
    """
    text_parts = []
    try:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            for page_num, page in enumerate(doc):
                page_text = page.get_text("text")
                if page_text.strip():
                    text_parts.append(page_text)
    except Exception as exc:
        logger.error("PDF extraction failed: %s", exc)
        raise ValueError(f"Could not parse PDF: {exc}") from exc

    raw = "\n".join(text_parts)
    # Rejoin words split across lines with a hyphen
    raw = re.sub(r"-\n", "", raw)
    # Collapse multiple blank lines
    raw = re.sub(r"\n{3,}", "\n\n", raw)
    return raw.strip()
