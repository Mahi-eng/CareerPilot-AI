import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
# PDF support check
try:
    import pypdf
    PDF_SUPPORT = True
    PDF_VERSION = getattr(pypdf, "__version__", "installed")
except ImportError:
    PDF_SUPPORT = False
    PDF_VERSION = None

# ============================================================
# CareerPilot AI - Backend
# ============================================================

app = FastAPI(
    title="CareerPilot AI",
    description="AI-powered career guidance and resume analysis API",
    version="2.0.0",
)


# ============================================================
# CORS
# ============================================================

# Production frontend + local development origins.
#
# We also allow all origins so that the Render frontend does not
# fail because its generated onrender.com URL changes.
#
# File upload APIs do not use cookies/authentication here, so
# allow_origins=["*"] is appropriate for this project.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Basic configuration
# ============================================================

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".doc",
}


# ============================================================
# Root / Health
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
# Utility functions
# ============================================================

def clean_text(text: str) -> str:
    """
    Clean extracted resume text.
    """
    if not text:
        return ""

    text = text.replace("\x00", " ")

    # Normalize line endings
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    # Remove excessive spaces
    text = re.sub(r"[ \t]+", " ", text)

    # Remove excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def validate_file(filename: Optional[str]) -> Path:
    """
    Validate uploaded filename and extension.
    """
    if not filename:
        raise HTTPException(
            status_code=400,
            detail="No file name was provided.",
        )

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file format. "
                "Please upload a PDF, DOCX, or DOC file."
            ),
        )

    return Path(filename)


async def save_upload_file(upload_file: UploadFile) -> Path:
    """
    Save uploaded file to a temporary directory while checking
    its size.
    """

    suffix = Path(upload_file.filename or "").suffix.lower()

    temp_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix,
    )

    temp_path = Path(temp_file.name)

    total_size = 0

    try:
        with temp_file:
            while True:
                chunk = await upload_file.read(1024 * 1024)

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="File is too large. Maximum size is 10 MB.",
                    )

                temp_file.write(chunk)

        return temp_path

    except Exception:
        try:
            temp_path.unlink(missing_ok=True)
        except Exception:
            pass

        raise


# ============================================================
# PDF extraction
# ============================================================

def extract_pdf_text(file_path: Path) -> str:
    """
    Extract text from a PDF using pypdf.

    pypdf is imported here rather than at application startup so
    that the health endpoint can still work even if the dependency
    is missing.
    """

    try:
        from pypdf import PdfReader
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail=(
                "PDF support is not installed on the backend. "
                "Please add 'pypdf' to backend/requirements.txt "
                "and redeploy the Render service."
            ),
        )

    try:
        reader = PdfReader(str(file_path))

        pages = []

        for page in reader.pages:
            try:
                page_text = page.extract_text() or ""
                pages.append(page_text)
            except Exception:
                continue

        return clean_text("\n\n".join(pages))

    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Unable to read PDF file: {str(exc)}",
        )


# ============================================================
# DOCX extraction
# ============================================================

def extract_docx_text(file_path: Path) -> str:
    """
    Extract text from a DOCX file using python-docx.
    """

    try:
        from docx import Document
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail=(
                "DOCX support is not installed. "
                "Please add 'python-docx' to backend/requirements.txt "
                "and redeploy."
            ),
        )

    try:
        document = Document(str(file_path))

        paragraphs = []

        for paragraph in document.paragraphs:
            text = paragraph.text.strip()

            if text:
                paragraphs.append(text)

        # Also extract table content.
        for table in document.tables:
            for row in table.rows:
                row_values = []

                for cell in row.cells:
                    value = cell.text.strip()

                    if value:
                        row_values.append(value)

                if row_values:
                    paragraphs.append(" | ".join(row_values))

        return clean_text("\n".join(paragraphs))

    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Unable to read DOCX file: {str(exc)}",
        )


# ============================================================
# DOC extraction
# ============================================================

