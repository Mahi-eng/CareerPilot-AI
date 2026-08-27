import React, { useState } from "react";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

/* =========================================================
   MAIN APP
========================================================= */

function App() {
  const [page, setPage] = useState("dashboard");

  const [resumeSkills, setResumeSkills] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("resumeSkills")) || [];
    } catch {
      return [];
    }
  });

  const [resumeName, setResumeName] = useState(
    localStorage.getItem("resumeName") || ""
  );

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

  const saveSkills = (skills) => {
    const cleanSkills = Array.isArray(skills)
      ? skills
          .map((s) => String(s).toLowerCase().trim())
          .filter(Boolean)
      : [];

    setResumeSkills(cleanSkills);
    localStorage.setItem("resumeSkills", JSON.stringify(cleanSkills));
  };

  const saveJobResult = (result) => {
    setJobResult(result);
    localStorage.setItem("jobResult", JSON.stringify(result));
  };

  const saveRoadmap = (result) => {
    setRoadmap(result);
    localStorage.setItem("roadmap", JSON.stringify(result));
  };

  return (
    <div className="app">
      <Navbar page={page} setPage={setPage} />

      {page === "dashboard" && (
        <Dashboard
          resumeSkills={resumeSkills}
          jobResult={jobResult}
          roadmap={roadmap}
          setPage={setPage}
        />
      )}

      {page === "resume" && (
        <ResumePage
          resumeSkills={resumeSkills}
          resumeName={resumeName}
          setResumeName={setResumeName}
          saveSkills={saveSkills}
        />
      )}

      {page === "jobmatch" && (
        <JobMatchPage
          resumeSkills={resumeSkills}
          jobResult={jobResult}
          saveJobResult={saveJobResult}
          setPage={setPage}
        />
      )}

      {page === "roadmap" && (
        <RoadmapPage
          resumeSkills={resumeSkills}
          jobResult={jobResult}
          roadmap={roadmap}
          saveRoadmap={saveRoadmap}
          setPage={setPage}
        />
      )}
    </div>
  );
}

/* =========================================================
   NAVBAR
========================================================= */

