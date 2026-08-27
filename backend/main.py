from pathlib import Path
from typing import List
import re
import io
import logging

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ============================================================
# CareerPilot AI - main.py
# Self-contained backend
#
# This version intentionally does NOT import:
#   resume_analyzer.py
#   job_matcher.py
#   roadmap.py
#
# The previous 500 errors were caused by those imports failing.
# The three features are implemented here so the API remains
# usable even if those helper files contain import/dependency
# problems.
# ============================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("careerpilot")

app = FastAPI(
    title="CareerPilot AI",
    description="AI-powered career and job recommendation system",
    version="1.0.0",
)

# Frontend origins. Keep localhost for development and add the
# deployed Render frontend for production/mobile access.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://careerpilot-ai-frontend-j86v.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# MODELS
# ============================================================

class JobAnalysisRequest(BaseModel):
    resume_skills: List[str] = Field(default_factory=list)
    job_description: str


class RoadmapRequest(BaseModel):
    missing_skills: List[str] = Field(default_factory=list)


# ============================================================
# SKILL DICTIONARY
# ============================================================

# Canonical skill -> aliases/phrases that can appear in text.
SKILL_ALIASES = {
    "python": ["python", "python3"],
    "java": ["java"],
    "javascript": ["javascript", "js", "ecmascript"],
    "typescript": ["typescript", "ts"],
    "c": [" c ", "c programming", "c language"],
    "c++": ["c++"],
    "c#": ["c#", "c sharp"],
    "sql": ["sql", "mysql", "postgresql", "postgres", "oracle sql"],
    "mysql": ["mysql"],
    "postgresql": ["postgresql", "postgres"],
    "html": ["html", "html5"],
    "css": ["css", "css3"],
    "react": ["react", "reactjs", "react.js"],
    "node.js": ["node.js", "nodejs", "node js"],
    "fastapi": ["fastapi"],
    "flask": ["flask"],
    "django": ["django"],
    "machine learning": [
        "machine learning",
        "machine-learning",
        "ml",
        "machine learning algorithms",
    ],
    "deep learning": ["deep learning", "deep-learning"],
    "artificial intelligence": ["artificial intelligence", "ai"],
    "generative ai": ["generative ai", "genai", "gen ai"],
    "nlp": ["nlp", "natural language processing"],
    "computer vision": ["computer vision", "opencv"],
    "opencv": ["opencv"],
    "tensorflow": ["tensorflow", "tensor flow"],
    "pytorch": ["pytorch", "py torch"],
    "pandas": ["pandas"],
    "numpy": ["numpy"],
    "scikit-learn": ["scikit-learn", "sklearn", "scikit learn"],
    "power bi": ["power bi", "powerbi"],
    "tableau": ["tableau"],
    "excel": ["excel", "microsoft excel", "ms excel"],
    "data analysis": ["data analysis", "data analytics", "data analyst"],
    "data visualization": ["data visualization", "data visualisation"],
    "statistics": ["statistics", "statistical analysis"],
    "git": ["git", "github", "gitlab"],
    "docker": ["docker"],
    "aws": ["aws", "amazon web services"],
    "azure": ["azure", "microsoft azure"],
    "gcp": ["gcp", "google cloud", "google cloud platform"],
    "rest api": ["rest api", "restful api", "rest apis"],
    "api": ["api", "apis", "application programming interface"],
    "mongodb": ["mongodb", "mongo db"],
    "sqlite": ["sqlite"],
    "linux": ["linux"],
    "agile": ["agile", "scrum"],
}


# Order matters only for presentation.
COMMON_SKILLS = [
    "python", "java", "javascript", "typescript", "c", "c++", "c#",
    "sql", "mysql", "postgresql", "html", "css", "react", "node.js",
    "fastapi", "flask", "django", "machine learning", "deep learning",
    "artificial intelligence", "generative ai", "nlp", "computer vision",
    "opencv", "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn",
    "power bi", "tableau", "excel", "data analysis", "data visualization",
    "statistics", "git", "docker", "aws", "azure", "gcp", "rest api",
    "api", "mongodb", "sqlite", "linux", "agile",
]


def _contains_skill(text: str, skill: str) -> bool:
    """Case-insensitive skill detection with reasonable word boundaries."""
    aliases = SKILL_ALIASES.get(skill, [skill])
    text_lower = f" {text.lower()} "

    for alias in aliases:
        alias = alias.lower().strip()

        # Single-letter C needs special handling.
        if alias == "c":
            if re.search(r"(?<![a-z0-9])c(?![a-z0-9+#])", text_lower):
                return True
            continue

        # Exact-ish phrase matching.
        if re.search(r"(?<![a-z0-9])" + re.escape(alias) + r"(?![a-z0-9])", text_lower):
            return True

    return False


def extract_skills(text: str) -> List[str]:
    """Extract known skills from resume/job text."""
    found = []
    for skill in COMMON_SKILLS:
        if _contains_skill(text, skill):
            found.append(skill)
    return found


# ============================================================
# RESUME TEXT EXTRACTION
# ============================================================

