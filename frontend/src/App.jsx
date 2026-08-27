import React, { useState } from "react";

/* ============================================================
   CAREERPILOT AI
   Frontend Application
   ============================================================ */

/*
 * IMPORTANT:
 * Production backend deployed on Render.
 *
 * Do NOT use localhost here for the deployed application.
 */
const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://careerpilot-ai-hgew.onrender.com";


function App() {
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

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  /* ============================================================
     API HELPER
     ============================================================ */

  const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: "application/json",
          ...(options.headers || {}),
        },
      });

      const contentType =
        response.headers.get("content-type") || "";

      let data;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const message =
          typeof data === "object"
            ? data.detail || data.message
            : data;

        throw new Error(
          message || `Request failed (${response.status})`
        );
      }

      return data;

    } catch (err) {
      console.error(
        `API request failed: ${url}`,
        err
      );

      if (
        err instanceof TypeError &&
        err.message.toLowerCase().includes("fetch")
      ) {
        throw new Error(
          "Unable to connect to the CareerPilot AI backend. " +
          "Please check that the backend is running and deployed."
        );
      }

      throw err;
    }
  };


  /* ============================================================
     RESUME UPLOAD
     ============================================================ */

  const handleResumeUpload = async () => {
    if (!resumeFile) {
      setError("Please select a resume first.");
      return;
    }

    setError("");
    setSuccess("");
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


  /* ============================================================
     JOB ANALYSIS
     ============================================================ */

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

    setError("");
    setSuccess("");
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


  /* ============================================================
     LEARNING ROADMAP
     ============================================================ */

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

    setError("");
    setSuccess("");
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


  /* ============================================================
     HEALTH CHECK
     ============================================================ */

  const testBackend = async () => {
    setError("");
    setSuccess("");

    try {
      const data =
        await apiRequest("/health");

      console.log(
        "Backend health:",
        data
      );

      setSuccess(
        "Backend connection is working."
      );

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Backend connection failed."
      );
    }
  };


  /* ============================================================
     RESET
     ============================================================ */

  const resetAnalysis = () => {
    setResumeFile(null);
    setResumeSkills([]);
    setResumeText("");
    setJobDescription("");
    setJobResult(null);
    setRoadmap([]);
    setError("");
    setSuccess("");
  };


  /* ============================================================
     NAVIGATION
     ============================================================ */

  const goTo = (page) => {
    setActivePage(page);
    setError("");
    setSuccess("");
  };


  /* ============================================================
     HOME
     ============================================================ */

  const renderHome = () => (
    <div className="page home-page">

      <div className="hero">

        <h1>
          CareerPilot AI
        </h1>

        <p>
          AI-powered career guidance,
          resume analysis and job matching.
        </p>

        <div className="hero-buttons">

          <button
            onClick={() => goTo("resume")}
          >
            Analyze Resume
          </button>

          <button
            onClick={() => goTo("job")}
          >
            Analyze Job
          </button>

        </div>

      </div>


      <div className="feature-grid">

        <div className="feature-card">
          <h3>📄 Resume Analysis</h3>
          <p>
            Upload your resume and
            automatically identify your skills.
          </p>
        </div>

        <div className="feature-card">
          <h3>🎯 Job Matching</h3>
          <p>
            Compare your skills with
            a target job description.
          </p>
        </div>

        <div className="feature-card">
          <h3>🗺️ Learning Roadmap</h3>
          <p>
            Discover missing skills and
            get a personalized learning path.
          </p>
        </div>

      </div>

    </div>
  );


  /* ============================================================
     RESUME PAGE
     ============================================================ */

  const renderResume = () => (
    <div className="page">

      <h2>
        Resume Analysis
      </h2>

      <p>
        Upload your PDF, DOCX or DOC resume.
      </p>

      <div className="card">

        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(event) => {
            setResumeFile(
              event.target.files?.[0] || null
            );

            setError("");
            setSuccess("");
          }}
        />

        {resumeFile && (
          <p>
            Selected:
            {" "}
            <strong>
              {resumeFile.name}
            </strong>
          </p>
        )}

        <button
          onClick={handleResumeUpload}
          disabled={
            resumeLoading ||
            !resumeFile
          }
        >
          {resumeLoading
            ? "Analyzing..."
            : "Upload & Analyze"}
        </button>

      </div>


      {resumeSkills.length > 0 && (
        <div className="card">

          <h3>
            Detected Skills
          </h3>

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

        </div>
      )}


      {resumeText && (
        <div className="card">

          <h3>
            Resume Preview
          </h3>

          <p>
            {resumeText}
          </p>

        </div>
      )}

    </div>
  );


  /* ============================================================
     JOB PAGE
     ============================================================ */

  const renderJob = () => (
    <div className="page">

      <h2>
        Job Match Analysis
      </h2>

      <div className="card">

        <label>
          Job Description
        </label>

        <textarea
          value={jobDescription}
          onChange={(event) =>
            setJobDescription(
              event.target.value
            )
          }
          placeholder="Paste the job description here..."
          rows={12}
        />

        <button
          onClick={handleJobAnalysis}
          disabled={
            jobLoading ||
            !jobDescription.trim()
          }
        >
          {jobLoading
            ? "Analyzing..."
            : "Analyze Job"}
        </button>

      </div>


      {jobResult && (
        <div className="card">

          <h3>
            Match Result
          </h3>

          <div className="match-score">

            <strong>
              {jobResult.match_score ?? 0}%
            </strong>

            <span>
              Match Score
            </span>

          </div>


          <h4>
            Matched Skills
          </h4>

          {jobResult.matched_skills?.length > 0 ? (

            <div className="skills">

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

          ) : (
            <p>
              No matching skills found.
            </p>
          )}


          <h4>
            Missing Skills
          </h4>

          {jobResult.missing_skills?.length > 0 ? (

            <div className="skills">

              {jobResult.missing_skills.map(
                (skill, index) => (
                  <span
                    className="missing-skill"
                    key={`${skill}-${index}`}
                  >
                    {skill}
                  </span>
                )
              )}

            </div>

          ) : (
            <p>
              Great! No major missing skills detected.
            </p>
          )}


          {jobResult.missing_skills?.length > 0 && (

            <button
              onClick={() => {
                goTo("roadmap");
                handleRoadmap();
              }}
              disabled={roadmapLoading}
            >
              {roadmapLoading
                ? "Generating..."
                : "Generate Learning Roadmap"}
            </button>

          )}

        </div>
      )}

    </div>
  );


  /* ============================================================
     ROADMAP PAGE
     ============================================================ */

  const renderRoadmap = () => (
    <div className="page">

      <h2>
        Learning Roadmap
      </h2>

      <div className="card">

        <button
          onClick={handleRoadmap}
          disabled={roadmapLoading}
        >
          {roadmapLoading
            ? "Generating Roadmap..."
            : "Generate Roadmap"}
        </button>

      </div>


      {roadmap.length > 0 && (

        <div className="roadmap-list">

          {roadmap.map(
            (item, index) => (

              <div
                className="roadmap-card"
                key={`${item.skill}-${index}`}
              >

                <h3>
                  {item.skill}
                </h3>

                <p>
                  <strong>
                    Level:
                  </strong>
                  {" "}
                  {item.level}
                </p>

                <p>
                  <strong>
                    Duration:
                  </strong>
                  {" "}
                  {item.duration}
                </p>


                <h4>
                  Topics
                </h4>

                <ul>
                  {item.topics?.map(
                    (topic, topicIndex) => (
                      <li
                        key={topicIndex}
                      >
                        {topic}
                      </li>
                    )
                  )}
                </ul>


                <h4>
                  Recommended Project
                </h4>

                <p>
                  {item.project}
                </p>

              </div>

            )
          )}

        </div>

      )}

    </div>
  );


  /* ============================================================
     MAIN RENDER
     ============================================================ */

  return (
    <div className="app">

      <header className="navbar">

        <div
          className="logo"
          onClick={() => goTo("home")}
        >
          CareerPilot AI
        </div>

        <nav>

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

      </header>


      <main>

        {error && (
          <div className="alert error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert success">
            {success}
          </div>
        )}


        {activePage === "home" &&
          renderHome()}

        {activePage === "resume" &&
          renderResume()}

        {activePage === "job" &&
          renderJob()}

        {activePage === "roadmap" &&
          renderRoadmap()}

      </main>


      <footer>

        <p>
          CareerPilot AI
        </p>

        <button
          onClick={testBackend}
        >
          Test Backend Connection
        </button>

        <button
          onClick={resetAnalysis}
        >
          Reset
        </button>

      </footer>

    </div>
  );
}


export default App;