function Navbar({ page, setPage }) {
  return (
    <header className="navbar">
      <div
        className="brand"
        onClick={() => setPage("dashboard")}
      >
        <div className="brand-logo">CP</div>

        <div className="brand-name">
          CareerPilot <span>AI</span>
        </div>
      </div>

      <nav className="nav-links">
        <button
          className={page === "dashboard" ? "active" : ""}
          onClick={() => setPage("dashboard")}
        >
          Dashboard
        </button>

        <button
          className={page === "resume" ? "active" : ""}
          onClick={() => setPage("resume")}
        >
          Resume
        </button>

        <button
          className={page === "jobmatch" ? "active" : ""}
          onClick={() => setPage("jobmatch")}
        >
          Job Match
        </button>

        <button
          className={page === "roadmap" ? "active" : ""}
          onClick={() => setPage("roadmap")}
        >
          Roadmap
        </button>
      </nav>
    </header>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  resumeSkills,
  jobResult,
  roadmap,
  setPage,
}) {
  const score = jobResult?.match_score ?? 0;

  const roadmapItems =
    roadmap?.roadmap ||
    roadmap?.items ||
    (Array.isArray(roadmap) ? roadmap : []);

  const savedProgress = (() => {
    try {
      return JSON.parse(localStorage.getItem("roadmapProgress")) || {};
    } catch {
      return {};
    }
  })();

  const completedRoadmapItems = roadmapItems.filter(
    (_, index) => savedProgress[index] === "completed"
  ).length;

  const roadmapProgress =
    roadmapItems.length > 0
      ? Math.round(
          (completedRoadmapItems / roadmapItems.length) * 100
        )
      : 0;

  return (
    <main className="page dashboard-page">

      <section className="hero-section">
        <div className="hero-content">
          <p className="eyebrow">
            AI-POWERED CAREER ASSISTANCE
          </p>

          <h1>
            Build your career
            <br />
            with <span>CareerPilot AI</span>
          </h1>

          <p className="hero-text">
            Upload your resume, discover your strengths,
            analyze job opportunities, and get a personalized
            learning roadmap.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-btn"
              onClick={() => setPage("resume")}
            >
              Analyze My Resume →
            </button>

            <button
              className="secondary-btn"
              onClick={() => setPage("jobmatch")}
            >
              Find Job Match
            </button>
          </div>
        </div>

        <div className="hero-card">
          <div className="hero-card-icon">✦</div>

          <h3>Your Career Copilot</h3>

          <p>
            AI-powered insights to help you identify skills,
            opportunities and learning priorities.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          number={resumeSkills.length}
          label="Skills Detected"
          icon="✓"
        />

        <StatCard
          number={`${score}%`}
          label="Job Match Score"
          icon="%"
        />

        <StatCard
          number={jobResult?.missing_skills?.length || 0}
          label="Skills to Learn"
          icon="!"
        />

        <StatCard
          number={`${completedRoadmapItems}/${roadmapItems.length || 0}`}
          label="Roadmap Completed"
          icon="→"
        />
      </section>

      {roadmapItems.length > 0 && (
        <section className="dashboard-progress-card">
          <div>
            <p className="eyebrow">LEARNING PROGRESS</p>

            <h2>
              {completedRoadmapItems} of{" "}
              {roadmapItems.length} completed
            </h2>

            <p>
              Keep learning and building your skills!
            </p>
          </div>

          <div className="dashboard-progress-circle">
            <strong>{roadmapProgress}%</strong>
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <div className="section-heading">
          <p className="eyebrow">YOUR CAREER JOURNEY</p>

          <h2>What would you like to do?</h2>
        </div>

        <div className="feature-grid">
          <FeatureCard
            icon="📄"
            title="Analyze Resume"
            description="Extract your technical and professional skills automatically."
            button="Upload Resume"
            onClick={() => setPage("resume")}
          />

          <FeatureCard
            icon="🎯"
            title="Match a Job"
            description="Compare your skills against a job description."
            button="Analyze Job"
            onClick={() => setPage("jobmatch")}
          />

          <FeatureCard
            icon="🗺️"
            title="Learning Roadmap"
            description="Get a personalized roadmap based on your career gaps."
            button="View Roadmap"
            onClick={() => setPage("roadmap")}
          />
        </div>
      </section>
    </main>
  );
}

function StatCard({ number, label, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>

      <div>
        <div className="stat-number">{number}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  button,
  onClick,
}) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>

      <h3>{title}</h3>

      <p>{description}</p>

      <button className="card-btn" onClick={onClick}>
        {button} →
      </button>
    </div>
  );
}

/* =========================================================
   RESUME PAGE
========================================================= */