def extract_doc_text(file_path: Path) -> str:
    """
    Extract text from legacy .DOC files.

    Attempts:
      1. antiword
      2. LibreOffice conversion to DOCX

    Legacy .doc files are not natively supported by python-docx.
    """

    # --------------------------------------------------------
    # Method 1: antiword
    # --------------------------------------------------------

    antiword_path = shutil.which("antiword")

    if antiword_path:
        try:
            result = subprocess.run(
                [antiword_path, str(file_path)],
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode == 0 and result.stdout.strip():
                return clean_text(result.stdout)

        except Exception:
            pass

    # --------------------------------------------------------
    # Method 2: LibreOffice
    # --------------------------------------------------------

    libreoffice = (
        shutil.which("libreoffice")
        or shutil.which("soffice")
    )

    if libreoffice:
        try:
            with tempfile.TemporaryDirectory() as temp_dir:

                subprocess.run(
                    [
                        libreoffice,
                        "--headless",
                        "--convert-to",
                        "docx",
                        "--outdir",
                        temp_dir,
                        str(file_path),
                    ],
                    capture_output=True,
                    text=True,
                    timeout=60,
                )

                converted_file = (
                    Path(temp_dir)
                    / f"{file_path.stem}.docx"
                )

                if converted_file.exists():
                    return extract_docx_text(converted_file)

        except Exception:
            pass

    raise HTTPException(
        status_code=422,
        detail=(
            "Legacy DOC files cannot be read on this server. "
            "Please save the resume as PDF or DOCX and upload it again."
        ),
    )


# ============================================================
# Resume text extraction
# ============================================================

def extract_resume_text(
    file_path: Path,
    extension: str,
) -> str:

    extension = extension.lower()

    if extension == ".pdf":
        return extract_pdf_text(file_path)

    if extension == ".docx":
        return extract_docx_text(file_path)

    if extension == ".doc":
        return extract_doc_text(file_path)

    raise HTTPException(
        status_code=400,
        detail="Unsupported resume format.",
    )


# ============================================================
# Resume analysis
# ============================================================

COMMON_SKILLS = [
    "python",
    "java",
    "javascript",
    "typescript",
    "c",
    "c++",
    "c#",
    "html",
    "css",
    "react",
    "react.js",
    "node.js",
    "node",
    "express",
    "fastapi",
    "flask",
    "django",
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "git",
    "github",
    "docker",
    "aws",
    "azure",
    "machine learning",
    "deep learning",
    "artificial intelligence",
    "ai",
    "data science",
    "data analysis",
    "pandas",
    "numpy",
    "tensorflow",
    "pytorch",
    "scikit-learn",
    "power bi",
    "tableau",
    "excel",
    "communication",
    "leadership",
    "problem solving",
    "teamwork",
]


def find_skills(text: str):
    """
    Find commonly mentioned skills in resume text.
    """

    lower_text = text.lower()

    found = []

    for skill in COMMON_SKILLS:

        if skill.lower() in lower_text:
            if skill not in found:
                found.append(skill)

    return found


def extract_email(text: str) -> Optional[str]:
    match = re.search(
        r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
        text,
    )

    return match.group(0) if match else None


def extract_phone(text: str) -> Optional[str]:
    match = re.search(
        r"(?:\+91[\s-]?)?[6-9]\d{9}",
        text,
    )

    return match.group(0) if match else None


def estimate_resume_score(
    text: str,
    skills: list,
) -> int:

    score = 0

    lower_text = text.lower()

    # Basic resume sections
    sections = [
        "education",
        "experience",
        "skills",
        "projects",
        "certification",
        "summary",
    ]

    for section in sections:
        if section in lower_text:
            score += 8

    # Skills
    score += min(len(skills) * 3, 30)

    # Contact information
    if extract_email(text):
        score += 5

    if extract_phone(text):
        score += 5

    # Reasonable resume length
    word_count = len(text.split())

    if word_count >= 150:
        score += 5

    if word_count >= 300:
        score += 5

    return min(score, 100)


def generate_suggestions(
    text: str,
    skills: list,
):
    lower_text = text.lower()

    suggestions = []

    if "summary" not in lower_text and "objective" not in lower_text:
        suggestions.append(
            "Add a concise professional summary or career objective."
        )

    if "project" not in lower_text:
        suggestions.append(
            "Add relevant academic or personal projects."
        )

    if "experience" not in lower_text and "internship" not in lower_text:
        suggestions.append(
            "Include internship, training, or practical experience."
        )

    if len(skills) < 5:
        suggestions.append(
            "Add more relevant technical and professional skills."
        )

    if "certification" not in lower_text and "certifications" not in lower_text:
        suggestions.append(
            "Consider adding relevant certifications."
        )

    if "github" not in lower_text:
        suggestions.append(
            "Add your GitHub profile if you have relevant projects."
        )

    if not suggestions:
        suggestions.append(
            "Your resume contains the major sections. "
            "Continue tailoring it for each target job."
        )

    return suggestions


def analyze_resume_text(text: str) -> Dict[str, Any]:

    text = clean_text(text)

    if not text:
        raise HTTPException(
            status_code=422,
            detail=(
                "No readable text was found in the resume. "
                "Please upload a text-based PDF or DOCX file."
            ),
        )

    skills = find_skills(text)

    score = estimate_resume_score(
        text,
        skills,
    )

    suggestions = generate_suggestions(
        text,
        skills,
    )

    return {
        "score": score,
        "skills": skills,
        "email": extract_email(text),
        "phone": extract_phone(text),
        "suggestions": suggestions,
        "word_count": len(text.split()),
        "text_preview": text[:3000],
    }


# ============================================================
# Main Resume Analysis Endpoint
# ============================================================

@app.post("/analyze-resume")
async def analyze_resume(
    file: UploadFile = File(...),
):
    """
    Analyze a PDF/DOCX/DOC resume.

    This endpoint is intentionally available at the root
    /analyze-resume path because the frontend can call it
    directly using the backend URL.
    """

    validate_file(file.filename)

    temp_path = None

    try:
        temp_path = await save_upload_file(file)

        extension = Path(
            file.filename or ""
        ).suffix.lower()

        text = extract_resume_text(
            temp_path,
            extension,
        )

        analysis = analyze_resume_text(text)

        return {
            "success": True,
            "filename": file.filename,
            "file_type": extension.replace(".", "").upper(),
            "analysis": analysis,
        }

    except HTTPException:
        raise

    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "detail": (
                    "An unexpected error occurred while "
                    f"analyzing the resume: {str(exc)}"
                ),
            },
        )

    finally:
        if temp_path:
            try:
                temp_path.unlink(missing_ok=True)
            except Exception:
                pass

        try:
            await file.close()
        except Exception:
            pass