def extract_pdf_text(data: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PDF support requires pypdf. Run: pip install pypdf",
        )

    try:
        reader = PdfReader(io.BytesIO(data))
        pages = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        return "\n".join(pages)
    except Exception as exc:
        logger.exception("PDF extraction failed")
        raise HTTPException(
            status_code=400,
            detail=f"Could not read PDF: {exc}",
        )


def extract_docx_text(data: bytes) -> str:
    try:
        from docx import Document
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="DOCX support requires python-docx. Run: pip install python-docx",
        )

    try:
        document = Document(io.BytesIO(data))
        parts = [p.text for p in document.paragraphs]

        for table in document.tables:
            for row in table.rows:
                parts.append(" ".join(cell.text for cell in row.cells))

        return "\n".join(parts)
    except Exception as exc:
        logger.exception("DOCX extraction failed")
        raise HTTPException(
            status_code=400,
            detail=f"Could not read DOCX: {exc}",
        )


def extract_doc_text(data: bytes) -> str:
    """
    Old .doc files are binary OLE documents and cannot reliably be
    parsed with python-docx. We first try a lightweight text decode.
    If it is not readable, return a clear installation message.
    """
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            text = data.decode(encoding, errors="ignore")
            # Remove most binary/control noise.
            text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", text)
            if len(re.findall(r"[A-Za-z]{2,}", text)) >= 10:
                return text
        except Exception:
            pass

    raise HTTPException(
        status_code=400,
        detail=(
            "Old .doc files are not reliably readable by this backend. "
            "Please save the resume as PDF or DOCX and upload again."
        ),
    )


async def read_resume_file(file: UploadFile) -> str:
    filename = (file.filename or "").lower().strip()

    if not filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    allowed = (".pdf", ".docx", ".doc")
    if not filename.endswith(allowed):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload PDF, DOCX, or DOC.",
        )

    data = await file.read()

    if not data:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    if filename.endswith(".pdf"):
        return extract_pdf_text(data)

    if filename.endswith(".docx"):
        return extract_docx_text(data)

    return extract_doc_text(data)


# ============================================================
# ROUTES
# ============================================================

@app.get("/")
def home():
    return {
        "message": "CareerPilot AI backend is running",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "CareerPilot AI",
    }


@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """
    Frontend sends:
        FormData -> file

    Returns:
        {
            "filename": "...",
            "skills": [...],
            "text_preview": "..."
        }
    """
    text = await read_resume_file(file)

    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail=(
                "No readable text was found in the resume. "
                "If this is a scanned PDF, use a text-based PDF/DOCX."
            ),
        )

    skills = extract_skills(text)

    return {
        "filename": file.filename,
        "skills": skills,
        "text_preview": re.sub(r"\s+", " ", text).strip()[:1000],
        "message": "Resume uploaded and analyzed successfully.",
    }


@app.post("/analyze-job")
def analyze_job(request: JobAnalysisRequest):
    """
    Frontend sends:
        {
            "resume_skills": [...],
            "job_description": "..."
        }

    Returns:
        {
            "match_score": number,
            "matched_skills": [...],
            "missing_skills": [...]
        }
    """
    job_description = request.job_description.strip()

    if not job_description:
        raise HTTPException(
            status_code=400,
            detail="Job description cannot be empty.",
        )

    resume_skills = []
    for skill in request.resume_skills:
        normalized = str(skill).strip().lower()
        if normalized and normalized not in resume_skills:
            resume_skills.append(normalized)

    required_skills = extract_skills(job_description)

    # If no known skills are detected, return a useful response instead
    # of producing a misleading 0% score.
    if not required_skills:
        return {
            "match_score": 0,
            "matched_skills": [],
            "missing_skills": [],
            "required_skills": [],
            "message": (
                "No supported technical skills were detected in this job "
                "description. Add specific technologies/skills for analysis."
            ),
        }

    matched = []
    missing = []

    for required in required_skills:
        if required in resume_skills:
            matched.append(required)
        else:
            missing.append(required)

    score = round((len(matched) / len(required_skills)) * 100)

    return {
        "match_score": score,
        "matched_skills": matched,
        "missing_skills": missing,
        "required_skills": required_skills,
    }


# ============================================================
# LEARNING ROADMAP
# ============================================================

