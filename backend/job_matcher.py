import re


def extract_job_skills(job_description: str, skills_list: list[str]):
    """
    Find skills mentioned in the job description.
    """

    job_text = job_description.lower()

    required_skills = []

    for skill in skills_list:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"

        if re.search(pattern, job_text):
            required_skills.append(skill)

    return sorted(required_skills)


def calculate_match(resume_skills: list[str], required_skills: list[str]):
    """
    Compare resume skills with job requirements.
    """

    resume_set = {
        skill.lower()
        for skill in resume_skills
    }

    required_set = {
        skill.lower()
        for skill in required_skills
    }

    if not required_set:
        return {
            "match_score": 0,
            "matched_skills": [],
            "missing_skills": []
        }

    matched = resume_set.intersection(required_set)
    missing = required_set - resume_set

    match_score = round(
        (len(matched) / len(required_set)) * 100
    )

    return {
        "match_score": match_score,
        "matched_skills": sorted(matched),
        "missing_skills": sorted(missing)
    }