# ============================================================
# API aliases
# ============================================================

@app.post("/api/analyze-resume")
async def api_analyze_resume(
    file: UploadFile = File(...),
):
    """
    API alias for /analyze-resume.
    """

    return await analyze_resume(file)


@app.post("/api/resume/analyze")
async def api_resume_analyze(
    file: UploadFile = File(...),
):
    """
    Second API alias for frontend compatibility.
    """

    return await analyze_resume(file)


@app.post("/resume/analyze")
async def resume_analyze(
    file: UploadFile = File(...),
):
    """
    Third API alias for frontend compatibility.
    """

    return await analyze_resume(file)


# ============================================================
# Simple Job Match endpoint
# ============================================================

@app.post("/job-match")
async def job_match(data: Dict[str, Any]):
    """
    Basic job matching endpoint.

    The frontend can send:

    {
        "skills": ["python", "sql"],
        "job_description": "Python developer with SQL..."
    }
    """

    skills = data.get("skills", [])
    job_description = data.get(
        "job_description",
        "",
    )

    if isinstance(skills, str):
        skills = [skills]

    job_text = str(job_description).lower()

    matched = []
    missing = []

    for skill in skills:
        skill_string = str(skill)

        if skill_string.lower() in job_text:
            matched.append(skill_string)
        else:
            missing.append(skill_string)

    total = len(skills)

    match_percentage = (
        round((len(matched) / total) * 100)
        if total
        else 0
    )

    return {
        "success": True,
        "matched_skills": matched,
        "missing_skills": missing,
        "match_percentage": match_percentage,
    }


@app.post("/api/job-match")
async def api_job_match(data: Dict[str, Any]):
    return await job_match(data)


# ============================================================
# Roadmap endpoint
# ============================================================

@app.post("/roadmap")
async def roadmap(data: Dict[str, Any]):
    """
    Generate a simple career roadmap based on a target role.
    """

    target_role = str(
        data.get(
            "target_role",
            "Software Developer",
        )
    )

    roadmap_data = {
        "target_role": target_role,
        "steps": [
            {
                "stage": 1,
                "title": "Build Fundamentals",
                "description": (
                    "Strengthen programming, data structures, "
                    "algorithms, and computer science fundamentals."
                ),
            },
            {
                "stage": 2,
                "title": "Develop Projects",
                "description": (
                    "Build practical projects related to "
                    f"{target_role}."
                ),
            },
            {
                "stage": 3,
                "title": "Improve Resume",
                "description": (
                    "Highlight projects, skills, internships, "
                    "certifications, and measurable achievements."
                ),
            },
            {
                "stage": 4,
                "title": "Prepare for Interviews",
                "description": (
                    "Practice technical interviews, aptitude, "
                    "communication, and behavioral questions."
                ),
            },
            {
                "stage": 5,
                "title": "Apply for Jobs",
                "description": (
                    "Apply to relevant internships and "
                    "full-time opportunities."
                ),
            },
        ],
    }

    return {
        "success": True,
        "roadmap": roadmap_data,
    }


@app.post("/api/roadmap")
async def api_roadmap(data: Dict[str, Any]):
    return await roadmap(data)


# ============================================================
# PDF support status
# ============================================================

@app.get("/pdf-support")
async def pdf_support():
    return {
        "pdf_support": PDF_SUPPORT,
        "pypdf_version": PDF_VERSION,
        "message": (
            "PDF support is available"
            if PDF_SUPPORT
            else "pypdf is not installed. Add pypdf to requirements.txt and redeploy."
        ),
    }


@app.get("/api/pdf-support")
async def api_pdf_support():
    return await pdf_support()


# ============================================================
# Startup
# ============================================================

@app.on_event("startup")
async def startup_event():

    print("=" * 60)
    print("🚀 CareerPilot AI backend starting...")
    print("=" * 60)
    print("Health: /health")
    print("Docs:   /docs")
    print("Resume: /analyze-resume")
    print(f"PDF support: {PDF_SUPPORT} (pypdf={PDF_VERSION})")
    print("=" * 60)


# ============================================================
# Local execution
# ============================================================

if __name__ == "__main__":
    import uvicorn

    port = int(
        os.environ.get(
            "PORT",
            "8000",
        )
    )

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
    )
