import os
import io
import re
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="CareerPilot AI",
    description="AI-powered career guidance and resume analysis API",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

# Your deployed frontend
FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "https://careerpilot-ai-frontend.onrender.com"
)

allowed_origins = [
    FRONTEND_URL,
    "https://careerpilot-ai-frontend.onrender.com",
    "https://careerpilot-ai-hg6v.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
]

# Remove duplicates and empty values
allowed_origins = list(
    dict.fromkeys(
        origin.strip()
        for origin in allowed_origins
        if origin and origin.strip()
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# OPTIONAL IMPORTS
# ============================================================

# PDF
try:
    from pypdf import PdfReader

    PDF_AVAILABLE = True
except Exception:
    PdfReader = None
    PDF_AVAILABLE = False


# DOCX
try:
    from docx import Document

    DOCX_AVAILABLE = True
except Exception:
    Document = None
    DOCX_AVAILABLE = False


# ============================================================
# BASIC ROUTES
# ============================================================

@app.get("/")
async def root():
    return {
        "message": "CareerPilot AI backend is running",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "CareerPilot AI",
    }


@app.get("/api/health")
async def api_health():
    return {
        "status": "healthy",
        "service": "CareerPilot AI",
    }


# ============================================================
# PDF SUPPORT
# ============================================================

@app.get("/pdf-support")
async def pdf_support():
    """
    Endpoint used by the frontend to determine
    whether PDF processing is available.
    """

    return {
        "supported": PDF_AVAILABLE,
        "pdf_support": PDF_AVAILABLE,
        "available": PDF_AVAILABLE,
        "message": (
            "PDF support is available."
            if PDF_AVAILABLE
            else "PDF support is not installed."
        ),
    }


@app.get("/api/pdf-support")
async def api_pdf_support():
    return await pdf_support()


# ============================================================
# FILE TEXT EXTRACTION
# ============================================================

async def extract_pdf_text(file_bytes: bytes) -> str:

    if not PDF_AVAILABLE:
        raise RuntimeError(
            "PDF support is not installed. "
            "Please add pypdf to requirements.txt."
        )

    try:
        reader = PdfReader(io.BytesIO(file_bytes))

        pages = []

        for page in reader.pages:
            try:
                text = page.extract_text() or ""
                pages.append(text)
            except Exception:
                continue

        return "\n".join(pages).strip()

    except Exception as exc:
        raise RuntimeError(
            f"Unable to read PDF file: {str(exc)}"
        )


async def extract_docx_text(file_bytes: bytes) -> str:

    if not DOCX_AVAILABLE:
        raise RuntimeError(
            "DOCX support is not installed. "
            "Please add python-docx to requirements.txt."
        )

    try:
        document = Document(io.BytesIO(file_bytes))

        paragraphs = [
            paragraph.text.strip()
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        ]

        return "\n".join(paragraphs).strip()

    except Exception as exc:
        raise RuntimeError(
            f"Unable to read DOCX file: {str(exc)}"
        )


async def extract_resume_text(
    filename: str,
    file_bytes: bytes
) -> str:

    lower_name = filename.lower()

    # --------------------------------------------------------
    # PDF
    # --------------------------------------------------------

    if lower_name.endswith(".pdf"):

        return await extract_pdf_text(file_bytes)

    # --------------------------------------------------------
    # DOCX
    # --------------------------------------------------------

    if lower_name.endswith(".docx"):

        return await extract_docx_text(file_bytes)

    # --------------------------------------------------------
    # DOC
    # --------------------------------------------------------

    if lower_name.endswith(".doc"):

        # Old .doc format is difficult to parse reliably
        # without additional libraries.
        #
        # Attempt UTF-8 decoding as a fallback.
        try:
            text = file_bytes.decode(
                "utf-8",
                errors="ignore"
            )

            return text.strip()

        except Exception:
            raise RuntimeError(
                "Unable to read DOC file."
            )

    raise RuntimeError(
        "Unsupported file format. "
        "Please upload PDF, DOCX, or DOC."
    )


# ============================================================
# SIMPLE RESUME ANALYSIS
# ============================================================

def analyze_resume_text(text: str):

    if not text:
        return {
            "skills": [],
            "sections": [],
            "word_count": 0,
            "character_count": 0,
            "summary": "No readable text was found in the resume.",
        }

    normalized = text.lower()

    # Common technical skills
    skill_list = [
        "python",
        "java",
        "javascript",
        "typescript",
        "react",
        "react.js",
        "node.js",
        "nodejs",
        "html",
        "css",
        "sql",
        "mysql",
        "postgresql",
        "mongodb",
        "fastapi",
        "flask",
        "django",
        "machine learning",
        "deep learning",
        "artificial intelligence",
        "ai",
        "data science",
        "data analysis",
        "pandas",
        "numpy",
        "scikit-learn",
        "tensorflow",
        "pytorch",
        "git",
        "github",
        "docker",
        "aws",
        "azure",
        "power bi",
        "tableau",
        "excel",
        "c",
        "c++",
        "kotlin",
        "android",
        "spring",
        "spring boot",
    ]

    detected_skills = []

    for skill in skill_list:

        if skill.lower() in normalized:
            detected_skills.append(skill)

    # Remove duplicates while preserving order
    detected_skills = list(
        dict.fromkeys(detected_skills)
    )

    # --------------------------------------------------------
    # Detect common resume sections
    # --------------------------------------------------------

    section_patterns = {
        "Education": [
            "education",
            "academic",
            "qualification",
        ],
        "Experience": [
            "experience",
            "work experience",
            "employment",
        ],
        "Projects": [
            "projects",
            "project experience",
        ],
        "Skills": [
            "skills",
            "technical skills",
        ],
        "Certifications": [
            "certification",
            "certifications",
        ],
        "Achievements": [
            "achievement",
            "achievements",
        ],
        "Internships": [
            "internship",
            "internships",
        ],
    }

    detected_sections = []

    for section, patterns in section_patterns.items():

        if any(
            pattern in normalized
            for pattern in patterns
        ):
            detected_sections.append(section)

    words = re.findall(
        r"\b[\w+#.-]+\b",
        text
    )

    return {
        "skills": detected_skills,
        "sections": detected_sections,
        "word_count": len(words),
        "character_count": len(text),
        "summary": (
            "Resume successfully extracted and analyzed."
        ),
    }


# ============================================================
# RESUME ANALYSIS ENDPOINT
# ============================================================

async def process_resume_upload(
    file: UploadFile
):

    if not file:
        raise HTTPException(
            status_code=400,
            detail="No resume file was provided."
        )

    filename = file.filename or "resume"

    allowed_extensions = (
        ".pdf",
        ".docx",
        ".doc",
    )

    if not filename.lower().endswith(
        allowed_extensions
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file format. "
                "Please upload PDF, DOCX, or DOC."
            )
        )

    try:

        file_bytes = await file.read()

        if not file_bytes:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty."
            )

        text = await extract_resume_text(
            filename,
            file_bytes
        )

        analysis = analyze_resume_text(text)

        return {
            "success": True,
            "filename": filename,
            "message": "Resume analyzed successfully.",
            "text": text,
            "extracted_text": text,
            "analysis": analysis,
            "skills": analysis["skills"],
            "sections": analysis["sections"],
            "word_count": analysis["word_count"],
        }

    except HTTPException:
        raise

    except Exception as exc:

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(exc),
                "message": "Unable to analyze the resume.",
            },
        )


