import React, { useEffect, useState } from "react";

/*
============================================================
 CareerPilot AI - App.jsx
 Production-ready frontend
============================================================

 Production backend:
 https://careerpilot-ai-hgew.onrender.com

 IMPORTANT:
 We intentionally use the production URL directly here.
 This prevents an old VITE_API_URL value from breaking
 the deployed frontend.
============================================================
*/

const API_BASE = "https://careerpilot-ai-hgew.onrender.com";


function App() {
  // =========================================================
  // STATE
  // =========================================================

  const [activePage, setActivePage] = useState("home");

  const [resumeFile, setResumeFile] = useState(null);
  const [resumeSkills, setResumeSkills] = useState([]);
  const [resumeText, setResumeText] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);

  const [jobDescription, setJobDescription] = useState("");
  const [jobResult, setJobResult] = useState(null);
  const [jobLoading, setJobLoading] = useState(false);

  const [roadmap, setRoadmap] = useState([]);
  const [roadmapLoading, setRoadmapLoading] = useState(false);

  const [backendStatus, setBackendStatus] = useState("checking");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  // =========================================================
  // CLEAR MESSAGES
  // =========================================================

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };


  // =========================================================
  // API HELPER
  // =========================================================

  const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE}${endpoint}`;

    try {
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 60000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(options.headers || {}),
        },
      });

      clearTimeout(timeout);

      const contentType =
        response.headers.get("content-type") || "";

      let data;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        let message = "";

        if (typeof data === "object" && data !== null) {
          message =
            data.detail ||
            data.message ||
            data.error ||
            "";
        } else {
          message = data;
        }

        throw new Error(
          message || `Request failed with status ${response.status}`
        );
      }

      return data;

    } catch (err) {
      console.error("CareerPilot API error:", url, err);

      if (err.name === "AbortError") {
        throw new Error(
          "The backend took too long to respond. " +
          "Render may be waking up. Please try again."
        );
      }

      if (
        err instanceof TypeError ||
        String(err.message).toLowerCase().includes("failed to fetch")
      ) {
        throw new Error(
          "Unable to connect to the CareerPilot AI backend. " +
          "Please check the backend URL and CORS configuration."
        );
      }

      throw err;
    }
  };


  // =========================================================
  // BACKEND HEALTH CHECK
  // =========================================================

  const testBackend = async (showMessage = true) => {
    if (showMessage) {
      clearMessages();
      setSuccess("Checking backend connection...");
    }

    setBackendStatus("checking");

    try {
      const data = await apiRequest("/health");

      console.log("CareerPilot backend:", data);

      setBackendStatus("connected");

      if (showMessage) {
        setSuccess(
          "Backend connection is working successfully."
        );
      }

      return true;

    } catch (err) {
      console.error(err);

      setBackendStatus("error");

      if (showMessage) {
        setError(
          err.message ||
          "Backend connection failed."
        );
      }

      return false;
    }
  };


  // =========================================================
  // CHECK BACKEND WHEN APP OPENS
  // =========================================================

  useEffect(() => {
    testBackend(false);
  }, []);


  // =========================================================
  // RESUME FILE SELECT
  // =========================================================

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    clearMessages();

    if (!file) {
      setResumeFile(null);
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];

    const extension = file.name
      .toLowerCase()
      .split(".")
      .pop();

    if (
      !allowedTypes.includes(file.type) &&
      !["pdf", "doc", "docx"].includes(extension)
    ) {
      setResumeFile(null);
      setError(
        "Please select a PDF, DOCX, or DOC resume."
      );
      return;
    }

    setResumeFile(file);
  };


  // =========================================================
  // RESUME UPLOAD
  // =========================================================

  const handleResumeUpload = async () => {
    if (!resumeFile) {
      setError("Please select a resume first.");
      return;
    }

    clearMessages();
    setResumeLoading(true);

    try {
      const formData = new FormData();

      formData.append("file", resumeFile);

      const data = await apiRequest(
        "/upload-resume",
        {
          method: "POST",
          body: formData,
        }
      );

      const skills = Array.isArray(data.skills)
        ? data.skills
        : [];

      setResumeSkills(skills);

      setResumeText(
        data.text_preview || ""
      );

      setSuccess(
        data.message ||
        "Resume uploaded and analyzed successfully."
      );

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Failed to analyze the resume."
      );

    } finally {
      setResumeLoading(false);
    }
  };


  // =========================================================
  // JOB ANALYSIS
  // =========================================================

  const handleJobAnalysis = async () => {
    if (!jobDescription.trim()) {
      setError(
        "Please enter a job description."
      );
      return;
    }

    if (resumeSkills.length === 0) {
      setError(
        "Please upload and analyze your resume first."
      );
      return;
    }

    clearMessages();
    setJobLoading(true);

    try {
      const data = await apiRequest(
        "/analyze-job",
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

      setJobResult(data);

      setSuccess(
        "Job analysis completed successfully."
      );

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Failed to analyze the job description."
      );

    } finally {
      setJobLoading(false);
    }
  };


  // =========================================================
  // LEARNING ROADMAP
  // =========================================================

  const handleRoadmap = async () => {
    if (
      !jobResult ||
      !Array.isArray(jobResult.missing_skills) ||
      jobResult.missing_skills.length === 0
    ) {
      setError(
        "Analyze a job first to generate a roadmap."
      );
      return;
    }

    clearMessages();
    setRoadmapLoading(true);

    try {
      const data = await apiRequest(
        "/learning-roadmap",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            missing_skills:
              jobResult.missing_skills,
          }),
        }
      );

      setRoadmap(
        Array.isArray(data)
          ? data
          : []
      );

      setActivePage("roadmap");

      setSuccess(
        "Learning roadmap generated successfully."
      );

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Failed to generate learning roadmap."
      );

    } finally {
      setRoadmapLoading(false);
    }
  };


  // =========================================================
  // NAVIGATION
  // =========================================================

  const goTo = (page) => {
    setActivePage(page);
    clearMessages();
  };


  // =========================================================
  // RESET
  // =========================================================

  const resetAnalysis = () => {
    setResumeFile(null);
    setResumeSkills([]);
    setResumeText("");

    setJobDescription("");
    setJobResult(null);

    setRoadmap([]);

    clearMessages();

    setActivePage("home");
  };


  // =========================================================
  // HOME PAGE
  // =========================================================

  const renderHome = () => (
    <section className="page">

      <div className="hero">

        <div className="hero-badge">
          ✨ AI-POWERED CAREER ASSISTANT
        </div>

        <h1>
          Build Your Career
          <br />
          With <span>CareerPilot AI</span>
        </h1>

        <p>
          Analyze your resume, match your skills with
          job requirements, and create a personalized
          learning roadmap.
        </p>

        <div className="hero-actions">

          <button
            className="primary-button"
            onClick={() => goTo("resume")}
          >
            📄 Analyze Resume
          </button>

          <button
            className="secondary-button"
            onClick={() => goTo("job")}
          >
            🎯 Job Match
          </button>

        </div>

      </div>


      <div className="feature-grid">

        <div className="feature-card">

          <div className="feature-icon">
            📄
          </div>

          <h3>
            Resume Analysis
          </h3>

          <p>
            Upload your resume and automatically
            identify your technical skills.
          </p>

        </div>


        <div className="feature-card">

          <div className="feature-icon">
            🎯
          </div>

          <h3>
            Job Matching
          </h3>

          <p>
            Compare your skills with a target
            job description and get a match score.
          </p>

        </div>


        <div className="feature-card">

          <div className="feature-icon">
            🗺️
          </div>

          <h3>
            Learning Roadmap
          </h3>

          <p>
            Find missing skills and get a
            personalized learning path.
          </p>

        </div>

      </div>

    </section>
  );


  // =========================================================
  // RESUME PAGE
  // =========================================================

  const renderResume = () => (
    <section className="page">

      <div className="section-header">

        <div className="eyebrow">
          RESUME ANALYSIS
        </div>

        <h1>
          Analyze Your Resume
        </h1>

        <p>
          Upload your PDF, DOCX, or DOC resume
          and let CareerPilot AI identify your skills.
        </p>

      </div>


      <div className="card upload-card">

        <div className="large-icon">
          📄
        </div>

        <h2>
          Upload your resume
        </h2>

        <p className="muted">
          Supported formats: PDF, DOCX, DOC
        </p>


        <label className="file-input">

          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
          />

          <span className="file-button">
            Choose File
          </span>

          <span className="file-name">
            {resumeFile
              ? resumeFile.name
              : "No file selected"}
          </span>

        </label>


        {resumeFile && (
          <div className="selected-file">
            Selected:
            {" "}
            <strong>
              {resumeFile.name}
            </strong>
          </div>
        )}


        <button
          className="primary-button full-width"
          onClick={handleResumeUpload}
          disabled={
            resumeLoading ||
            !resumeFile
          }
        >
          {resumeLoading
            ? "⏳ Analyzing Resume..."
            : "🚀 Upload & Analyze"}
        </button>

      </div>


      {resumeSkills.length > 0 && (

        <div className="card">

          <div className="card-title">
            <span>🧠</span>
            <h2>
              Detected Skills
            </h2>
          </div>

          <p className="muted">
            CareerPilot AI detected{" "}
            <strong>
              {resumeSkills.length}
            </strong>{" "}
            technical skills.
          </p>

          <div className="skills">

            {resumeSkills.map(
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


          <div className="action-row">

            <button
              className="primary-button"
              onClick={() => goTo("job")}
            >
              Continue to Job Match →
            </button>

          </div>

        </div>

      )}


      {resumeText && (

        <div className="card">

          <div className="card-title">

            <span>📝</span>

            <h2>
              Resume Preview
            </h2>

          </div>

          <div className="resume-preview">
            {resumeText}
          </div>

        </div>

      )}

    </section>
  );


  // =========================================================
  // JOB MATCH PAGE
  // =========================================================

  const renderJob = () => (
    <section className="page">

      <div className="section-header">

        <div className="eyebrow">
          JOB MATCHING
        </div>

        <h1>
          Match Your Resume With a Job
        </h1>

        <p>
          Paste a job description below to
          compare its requirements with your skills.
        </p>

      </div>


      {resumeSkills.length === 0 && (

        <div className="warning-box">

          ⚠️
          <div>

            <strong>
              Resume not analyzed yet
            </strong>

            <p>
              Please upload your resume before
              analyzing a job.
            </p>

            <button
              className="secondary-button"
              onClick={() => goTo("resume")}
            >
              Go to Resume Analysis
            </button>

          </div>

        </div>

      )}


      <div className="card">

        <label className="input-label">
          Job Description
        </label>

        <textarea
          value={jobDescription}
          onChange={(event) => {
            setJobDescription(
              event.target.value
            );
            clearMessages();
          }}
          placeholder={
            "Paste the complete job description here...\n\n" +
            "Example:\n" +
            "We are looking for a Python developer with " +
            "experience in FastAPI, SQL, React and Docker."
          }
          rows={14}
        />


        <button
          className="primary-button full-width"
          onClick={handleJobAnalysis}
          disabled={
            jobLoading ||
            !jobDescription.trim() ||
            resumeSkills.length === 0
          }
        >
          {jobLoading
            ? "⏳ Analyzing Job..."
            : "🎯 Analyze Job Match"}
        </button>

      </div>


      {jobResult && (

        <div className="card result-card">

          <div className="result-header">

            <div>

              <div className="eyebrow">
                ANALYSIS RESULT
              </div>

              <h2>
                Job Match Score
              </h2>

            </div>


            <div className="score-circle">

              <strong>
                {jobResult.match_score ?? 0}%
              </strong>

              <span>
                Match
              </span>

            </div>

          </div>


          <div className="score-bar">

            <div
              className="score-fill"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    Number(
                      jobResult.match_score || 0
                    )
                  )
                )}%`,
              }}
            />

          </div>


          <div className="result-section">

            <h3>
              ✅ Matched Skills
            </h3>

            {Array.isArray(
              jobResult.matched_skills
            ) &&
            jobResult.matched_skills.length > 0 ? (

              <div className="skills">

                {jobResult.matched_skills.map(
                  (skill, index) => (
                    <span
                      className="skill-tag matched"
                      key={`${skill}-${index}`}
                    >
                      ✓ {skill}
                    </span>
                  )
                )}

              </div>

            ) : (

              <p className="muted">
                No matching skills found.
              </p>

            )}

          </div>


          <div className="result-section">

            <h3>
              ⚠️ Missing Skills
            </h3>

            {Array.isArray(
              jobResult.missing_skills
            ) &&
            jobResult.missing_skills.length > 0 ? (

              <div className="skills">

                {jobResult.missing_skills.map(
                  (skill, index) => (
                    <span
                      className="skill-tag missing"
                      key={`${skill}-${index}`}
                    >
                      + {skill}
                    </span>
                  )
                )}

              </div>

            ) : (

              <p className="success-text">
                🎉 Great! No major missing
                skills were detected.
              </p>

            )}

          </div>


          {jobResult.message && (

            <div className="info-box">
              ℹ️ {jobResult.message}
            </div>

          )}


          {Array.isArray(
            jobResult.missing_skills
          ) &&
          jobResult.missing_skills.length > 0 && (

            <button
              className="primary-button full-width"
              onClick={handleRoadmap}
              disabled={roadmapLoading}
            >
              {roadmapLoading
                ? "⏳ Generating Roadmap..."
                : "🗺️ Generate Learning Roadmap"}
            </button>

          )}

        </div>

      )}

    </section>
  );


  // =========================================================
  // ROADMAP PAGE
  // =========================================================

  const renderRoadmap = () => (
    <section className="page">

      <div className="section-header">

        <div className="eyebrow">
          LEARNING ROADMAP
        </div>

        <h1>
          Your Personalized Roadmap
        </h1>

        <p>
          Learn the skills required to improve
          your job match.
        </p>

      </div>


      {!jobResult && (

        <div className="empty-card">

          <div className="large-icon">
            🗺️
          </div>

          <h2>
            No roadmap yet
          </h2>

          <p>
            Analyze a job first to identify
            your missing skills.
          </p>

          <button
            className="primary-button"
            onClick={() => goTo("job")}
          >
            Analyze a Job
          </button>

        </div>

      )}


      {jobResult &&
       (!Array.isArray(jobResult.missing_skills) ||
        jobResult.missing_skills.length === 0) && (

        <div className="empty-card">

          <div className="large-icon">
            🎉
          </div>

          <h2>
            Excellent!
          </h2>

          <p>
            No missing skills were detected,
            so a learning roadmap is not required.
          </p>

        </div>

      )}


      {jobResult &&
       Array.isArray(jobResult.missing_skills) &&
       jobResult.missing_skills.length > 0 &&
       roadmap.length === 0 && (

        <div className="card">

          <h2>
            Ready to Learn?
          </h2>

          <p className="muted">
            We found{" "}
            <strong>
              {jobResult.missing_skills.length}
            </strong>{" "}
            missing skills.
          </p>

          <button
            className="primary-button"
            onClick={handleRoadmap}
            disabled={roadmapLoading}
          >
            {roadmapLoading
              ? "⏳ Generating..."
              : "🗺️ Generate Roadmap"}
          </button>

        </div>

      )}


      {roadmap.length > 0 && (

        <div className="roadmap-list">

          {roadmap.map(
            (item, index) => (

              <div
                className="roadmap-card"
                key={`${item.skill}-${index}`}
              >

                <div className="roadmap-number">
                  {index + 1}
                </div>


                <div className="roadmap-content">

                  <div className="roadmap-top">

                    <h2>
                      {item.skill}
                    </h2>

                    <span className="level-badge">
                      {item.level}
                    </span>

                  </div>


                  <div className="duration">
                    ⏱️ Duration:{" "}
                    <strong>
                      {item.duration}
                    </strong>
                  </div>


                  <h3>
                    📚 Topics to Learn
                  </h3>

                  {Array.isArray(item.topics) && (

                    <ul className="topic-list">

                      {item.topics.map(
                        (topic, topicIndex) => (

                          <li
                            key={topicIndex}
                          >
                            {topic}
                          </li>

                        )
                      )}

                    </ul>

                  )}


                  <div className="project-box">

                    <strong>
                      💡 Recommended Project
                    </strong>

                    <p>
                      {item.project}
                    </p>

                  </div>

                </div>

              </div>

            )
          )}

        </div>

      )}

    </section>
  );


  // =========================================================
  // MAIN RENDER
  // =========================================================

  return (
    <div className="app">

      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background: #0b1020;
          color: #f8fafc;
        }

        button,
        input,
        textarea {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .app {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top left,
              rgba(99, 102, 241, 0.20),
              transparent 35%
            ),
            radial-gradient(
              circle at top right,
              rgba(168, 85, 247, 0.16),
              transparent 35%
            ),
            #0b1020;
        }

        .navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 6%;
          background: rgba(11, 16, 32, 0.90);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .logo {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
          cursor: pointer;
          white-space: nowrap;
        }

        .logo span {
          color: #a78bfa;
        }

        .nav {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .nav button {
          border: 0;
          background: transparent;
          color: #cbd5e1;
          padding: 10px 14px;
          border-radius: 10px;
          transition: 0.2s;
        }

        .nav button:hover {
          background: rgba(255,255,255,0.08);
          color: white;
        }

        main {
          min-height: calc(100vh - 150px);
        }

        .page {
          width: min(1100px, 92%);
          margin: 0 auto;
          padding: 70px 0;
        }

        .hero {
          text-align: center;
          padding: 80px 20px 65px;
        }

        .hero-badge,
        .eyebrow {
          display: inline-block;
          color: #a78bfa;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.5px;
          margin-bottom: 15px;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(42px, 7vw, 78px);
          line-height: 1.02;
          letter-spacing: -3px;
        }

        .hero h1 span {
          background: linear-gradient(
            90deg,
            #a78bfa,
            #60a5fa
          );
          -webkit-background-clip: text;
          color: transparent;
        }

        .hero p {
          max-width: 720px;
          margin: 25px auto;
          color: #94a3b8;
          font-size: 18px;
          line-height: 1.7;
        }

        .hero-actions,
        .action-row {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 28px;
        }

        .primary-button,
        .secondary-button {
          border-radius: 12px;
          padding: 13px 20px;
          font-weight: 700;
          border: 1px solid transparent;
          transition: 0.2s;
        }

        .primary-button {
          color: white;
          background: linear-gradient(
            135deg,
            #7c3aed,
            #4f46e5
          );
          box-shadow:
            0 10px 30px rgba(79,70,229,0.25);
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow:
            0 15px 35px rgba(79,70,229,0.35);
        }

        .secondary-button {
          color: #e2e8f0;
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.12);
        }

        .secondary-button:hover {
          background: rgba(255,255,255,0.10);
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .feature-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 20px;
        }

        .feature-card,
        .card,
        .empty-card,
        .roadmap-card {
          background: rgba(15,23,42,0.78);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          box-shadow:
            0 20px 50px rgba(0,0,0,0.18);
        }

        .feature-card {
          padding: 28px;
        }

        .feature-icon,
        .large-icon {
          font-size: 36px;
          margin-bottom: 16px;
        }

        .feature-card h3 {
          margin: 0 0 10px;
          font-size: 19px;
        }

        .feature-card p,
        .muted {
          color: #94a3b8;
          line-height: 1.65;
        }

        .section-header {
          margin-bottom: 30px;
        }

        .section-header h1 {
          margin: 0;
          font-size: clamp(32px, 5vw, 52px);
          letter-spacing: -1.5px;
        }

        .section-header p {
          color: #94a3b8;
          max-width: 680px;
          line-height: 1.7;
          font-size: 17px;
        }

        .card {
          padding: 30px;
          margin-bottom: 22px;
        }

        .upload-card {
          text-align: center;
        }

        .upload-card h2 {
          margin: 0 0 5px;
        }

        .file-input {
          display: flex;
          align-items: center;
          gap: 0;
          max-width: 700px;
          margin: 25px auto;
          border: 1px dashed rgba(167,139,250,0.5);
          border-radius: 12px;
          overflow: hidden;
          background: rgba(255,255,255,0.03);
        }

        .file-input input {
          display: none;
        }

        .file-button {
          background: #7c3aed;
          padding: 14px 18px;
          font-weight: 700;
          white-space: nowrap;
        }

        .file-name {
          padding: 14px;
          color: #cbd5e1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .selected-file {
          margin-bottom: 20px;
          color: #cbd5e1;
        }

        .full-width {
          width: 100%;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .card-title h2 {
          margin: 0;
        }

        .skills {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 18px;
        }

        .skill-tag {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(99,102,241,0.15);
          color: #c4b5fd;
          border: 1px solid rgba(129,140,248,0.22);
          font-size: 14px;
          font-weight: 600;
        }

        .skill-tag.matched {
          background: rgba(16,185,129,0.12);
          color: #6ee7b7;
          border-color: rgba(16,185,129,0.25);
        }

        .skill-tag.missing {
          background: rgba(245,158,11,0.12);
          color: #fcd34d;
          border-color: rgba(245,158,11,0.25);
        }

        .resume-preview {
          margin-top: 15px;
          padding: 18px;
          border-radius: 12px;
          background: rgba(0,0,0,0.2);
          color: #cbd5e1;
          line-height: 1.7;
          white-space: pre-wrap;
          max-height: 300px;
          overflow-y: auto;
        }

        .input-label {
          display: block;
          font-weight: 700;
          margin-bottom: 12px;
        }

        textarea {
          width: 100%;
          min-height: 280px;
          resize: vertical;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.22);
          color: white;
          outline: none;
          line-height: 1.6;
          margin-bottom: 18px;
        }

        textarea:focus {
          border-color: #818cf8;
          box-shadow:
            0 0 0 3px rgba(129,140,248,0.12);
        }

        .warning-box,
        .info-box {
          display: flex;
          gap: 15px;
          padding: 18px;
          border-radius: 14px;
          margin-bottom: 20px;
          background: rgba(245,158,11,0.08);
          border: 1px solid rgba(245,158,11,0.18);
          color: #fde68a;
        }

        .warning-box p {
          margin: 7px 0 14px;
          color: #cbd5e1;
        }

        .result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .result-header h2 {
          margin: 0;
        }

        .score-circle {
          min-width: 105px;
          height: 105px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(
              circle,
              rgba(124,58,237,0.2),
              rgba(79,70,229,0.05)
            );
          border: 2px solid rgba(167,139,250,0.4);
        }

        .score-circle strong {
          font-size: 26px;
        }

        .score-circle span {
          color: #94a3b8;
          font-size: 12px;
        }

        .score-bar {
          height: 10px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255,255,255,0.07);
          margin: 25px 0;
        }

        .score-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #7c3aed,
            #60a5fa
          );
          transition: width 0.6s ease;
        }

        .result-section {
          padding: 20px 0;
          border-top: 1px solid rgba(255,255,255,0.07);
        }

        .result-section h3 {
          margin-top: 0;
        }

        .success-text {
          color: #6ee7b7;
        }

        .info-box {
          background: rgba(59,130,246,0.08);
          border-color: rgba(59,130,246,0.18);
          color: #bfdbfe;
          margin-bottom: 20px;
        }

        .empty-card {
          padding: 60px 30px;
          text-align: center;
        }

        .empty-card p {
          color: #94a3b8;
          margin-bottom: 25px;
        }

        .roadmap-list {
          display: grid;
          gap: 20px;
        }

        .roadmap-card {
          display: flex;
          gap: 20px;
          padding: 25px;
        }

        .roadmap-number {
          flex-shrink: 0;
          width: 45px;
          height: 45px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            #7c3aed,
            #4f46e5
          );
          font-weight: 800;
        }

        .roadmap-content {
          flex: 1;
        }

        .roadmap-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .roadmap-top h2 {
          margin: 0;
          text-transform: capitalize;
        }

        .level-badge {
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(99,102,241,0.15);
          color: #c4b5fd;
          font-size: 13px;
          font-weight: 700;
        }

        .duration {
          margin: 12px 0 25px;
          color: #94a3b8;
        }

        .topic-list {
          padding-left: 20px;
          color: #cbd5e1;
          line-height: 1.9;
        }

        .project-box {
          margin-top: 20px;
          padding: 17px;
          border-radius: 12px;
          background: rgba(124,58,237,0.08);
          border: 1px solid rgba(124,58,237,0.16);
        }

        .project-box strong {
          color: #c4b5fd;
        }

        .project-box p {
          margin-bottom: 0;
          color: #cbd5e1;
        }

        .alert-container {
          position: fixed;
          top: 85px;
          right: 20px;
          z-index: 200;
          width: min(420px, calc(100% - 40px));
        }

        .alert {
          padding: 15px 18px;
          border-radius: 12px;
          margin-bottom: 10px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.3);
          line-height: 1.5;
        }

        .alert.error {
          background: #3b1118;
          border: 1px solid #7f1d1d;
          color: #fecaca;
        }

        .alert.success {
          background: #062e22;
          border: 1px solid #065f46;
          color: #a7f3d0;
        }

        footer {
          border-top: 1px solid rgba(255,255,255,0.07);
          padding: 25px 6%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          color: #64748b;
        }

        footer button {
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.04);
          color: #cbd5e1;
          padding: 8px 12px;
          border-radius: 8px;
        }

        .backend-status {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          margin-left: auto;
        }

        .status-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          display: inline-block;
        }

        .status-connected {
          background: #10b981;
          box-shadow: 0 0 10px #10b981;
        }

        .status-error {
          background: #ef4444;
        }

        .status-checking {
          background: #f59e0b;
        }

        @media (max-width: 800px) {

          .navbar {
            padding: 15px 4%;
            align-items: flex-start;
            flex-direction: column;
          }

          .nav {
            width: 100%;
            justify-content: flex-start;
          }

          .backend-status {
            margin-left: 0;
          }

          .feature-grid {
            grid-template-columns: 1fr;
          }

          .hero {
            padding-top: 50px;
          }

          .hero h1 {
            letter-spacing: -2px;
          }

          .file-input {
            flex-direction: column;
            align-items: stretch;
          }

          .file-button {
            text-align: center;
          }

          .file-name {
            text-align: center;
          }

          .result-header,
          .roadmap-top {
            flex-direction: column;
            align-items: flex-start;
          }

          .roadmap-card {
            flex-direction: column;
          }

        }

        @media (max-width: 500px) {

          .page {
            width: 94%;
            padding: 45px 0;
          }

          .card {
            padding: 20px;
          }

          .hero {
            padding-left: 5px;
            padding-right: 5px;
          }

          .hero-actions {
            flex-direction: column;
          }

          .hero-actions button {
            width: 100%;
          }

          .nav {
            overflow-x: auto;
          }

        }
      `}</style>


      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="navbar">

        <div
          className="logo"
          onClick={() => goTo("home")}
        >
          🚀 CareerPilot AI
        </div>


        <nav className="nav">

          <button
            onClick={() => goTo("home")}
          >
            Home
          </button>

          <button
            onClick={() => goTo("resume")}
          >
            Resume
          </button>

          <button
            onClick={() => goTo("job")}
          >
            Job Match
          </button>

          <button
            onClick={() => goTo("roadmap")}
          >
            Roadmap
          </button>

        </nav>


        <div className="backend-status">

          <span
            className={
              backendStatus === "connected"
                ? "status-dot status-connected"
                : backendStatus === "error"
                ? "status-dot status-error"
                : "status-dot status-checking"
            }
          />

          {backendStatus === "connected"
            ? "Backend Connected"
            : backendStatus === "error"
            ? "Backend Offline"
            : "Checking Backend..."}

        </div>

      </header>


      {/* =====================================================
          ALERTS
      ===================================================== */}

      {(error || success) && (

        <div className="alert-container">

          {error && (
            <div className="alert error">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="alert success">
              ✓ {success}
            </div>
          )}

        </div>

      )}


      {/* =====================================================
          PAGES
      ===================================================== */}

      <main>

        {activePage === "home" &&
          renderHome()}

        {activePage === "resume" &&
          renderResume()}

        {activePage === "job" &&
          renderJob()}

        {activePage === "roadmap" &&
          renderRoadmap()}

      </main>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer>

        <span>
          © CareerPilot AI
        </span>

        <button
          onClick={() => testBackend(true)}
        >
          🔌 Test Backend
        </button>

        <button
          onClick={resetAnalysis}
        >
          ↻ Reset
        </button>

      </footer>

    </div>
  );
}


export default App;