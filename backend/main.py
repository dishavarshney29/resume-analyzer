from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import PyPDF2
import spacy
import openai
import os
from dotenv import load_dotenv
from typing import List, Dict, Any
import re
import json
from pydantic import BaseModel
import io

load_dotenv()

app = FastAPI(title="Resume Analyzer API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load spaCy model (install with: python -m spacy download en_core_web_sm)
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Please install spaCy English model: python -m spacy download en_core_web_sm")
    nlp = None

# OpenAI configuration
openai.api_key = os.getenv("OPENAI_API_KEY")

# Pydantic models
class ResumeAnalysis(BaseModel):
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]
    score: int
    job_matches: List[Dict[str, Any]]
    skills_extracted: List[str]
    experience_years: int
    education_level: str

class JobRole(BaseModel):
    title: str
    match_percentage: int
    required_skills: List[str]
    missing_skills: List[str]

# Resume Parser Class
class ResumeParser:
    def __init__(self):
        self.skills_keywords = [
            "python", "java", "javascript", "react", "angular", "vue", "node.js",
            "sql", "mongodb", "postgresql", "docker", "kubernetes", "aws", "azure",
            "machine learning", "data science", "artificial intelligence", "html",
            "css", "git", "agile", "scrum", "project management", "leadership",
            "communication", "teamwork", "problem solving", "analytical thinking"
        ]
        
        self.job_roles_db = [
            {
                "title": "Frontend Developer",
                "required_skills": ["javascript", "react", "html", "css", "git"],
                "experience_range": "1-3 years"
            },
            {
                "title": "Backend Developer", 
                "required_skills": ["python", "java", "sql", "api", "database"],
                "experience_range": "2-5 years"
            },
            {
                "title": "Full Stack Developer",
                "required_skills": ["javascript", "react", "node.js", "sql", "git"],
                "experience_range": "2-4 years"
            },
            {
                "title": "Data Scientist",
                "required_skills": ["python", "machine learning", "sql", "data science"],
                "experience_range": "2-6 years"
            },
            {
                "title": "DevOps Engineer",
                "required_skills": ["docker", "kubernetes", "aws", "linux", "git"],
                "experience_range": "3-7 years"
            }
        ]

    def extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF file"""
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error parsing PDF: {str(e)}")

    def extract_skills(self, text: str) -> List[str]:
        """Extract skills from resume text"""
        text_lower = text.lower()
        found_skills = []
        
        for skill in self.skills_keywords:
            if skill.lower() in text_lower:
                found_skills.append(skill)
        
        # Use spaCy for additional entity recognition
        if nlp:
            doc = nlp(text)
            for ent in doc.ents:
                if ent.label_ in ["ORG", "PRODUCT"] and len(ent.text) > 2:
                    if ent.text.lower() not in [s.lower() for s in found_skills]:
                        found_skills.append(ent.text)
        
        return found_skills

    def extract_experience_years(self, text: str) -> int:
        """Extract years of experience from resume"""
        patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            r'experience\s*(?:of\s*)?(\d+)\+?\s*years?',
            r'(\d+)\+?\s*years?\s*in\s*\w+',
        ]
        
        years = []
        for pattern in patterns:
            matches = re.findall(pattern, text.lower())
            years.extend([int(match) for match in matches])
        
        return max(years) if years else 0

    def extract_education_level(self, text: str) -> str:
        """Extract education level from resume"""
        text_lower = text.lower()
        
        if any(degree in text_lower for degree in ['phd', 'ph.d', 'doctorate']):
            return "PhD"
        elif any(degree in text_lower for degree in ['master', 'msc', 'mba', 'ms']):
            return "Master's"
        elif any(degree in text_lower for degree in ['bachelor', 'bsc', 'ba', 'bs']):
            return "Bachelor's"
        elif any(cert in text_lower for cert in ['certificate', 'diploma']):
            return "Certificate/Diploma"
        else:
            return "Not specified"

    def calculate_job_matches(self, skills: List[str], experience: int) -> List[Dict[str, Any]]:
        """Calculate job role matches based on skills and experience"""
        matches = []
        
        for job in self.job_roles_db:
            required_skills = job["required_skills"]
            matched_skills = [skill for skill in skills if skill.lower() in [rs.lower() for rs in required_skills]]
            missing_skills = [skill for skill in required_skills if skill.lower() not in [s.lower() for s in skills]]
            
            match_percentage = int((len(matched_skills) / len(required_skills)) * 100)
            
            matches.append({
                "title": job["title"],
                "match_percentage": match_percentage,
                "required_skills": required_skills,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "experience_range": job["experience_range"]
            })
        
        return sorted(matches, key=lambda x: x["match_percentage"], reverse=True)

    async def analyze_with_ai(self, text: str, skills: List[str]) -> Dict[str, Any]:
        """Use OpenAI to analyze resume and provide insights"""
        if not openai.api_key:
            # Fallback analysis without OpenAI
            return {
                "strengths": ["Skills identified in resume", "Professional format"],
                "weaknesses": ["Could benefit from more specific achievements", "Consider adding metrics"],
                "suggestions": ["Add quantifiable achievements", "Include more technical skills", "Improve formatting"],
                "score": min(85, len(skills) * 10)
            }
        
        try:
            prompt = f"""
            Analyze this resume and provide feedback in JSON format with these keys:
            - strengths: list of 3-5 key strengths
            - weaknesses: list of 2-4 areas for improvement  
            - suggestions: list of 3-5 specific suggestions
            - score: overall score out of 100
            
            Resume text: {text[:2000]}...
            Skills found: {', '.join(skills)}
            
            Provide constructive, specific feedback.
            """
            
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.7
            )
            
            ai_analysis = json.loads(response.choices[0].message.content)
            return ai_analysis
            
        except Exception as e:
            print(f"OpenAI API error: {e}")
            # Fallback analysis
            return {
                "strengths": ["Professional experience evident", "Relevant skills present"],
                "weaknesses": ["Could add more achievements", "Missing some modern skills"],
                "suggestions": ["Add quantifiable results", "Include more technical skills"],
                "score": min(75, len(skills) * 8)
            }

# Initialize parser
parser = ResumeParser()

@app.get("/")
async def root():
    return {"message": "Resume Analyzer API is running!"}

@app.post("/analyze-resume", response_model=ResumeAnalysis)
async def analyze_resume(file: UploadFile = File(...)):
    """Analyze uploaded resume file"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Read file content
        content = await file.read()
        
        # Extract text from PDF
        text = parser.extract_text_from_pdf(content)
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
        # Extract information
        skills = parser.extract_skills(text)
        experience_years = parser.extract_experience_years(text)
        education_level = parser.extract_education_level(text)
        job_matches = parser.calculate_job_matches(skills, experience_years)
        
        # AI analysis
        ai_feedback = await parser.analyze_with_ai(text, skills)
        
        # Compile results
        analysis = ResumeAnalysis(
            strengths=ai_feedback.get("strengths", []),
            weaknesses=ai_feedback.get("weaknesses", []),
            suggestions=ai_feedback.get("suggestions", []),
            score=ai_feedback.get("score", 70),
            job_matches=job_matches[:5],  # Top 5 matches
            skills_extracted=skills,
            experience_years=experience_years,
            education_level=education_level
        )
        
        return analysis
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "spacy_loaded": nlp is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)