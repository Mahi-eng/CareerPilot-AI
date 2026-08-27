# roadmap.py

LEARNING_ROADMAP = {

    "python": {
        "level": "Beginner",
        "duration": "1-2 weeks",
        "topics": [
            "Python fundamentals",
            "Variables and data types",
            "Functions",
            "Lists and dictionaries",
            "File handling",
            "Object-oriented programming"
        ],
        "project": "Build a Python Expense Tracker"
    },

    "sql": {
        "level": "Beginner",
        "duration": "1-2 weeks",
        "topics": [
            "SELECT queries",
            "WHERE and ORDER BY",
            "GROUP BY",
            "JOINs",
            "Subqueries",
            "Window functions"
        ],
        "project": "Build a Sales Analytics Database"
    },

    "machine learning": {
        "level": "Intermediate",
        "duration": "3-4 weeks",
        "topics": [
            "NumPy and Pandas",
            "Data preprocessing",
            "Feature engineering",
            "Linear regression",
            "Classification",
            "Model evaluation"
        ],
        "project": "Build a House Price Prediction Model"
    },

    "power bi": {
        "level": "Beginner",
        "duration": "1-2 weeks",
        "topics": [
            "Power BI interface",
            "Data importing",
            "Data cleaning",
            "Data modeling",
            "DAX basics",
            "Interactive dashboards"
        ],
        "project": "Build a Business Intelligence Dashboard"
    },

    "tableau": {
        "level": "Beginner",
        "duration": "1-2 weeks",
        "topics": [
            "Tableau interface",
            "Connecting datasets",
            "Charts and graphs",
            "Filters",
            "Calculated fields",
            "Interactive dashboards"
        ],
        "project": "Build a Sales Dashboard"
    },

    "javascript": {
        "level": "Beginner",
        "duration": "2-3 weeks",
        "topics": [
            "JavaScript fundamentals",
            "Arrays and objects",
            "Functions",
            "DOM manipulation",
            "ES6",
            "Async programming"
        ],
        "project": "Build an Interactive To-Do App"
    },

    "react": {
        "level": "Intermediate",
        "duration": "2-3 weeks",
        "topics": [
            "Components",
            "Props",
            "State",
            "Hooks",
            "API integration",
            "React routing"
        ],
        "project": "Build a Job Search Dashboard"
    },

    "java": {
        "level": "Beginner",
        "duration": "2-3 weeks",
        "topics": [
            "Java fundamentals",
            "Classes and objects",
            "Inheritance",
            "Collections",
            "Exception handling",
            "File handling"
        ],
        "project": "Build a Student Management System"
    }
}


def generate_roadmap(missing_skills):

    roadmap = []

    for skill in missing_skills:

        skill_name = skill.lower().strip()

        if skill_name in LEARNING_ROADMAP:

            data = LEARNING_ROADMAP[skill_name]

            roadmap.append({
                "skill": skill,
                "level": data["level"],
                "duration": data["duration"],
                "topics": data["topics"],
                "project": data["project"]
            })

        else:

            roadmap.append({
                "skill": skill,
                "level": "To be determined",
                "duration": "Depends on current knowledge",
                "topics": [
                    f"Learn {skill} fundamentals",
                    f"Practice {skill}",
                    f"Build a project using {skill}"
                ],
                "project": f"Build a practical {skill} project"
            })

    return roadmap