ROADMAP_DATA = {
    "python": {
        "level": "Beginner",
        "duration": "2-3 weeks",
        "topics": ["Syntax", "Functions", "OOP", "File handling", "Libraries"],
        "project": "Build a Resume Skill Analyzer",
    },
    "java": {
        "level": "Beginner",
        "duration": "3-4 weeks",
        "topics": ["Syntax", "OOP", "Collections", "Exception handling", "JDBC"],
        "project": "Build a Student Management System",
    },
    "sql": {
        "level": "Beginner",
        "duration": "1-2 weeks",
        "topics": ["SELECT", "JOINs", "GROUP BY", "Subqueries", "Window functions"],
        "project": "Build a Sales Analytics Database",
    },
    "mysql": {
        "level": "Beginner",
        "duration": "1-2 weeks",
        "topics": ["Tables", "Queries", "JOINs", "Indexes", "Database design"],
        "project": "Build a Career Data Management Database",
    },
    "excel": {
        "level": "Beginner",
        "duration": "1-2 weeks",
        "topics": ["Formulas", "Functions", "Pivot tables", "Charts", "Lookups"],
        "project": "Build an Employee Analytics Dashboard",
    },
    "power bi": {
        "level": "Beginner",
        "duration": "1-2 weeks",
        "topics": ["Power BI interface", "Data cleaning", "DAX basics", "Charts", "Dashboards"],
        "project": "Build a Business Intelligence Dashboard",
    },
    "tableau": {
        "level": "Beginner",
        "duration": "1-2 weeks",
        "topics": ["Tableau interface", "Connecting datasets", "Charts", "Filters", "Dashboards"],
        "project": "Build a Sales Dashboard",
    },
    "machine learning": {
        "level": "Intermediate",
        "duration": "3-4 weeks",
        "topics": ["Regression", "Classification", "Clustering", "Feature engineering", "Evaluation"],
        "project": "Build a Job Salary Prediction Model",
    },
    "deep learning": {
        "level": "Intermediate",
        "duration": "4-5 weeks",
        "topics": ["Neural networks", "CNNs", "Training", "Validation", "Transfer learning"],
        "project": "Build an Image Classification System",
    },
    "artificial intelligence": {
        "level": "Intermediate",
        "duration": "3-4 weeks",
        "topics": ["AI fundamentals", "Search", "Reasoning", "Machine learning", "AI applications"],
        "project": "Build an AI Career Recommendation System",
    },
    "generative ai": {
        "level": "Intermediate",
        "duration": "3-4 weeks",
        "topics": ["LLMs", "Prompt engineering", "Embeddings", "RAG", "Evaluation"],
        "project": "Build a Resume Q&A Assistant",
    },
    "nlp": {
        "level": "Intermediate",
        "duration": "3-4 weeks",
        "topics": ["Text preprocessing", "Embeddings", "Classification", "Transformers", "Evaluation"],
        "project": "Build a Job Description Classifier",
    },
    "javascript": {
        "level": "Beginner",
        "duration": "2-3 weeks",
        "topics": ["ES6", "Functions", "DOM", "Async/Await", "APIs"],
        "project": "Build an Interactive Career Dashboard",
    },
    "react": {
        "level": "Beginner",
        "duration": "2-3 weeks",
        "topics": ["Components", "Props", "State", "Hooks", "API integration"],
        "project": "Build a Job Matching Frontend",
    },
    "html": {
        "level": "Beginner",
        "duration": "1 week",
        "topics": ["Semantic HTML", "Forms", "Tables", "Accessibility", "Page structure"],
        "project": "Build a Personal Portfolio",
    },
    "css": {
        "level": "Beginner",
        "duration": "1-2 weeks",
        "topics": ["Selectors", "Flexbox", "Grid", "Responsive design", "Animations"],
        "project": "Build a Responsive Portfolio",
    },
    "git": {
        "level": "Beginner",
        "duration": "1 week",
        "topics": ["Commits", "Branches", "Merge", "Pull requests", "GitHub"],
        "project": "Publish CareerPilot AI on GitHub",
    },
    "docker": {
        "level": "Intermediate",
        "duration": "1-2 weeks",
        "topics": ["Images", "Containers", "Dockerfile", "Compose", "Volumes"],
        "project": "Containerize CareerPilot AI",
    },
    "aws": {
        "level": "Beginner",
        "duration": "2-3 weeks",
        "topics": ["EC2", "S3", "IAM", "Networking", "Deployment"],
        "project": "Deploy a FastAPI Application",
    },
    "opencv": {
        "level": "Intermediate",
        "duration": "2-3 weeks",
        "topics": ["Images", "Video", "Contours", "Object detection", "Preprocessing"],
        "project": "Build a Traffic Monitoring System",
    },
    "computer vision": {
        "level": "Intermediate",
        "duration": "3-4 weeks",
        "topics": ["Image processing", "Detection", "Classification", "YOLO", "Evaluation"],
        "project": "Build an Object Detection Application",
    },
}


def build_roadmap_item(skill: str) -> dict:
    skill_key = skill.strip().lower()

    if skill_key in ROADMAP_DATA:
        data = ROADMAP_DATA[skill_key].copy()
        data["skill"] = skill
        return data

    return {
        "skill": skill,
        "level": "Beginner",
        "duration": "1-2 weeks",
        "topics": [
            f"Introduction to {skill}",
            f"Core {skill} concepts",
            f"Practical exercises",
            f"Real-world applications",
            "Interview preparation",
        ],
        "project": f"Build a practical project using {skill}",
    }


@app.post("/learning-roadmap")
def learning_roadmap(request: RoadmapRequest):
    missing = []
    for skill in request.missing_skills:
        value = str(skill).strip()
        if value and value.lower() not in [x.lower() for x in missing]:
            missing.append(value)

    if not missing:
        raise HTTPException(
            status_code=400,
            detail="No missing skills supplied. Analyze a job first.",
        )

    return [build_roadmap_item(skill) for skill in missing]


# ============================================================
# RUN DIRECTLY
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