function ResumePage({
  resumeSkills,
  resumeName,
  setResumeName,
  saveSkills,
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setResumeName(selectedFile.name);

    localStorage.setItem(
      "resumeName",
      selectedFile.name
    );

    setMessage("");
    setError("");
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please choose your resume first.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_BASE}/upload-resume`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Resume upload failed."
        );
      }

      const skills =
        data.skills ||
        data.extracted_skills ||
        data.resume_skills ||
        [];

      saveSkills(skills);

      setMessage(
        `Resume analyzed successfully. ${skills.length} skills detected.`
      );
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Could not analyze resume."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page resume-page">
      <section className="page-heading">
        <p className="eyebrow">RESUME ANALYSIS</p>

        <h1>Analyze your resume</h1>

        <p>
          Upload your resume and let CareerPilot AI extract
          your professional skills.
        </p>
      </section>

      <section className="resume-upload-card">
        <div className="upload-icon">📄</div>

        <h2>Upload your resume</h2>

        <p className="supported">
          Supported formats: PDF, DOC, DOCX
        </p>

        <label className="file-box">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
          />

          <span className="choose-btn">
            Choose File
          </span>

          <span className="file-text">
            {file ? file.name : "No file chosen"}
          </span>
        </label>

        {resumeName && (
          <p className="selected-file">
            Selected: <strong>{resumeName}</strong>
          </p>
        )}

        <button
          className="primary-btn upload-btn"
          onClick={handleUpload}
          disabled={loading}
        >
          {loading
            ? "Analyzing..."
            : "Upload & Analyze"}
        </button>

        {message && (
          <div className="success-message">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            ⚠ {error}
          </div>
        )}
      </section>

      <section className="skills-section">
        <div className="section-heading">
          <p className="eyebrow">
            AI EXTRACTED SKILLS
          </p>

          <h2>Resume Analysis</h2>
        </div>

        {resumeSkills.length > 0 ? (
          <div className="skills-container">
            {resumeSkills.map((skill, index) => (
              <span
                className="skill-pill"
                key={`${skill}-${index}`}
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            Upload your resume to see your detected skills.
          </div>
        )}
      </section>
    </main>
  );
}

/* =========================================================
   JOB MATCH PAGE
========================================================= */

function JobMatchPage({
  resumeSkills,
  jobResult,
  saveJobResult,
  setPage,
}) {
  const [jobDescription, setJobDescription] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyzeJob = async () => {
    if (!jobDescription.trim()) {
      setError("Please enter a job description.");
      return;
    }

    if (resumeSkills.length === 0) {
      setError(
        "Please upload and analyze your resume before matching a job."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/analyze-job`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resume_skills: resumeSkills,
            job_description: jobDescription,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Job analysis failed."
        );
      }

      saveJobResult(data);

      localStorage.setItem(
        "jobDescription",
        jobDescription
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message || "Could not analyze job."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page job-page">
      <section className="page-heading">
        <p className="eyebrow">JOB MATCH</p>

        <h1>Find your job match</h1>

        <p>
          Compare your resume skills with a job description.
        </p>
      </section>

      <section className="job-input-card">
        <h2>Job Description</h2>

        <textarea
          value={jobDescription}
          onChange={(e) => {
            setJobDescription(e.target.value);
            setError("");
          }}
          placeholder="Paste the job description here..."
        />

        <div className="job-action-row">
          <button
            className="primary-btn"
            onClick={analyzeJob}
            disabled={loading}
          >
            {loading
              ? "Analyzing..."
              : "Analyze Job →"}
          </button>
        </div>

        {error && (
          <div className="error-message">
            ⚠ {error}
          </div>
        )}
      </section>

      {jobResult && (
        <section className="job-result-section">
          <div className="match-score-card">
            <div className="score">
              {jobResult.match_score ?? 0}%
            </div>

            <p>Job Match Score</p>
          </div>

          <div className="result-grid">
            <SkillResultCard
              title="Matched Skills"
              icon="✓"
              skills={
                jobResult.matched_skills || []
              }
              type="matched"
            />

            <SkillResultCard
              title="Missing Skills"
              icon="⚠"
              skills={
                jobResult.missing_skills || []
              }
              type="missing"
            />
          </div>

          <div className="result-actions">
            <button
              className="primary-btn"
              onClick={() => setPage("roadmap")}
            >
              Build Learning Roadmap →
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function SkillResultCard({
  title,
  icon,
  skills,
  type,
}) {
  return (
    <div className={`result-card ${type}`}>
      <h2>
        {icon} {title}
      </h2>

      {skills.length > 0 ? (
        <div className="skills-container">
          {skills.map((skill, index) => (
            <span
              className="skill-pill"
              key={`${skill}-${index}`}
            >
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <p className="empty-result">
          No skills found.
        </p>
      )}
    </div>
  );
}

/* =========================================================
   ROADMAP PAGE
========================================================= */

function RoadmapPage({
  resumeSkills,
  jobResult,
  roadmap,
  saveRoadmap,
  setPage,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const missingSkills =
    jobResult?.missing_skills || [];

  const roadmapItems =
    roadmap?.roadmap ||
    roadmap?.items ||
    (Array.isArray(roadmap) ? roadmap : []);

  /* -------------------------------------------------------
     ROADMAP PROGRESS
  ------------------------------------------------------- */

  const [progress, setProgress] = useState(() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem("roadmapProgress")
        ) || {}
      );
    } catch {
      return {};
    }
  });

  const updateProgress = (index, status) => {
    const updatedProgress = {
      ...progress,
      [index]: status,
    };

    setProgress(updatedProgress);

    localStorage.setItem(
      "roadmapProgress",
      JSON.stringify(updatedProgress)
    );
  };

  const completedCount = roadmapItems.filter(
    (_, index) => progress[index] === "completed"
  ).length;

  const inProgressCount = roadmapItems.filter(
    (_, index) => progress[index] === "in-progress"
  ).length;

  const progressPercentage =
    roadmapItems.length > 0
      ? Math.round(
          (completedCount /
            roadmapItems.length) *
            100
        )
      : 0;

  const resetProgress = () => {
    setProgress({});

    localStorage.removeItem(
      "roadmapProgress"
    );
  };

  /* -------------------------------------------------------
     GENERATE ROADMAP
  ------------------------------------------------------- */

  const generateRoadmap = async () => {
    if (resumeSkills.length === 0) {
      setError(
        "Please analyze your resume first."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/learning-roadmap`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            skills: missingSkills.length
              ? missingSkills
              : resumeSkills,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Roadmap generation failed."
        );
      }

      saveRoadmap(data);

      setProgress({});
      localStorage.removeItem(
        "roadmapProgress"
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Could not generate learning roadmap."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page roadmap-page">

      <section className="page-heading">
        <p className="eyebrow">
          LEARNING ROADMAP
        </p>

        <h1>Your personalized roadmap</h1>

        <p>
          Build the skills you need to become
          job-ready.
        </p>
      </section>

      {/* =================================================
          START ROADMAP
      ================================================= */}

      {!roadmap && (
        <section className="roadmap-start-card">

          <div className="roadmap-icon">
            🗺️
          </div>

          <h2>
            Ready to improve your skills?
          </h2>

          <p>
            CareerPilot AI will create a learning
            roadmap based on the skills you are
            missing.
          </p>

          {missingSkills.length > 0 && (
            <div className="skills-container">
              {missingSkills.map(
                (skill, index) => (
                  <span
                    className="skill-pill"
                    key={`${skill}-${index}`}
                  >
                    {skill}
                  </span>
                )
              )}
            </div>
          )}

          <button
            className="primary-btn"
            onClick={generateRoadmap}
            disabled={loading}
          >
            {loading
              ? "Generating..."
              : "Generate My Roadmap →"}
          </button>

          {error && (
            <div className="error-message">
              ⚠ {error}
            </div>
          )}

        </section>
      )}

      {/* =================================================
          ROADMAP RESULTS
      ================================================= */}

      {roadmap && (
        <section className="roadmap-results">

          {/* PROGRESS HEADER */}

          <div className="progress-card">

            <div className="progress-header">

              <div>
                <p className="eyebrow">
                  YOUR PROGRESS
                </p>

                <h2>
                  {completedCount} of{" "}
                  {roadmapItems.length} completed
                </h2>

                <p className="progress-message">
                  {progressPercentage === 100
                    ? "🎉 Congratulations! You are job-ready!"
                    : progressPercentage > 0
                    ? "Keep going! You're making progress."
                    : "Start learning and building your skills!"}
                </p>
              </div>

              <div className="progress-percentage">
                {progressPercentage}%
              </div>

            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${progressPercentage}%`,
                }}
              />
            </div>

            <div className="progress-stats">
              <span>
                ✓ {completedCount} Completed
              </span>

              <span>
                ◉ {inProgressCount} In Progress
              </span>

              <span>
                ○{" "}
                {roadmapItems.length -
                  completedCount -
                  inProgressCount}{" "}
                Not Started
              </span>
            </div>

          </div>

          {/* RESET */}

          <div className="roadmap-toolbar">
            <h2>Your Learning Plan</h2>

            <button
              className="reset-btn"
              onClick={resetProgress}
            >
              Reset Progress
            </button>
          </div>

          {/* ROADMAP ITEMS */}

          {roadmapItems.length > 0 ? (
            roadmapItems.map(
              (item, index) => (
                <RoadmapItem
                  key={index}
                  index={index}
                  item={item}
                  status={
                    progress[index] ||
                    "not-started"
                  }
                  updateProgress={
                    updateProgress
                  }
                />
              )
            )
          ) : (
            <div className="roadmap-json">
              <pre>
                {JSON.stringify(
                  roadmap,
                  null,
                  2
                )}
              </pre>
            </div>
          )}

        </section>
      )}

      {/* =================================================
          BOTTOM ACTIONS
      ================================================= */}

      <div className="bottom-actions">

        <button
          className="secondary-btn"
          onClick={() =>
            setPage("jobmatch")
          }
        >
          ← Back to Job Match
        </button>

        <button
          className="primary-btn"
          onClick={() =>
            setPage("dashboard")
          }
        >
          Back to Dashboard
        </button>

      </div>

    </main>
  );
}

/* =========================================================
   ROADMAP ITEM
========================================================= */

function RoadmapItem({
  index,
  item,
  status,
  updateProgress,
}) {
  const title =
    typeof item === "string"
      ? item
      : item.title ||
        item.skill ||
        item.name ||
        `Learning Step ${index + 1}`;

  return (
    <div
      className={`roadmap-item ${status}`}
    >

      <div className="roadmap-number">
        {status === "completed"
          ? "✓"
          : index + 1}
      </div>

      <div className="roadmap-content">

        <div className="roadmap-title-row">

          <div>
            <h2>{title}</h2>

            <span
              className={`status-label ${status}`}
            >
              {status === "completed"
                ? "Completed"
                : status === "in-progress"
                ? "In Progress"
                : "Not Started"}
            </span>
          </div>

        </div>

        {typeof item !== "string" && (
          <>
            <div className="roadmap-tags">

              {item.level && (
                <span className="roadmap-tag">
                  Level: {item.level}
                </span>
              )}

              {item.duration && (
                <span className="roadmap-tag">
                  Duration: {item.duration}
                </span>
              )}

            </div>

            {item.description && (
              <p className="roadmap-description">
                {item.description}
              </p>
            )}

            {item.project && (
              <p className="roadmap-project">
                <strong>Project:</strong>{" "}
                {item.project}
              </p>
            )}

            {Array.isArray(
              item.topics
            ) &&
              item.topics.length > 0 && (
                <div className="topic-list">
                  {item.topics.map(
                    (topic, topicIndex) => (
                      <span
                        key={topicIndex}
                      >
                        {topic}
                      </span>
                    )
                  )}
                </div>
              )}
          </>
        )}

        {/* STATUS BUTTONS */}

        <div className="roadmap-status-buttons">

          <button
            className={
              status === "not-started"
                ? "status-btn selected"
                : "status-btn"
            }
            onClick={() =>
              updateProgress(
                index,
                "not-started"
              )
            }
          >
            ○ Not Started
          </button>

          <button
            className={
              status === "in-progress"
                ? "status-btn selected progress"
                : "status-btn"
            }
            onClick={() =>
              updateProgress(
                index,
                "in-progress"
              )
            }
          >
            ◉ In Progress
          </button>

          <button
            className={
              status === "completed"
                ? "status-btn selected complete"
                : "status-btn"
            }
            onClick={() =>
              updateProgress(
                index,
                "completed"
              )
            }
          >
            ✓ Mark Complete
          </button>

        </div>

      </div>
    </div>
  );
}

export default App;