# ============================================================
# MULTIPLE ENDPOINT ALIASES
# ============================================================

@app.post("/analyze-resume")
async def analyze_resume(
    file: UploadFile = File(...)
):
    return await process_resume_upload(file)


@app.post("/api/analyze-resume")
async def api_analyze_resume(
    file: UploadFile = File(...)
):
    return await process_resume_upload(file)


@app.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...)
):
    return await process_resume_upload(file)


@app.post("/api/upload-resume")
async def api_upload_resume(
    file: UploadFile = File(...)
):
    return await process_resume_upload(file)


@app.post("/resume/analyze")
async def resume_analyze(
    file: UploadFile = File(...)
):
    return await process_resume_upload(file)


@app.post("/api/resume/analyze")
async def api_resume_analyze(
    file: UploadFile = File(...)
):
    return await process_resume_upload(file)


# ============================================================
# OPTIONS / CORS DEBUG
# ============================================================

@app.get("/cors-test")
async def cors_test():
    return {
        "status": "ok",
        "message": "CORS test endpoint is working.",
        "allowed_origins": allowed_origins,
    }


# ============================================================
# ERROR HANDLER
# ============================================================

@app.exception_handler(404)
async def not_found_handler(request, exc):

    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "error": "Not Found",
            "path": str(request.url.path),
            "message": (
                "The requested API endpoint does not exist."
            ),
        },
    )


# ============================================================
# LOCAL DEVELOPMENT
# ============================================================

if __name__ == "__main__":

    import uvicorn

    port = int(
        os.getenv("PORT", "8000")
    )

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
    )