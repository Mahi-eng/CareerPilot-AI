import React, { useEffect, useState } from "react";
import "./App.css";

/*
  ============================================================
  CAREERPILOT AI - FRONTEND
  Production backend:
  https://careerpilot-ai-hgew.onrender.com
  ============================================================
*/

// Use Vite environment variable if available.
// Otherwise use the deployed Render backend.
const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://careerpilot-ai-hgew.onrender.com"
).replace(/\/+$/, "");

function App() {
  const [activePage, setActivePage] = useState("home");

  const [backendStatus, setBackendStatus] = useState("checking");
  const [backendMessage, setBackendMessage] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [resumeSkills, setResumeSkills] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("resumeSkills")) || [];
    } catch {
      return [];
    }
  });

  const [jobDescription, setJobDescription] = useState("");

  const [jobResult, setJobResult] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("jobResult")) || null;
    } catch {
      return null;
    }
  });

  const [roadmap, setRoadmap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("roadmap")) || null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
    ------------------------------------------------------------
    Helper: convert different backend response formats into
    a clean skills array.
    ------------------------------------------------------------
  */
  const extractSkills = (data) => {
    if (!data) return [];

    let skills =
      data.skills ??
      data.extracted_skills ??
      data.resume_skills ??
      data.skill_list ??
      [];

    if (typeof skills === "string") {
      skills = skills
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (!Array.isArray(skills)) {
      return [];
    }

    return skills
      .map((skill) => {
        if (typeof skill === "string") return skill.trim();

        if (skill && typeof skill === "object") {
          return (
            skill.name ||
            skill.skill ||
            skill.title ||
            JSON.stringify(skill)
          );
        }

        return "";
      })
      .filter(Boolean);
  };

  /*
    ------------------------------------------------------------
    Helper: safely read backend response.
    ------------------------------------------------------------
  */
  const getResponseData = async (response) => {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return await response.json();
    }

    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      return {
        message: text,
      };
    }
  };

  /*
    ------------------------------------------------------------
    Backend connection test
    ------------------------------------------------------------
  */
  const checkBackend = async () => {
    setBackendStatus("checking");

    try {
      // First try /health because your backend exposes this.
      let response;

      try {
        response = await fetch(`${API_URL}/health`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });
      } catch {
        response = null;
      }

      // If /health isn't available, try root endpoint.
      if (!response || !response.ok) {
        response = await fetch(`${API_URL}/`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });
      }

      const data = await getResponseData(response);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            `Backend returned HTTP ${response.status}`
        );
      }

      setBackendStatus("connected");
      setBackendMessage(
        data?.message || "CareerPilot AI backend is connected."
      );
      setError("");
    } catch (err) {
      console.error("Backend connection error:", err);

      setBackendStatus("error");

      setBackendMessage(
        "Unable to connect to the CareerPilot AI backend."
      );
    }
  };

  /*
    ------------------------------------------------------------
    Check backend when application loads.
    ------------------------------------------------------------
  */
  useEffect(() => {
    checkBackend();
  }, []);

  /*
    ------------------------------------------------------------
    Save resume skills
    ------------------------------------------------------------
  */
  useEffect(() => {
    localStorage.setItem(
      "resumeSkills",
      JSON.stringify(resumeSkills)
    );
  }, [resumeSkills]);

  /*
    ------------------------------------------------------------
    Save job result
    ------------------------------------------------------------
  */
  useEffect(() => {
    if (jobResult) {
      localStorage.setItem(
        "jobResult",
        JSON.stringify(jobResult)
      );
    }
  }, [jobResult]);

  /*
    ------------------------------------------------------------
    Save roadmap
    ------------------------------------------------------------
  */
  useEffect(() => {
    if (roadmap) {
      localStorage.setItem(
        "roadmap",
        JSON.stringify(roadmap)
      );
    }
  }, [roadmap]);

  /*
    ------------------------------------------------------------
    File selection
    ------------------------------------------------------------
  */
  const handleFileChange = (event) => {
    setError("");
    setSuccess("");

    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedExtensions = [
      ".pdf",
      ".docx",
      ".doc",
    ];

    const fileName = file.name.toLowerCase();

    const isAllowed = allowedExtensions.some((extension) =>
      fileName.endsWith(extension)
    );

    if (!isAllowed) {
      setSelectedFile(null);
      setError(
        "Please select a PDF, DOCX, or DOC resume."
      );
      return;
    }

    setSelectedFile(file);
  };

  /*
    ------------------------------------------------------------
    Upload and analyze resume
    ------------------------------------------------------------
  */
  const handleResumeUpload = async () => {
    if (!selectedFile) {
      setError("Please choose your resume first.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();

      // IMPORTANT:
      // "file" should match FastAPI UploadFile parameter.
      formData.append("file", selectedFile);

      const response = await fetch(
        `${API_URL}/upload-resume`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await getResponseData(response);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            `Resume upload failed (HTTP ${response.status})`
        );
      }

      const skills = extractSkills(data);

      setResumeSkills(skills);

      setSuccess(
        skills.length > 0
          ? `Resume analyzed successfully. Found ${skills.length} skills.`
          : "Resume uploaded successfully."
      );

      // Keep the result available even if backend uses
      // a different response structure.
      if (data) {
        localStorage.setItem(
          "resumeAnalysis",
          JSON.stringify(data)
        );
      }
    } catch (err) {
      console.error("Resume upload error:", err);

      setError(
        err?.message ||
          "Unable to analyze the resume."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
    ------------------------------------------------------------
    Analyze job description
    ------------------------------------------------------------
  */
  const handleJobMatch = async () => {
    if (!resumeSkills.length) {
      setError(
        "Please analyze your resume before matching it with a job."
      );
      return;
    }

    if (!jobDescription.trim()) {
      setError(
        "Please enter a job description."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/analyze-job`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            resume_skills: resumeSkills,
            job_description: jobDescription,
          }),
        }
      );

      const data = await getResponseData(response);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            `Job analysis failed (HTTP ${response.status})`
        );
      }

      setJobResult(data);

      setSuccess(
        "Job match analysis completed successfully."
      );
    } catch (err) {
      console.error("Job match error:", err);

      setError(
        err?.message ||
          "Unable to analyze the job description."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
    ------------------------------------------------------------
    Generate learning roadmap
    ------------------------------------------------------------
  */
  const handleRoadmap = async () => {
    const missingSkills =
      jobResult?.missing_skills ||
      jobResult?.missingSkills ||
      jobResult?.gaps ||
      [];

    const skillsToLearn =
      Array.isArray(missingSkills) && missingSkills.length
        ? missingSkills
        : resumeSkills;

    if (!skillsToLearn.length) {
      setError(
        "Analyze your resume or job description first."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/learning-roadmap`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            skills: skillsToLearn,
          }),
        }
      );

      const data = await getResponseData(response);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            `Roadmap generation failed (HTTP ${response.status})`
        );
      }

      setRoadmap(data);

      setSuccess(
        "Personalized learning roadmap generated successfully."
      );
    } catch (err) {
      console.error("Roadmap error:", err);

      setError(
        err?.message ||
          "Unable to generate learning roadmap."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
    ------------------------------------------------------------
    Reset application
    ------------------------------------------------------------
  */
  const handleReset = () => {
    setSelectedFile(null);
    setResumeSkills([]);
    setJobDescription("");
    setJobResult(null);
    setRoadmap(null);
    setError("");
    setSuccess("");

    localStorage.removeItem("resumeSkills");
    localStorage.removeItem("jobResult");
    localStorage.removeItem("roadmap");
    localStorage.removeItem("resumeAnalysis");

    const fileInput =
      document.getElementById("resume-file");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  /*
    ------------------------------------------------------------
    Render backend status
    ------------------------------------------------------------
  */
  const BackendStatus = () => {
    if (backendStatus === "checking") {
      return (
        <div className="backend-status checking">
          <span>🟡</span>
          Checking backend connection...
        </div>
      );
    }

    if (backendStatus === "connected") {
      return (
        <div className="backend-status connected">
          <span>🟢</span>
          Backend Connected
        </div>
      );
    }

    return (
      <div className="backend-status disconnected">
        <span>🔴</span>
        Backend Disconnected
        <button
          type="button"
          onClick={checkBackend}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  };

  /*
    ------------------------------------------------------------
    HOME PAGE
    ------------------------------------------------------------
  */
  const HomePage = () => (
    <section className="page-section">
      <div className="hero">
        <div className="hero-badge">
          🚀 AI-Powered Career Assistant
        </div>

        <h1>
          Build Your Career
          <span> Smarter With AI</span>
        </h1>

        <p>
          Analyze your resume, compare your skills with job
          requirements, and generate a personalized learning
          roadmap.
        </p>

        <div className="hero-buttons">
          <button
            type="button"
            onClick={() => setActivePage("resume")}
            className="primary-button"
          >
            🚀 Analyze My Resume
          </button>

          <button
            type="button"
            onClick={() => setActivePage("job")}
            className="secondary-button"
          >
            🎯 Match a Job
          </button>
        </div>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-icon">📄</div>
          <h3>Resume Analysis</h3>
          <p>
            Upload your resume and automatically identify
            your technical and professional skills.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>Job Matching</h3>
          <p>
            Compare your skills with job requirements and
            discover your skill gaps.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🗺️</div>
          <h3>Learning Roadmap</h3>
          <p>
            Get a personalized roadmap to improve the skills
            you need for your target career.
          </p>
        </div>
      </div>
    </section>
  );

  /*
    ------------------------------------------------------------
    RESUME PAGE
    ------------------------------------------------------------
  */
  const ResumePage = () => (
    <section className="page-section">
      <div className="section-heading">
        <h1>Analyze Your Resume</h1>

        <p>
          Upload your PDF, DOCX, or DOC resume and let
          CareerPilot AI identify your skills.
        </p>
      </div>

      {error && (
        <div className="alert error-alert">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="alert success-alert">
          ✅ {success}
        </div>
      )}

      <div className="upload-card">
        <div className="document-icon">📄</div>

        <h2>Upload your resume</h2>

        <p className="supported-text">
          Supported formats: PDF, DOCX, DOC
        </p>

        <label
          htmlFor="resume-file"
          className="file-label"
        >
          Choose File
        </label>

        <input
          id="resume-file"
          type="file"
          accept=".pdf,.docx,.doc,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          hidden
        />

        <div className="selected-file">
          {selectedFile
            ? selectedFile.name
            : "No file selected"}
        </div>

        {selectedFile && (
          <p className="selected-text">
            Selected: <strong>{selectedFile.name}</strong>
          </p>
        )}

        <button
          type="button"
          onClick={handleResumeUpload}
          disabled={!selectedFile || loading}
          className="primary-button analyze-button"
        >
          {loading
            ? "⏳ Analyzing..."
            : "🚀 Upload & Analyze"}
        </button>

        {resumeSkills.length > 0 && (
          <div className="results-box">
            <h3>Extracted Skills</h3>

            <div className="skills-list">
              {resumeSkills.map((skill, index) => (
                <span
                  className="skill-tag"
                  key={`${skill}-${index}`}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );

  /*
    ------------------------------------------------------------
    JOB MATCH PAGE
    ------------------------------------------------------------
  */
  const JobPage = () => (
    <section className="page-section">
      <div className="section-heading">
        <h1>Job Match</h1>

        <p>
          Paste a job description and discover how well
          your resume matches it.
        </p>
      </div>

      {error && (
        <div className="alert error-alert">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="alert success-alert">
          ✅ {success}
        </div>
      )}

      <div className="content-card">
        <h2>Job Description</h2>

        <textarea
          value={jobDescription}
          onChange={(event) =>
            setJobDescription(event.target.value)
          }
          placeholder="Paste the complete job description here..."
          className="job-textarea"
          rows={12}
        />

        <button
          type="button"
          onClick={handleJobMatch}
          disabled={loading}
          className="primary-button"
        >
          {loading
            ? "⏳ Analyzing..."
            : "🎯 Analyze Job Match"}
        </button>

        {jobResult && (
          <div className="results-box">
            <h2>Job Match Result</h2>

            {jobResult.match_score !== undefined && (
              <div className="score">
                Match Score:{" "}
                <strong>
                  {jobResult.match_score}%
                </strong>
              </div>
            )}

            {jobResult.matchScore !== undefined && (
              <div className="score">
                Match Score:{" "}
                <strong>
                  {jobResult.matchScore}%
                </strong>
              </div>
            )}

            {jobResult.matched_skills && (
              <div>
                <h3>Matched Skills</h3>

                <div className="skills-list">
                  {jobResult.matched_skills.map(
                    (skill, index) => (
                      <span
                        className="skill-tag"
                        key={`${skill}-${index}`}
                      >
                        {skill}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {(jobResult.missing_skills ||
              jobResult.missingSkills) && (
              <div>
                <h3>Missing Skills</h3>

                <div className="skills-list">
                  {(
                    jobResult.missing_skills ||
                    jobResult.missingSkills ||
                    []
                  ).map((skill, index) => (
                    <span
                      className="skill-tag missing"
                      key={`${skill}-${index}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleRoadmap}
              disabled={loading}
              className="primary-button"
            >
              🗺️ Generate Learning Roadmap
            </button>
          </div>
        )}
      </div>
    </section>
  );

  /*
    ------------------------------------------------------------
    ROADMAP PAGE
    ------------------------------------------------------------
  */
  const RoadmapPage = () => (
    <section className="page-section">
      <div className="section-heading">
        <h1>Learning Roadmap</h1>

        <p>
          Follow your personalized roadmap to improve
          your career skills.
        </p>
      </div>

      {error && (
        <div className="alert error-alert">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="alert success-alert">
          ✅ {success}
        </div>
      )}

      {!roadmap ? (
        <div className="content-card empty-card">
          <div className="large-icon">🗺️</div>

          <h2>Your roadmap will appear here</h2>

          <p>
            Analyze your resume and match it with a job
            description first.
          </p>

          <button
            type="button"
            onClick={() => setActivePage("resume")}
            className="primary-button"
          >
            Analyze Resume
          </button>
        </div>
      ) : (
        <div className="roadmap-container">
          {Array.isArray(roadmap) ? (
            roadmap.map((item, index) => (
              <div
                className="roadmap-card"
                key={index}
              >
                <div className="roadmap-number">
                  {index + 1}
                </div>

                <div>
                  <h3>
                    {typeof item === "string"
                      ? item
                      : item.title ||
                        item.skill ||
                        `Learning Step ${index + 1}`}
                  </h3>

                  {typeof item === "object" && (
                    <p>
                      {item.description ||
                        item.details ||
                        item.content ||
                        ""}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="content-card">
              <pre className="roadmap-output">
                {JSON.stringify(
                  roadmap,
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      )}
    </section>
  );

  /*
    ------------------------------------------------------------
    MAIN RENDER
    ------------------------------------------------------------
  */
  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          🚀 CareerPilot AI
        </div>

        <nav className="nav-links">
          <button
            type="button"
            className={
              activePage === "home"
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() => setActivePage("home")}
          >
            Home
          </button>

          <button
            type="button"
            className={
              activePage === "resume"
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() => setActivePage("resume")}
          >
            Resume
          </button>

          <button
            type="button"
            className={
              activePage === "job"
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() => setActivePage("job")}
          >
            Job Match
          </button>

          <button
            type="button"
            className={
              activePage === "roadmap"
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() => setActivePage("roadmap")}
          >
            Roadmap
          </button>
        </nav>
      </header>

      <main>
        <div className="status-wrapper">
          <BackendStatus />
        </div>

        {activePage === "home" && <HomePage />}

        {activePage === "resume" && <ResumePage />}

        {activePage === "job" && <JobPage />}

        {activePage === "roadmap" && <RoadmapPage />}
      </main>

      <footer className="footer">
        <div>
          🚀 CareerPilot AI
        </div>

        <div>
          AI-powered career guidance
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="reset-button"
        >
          Reset
        </button>
      </footer>
    </div>
  );
}

export default App;