import React, { useState } from "react";
import {
  Upload,
  FileText,
  Brain,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Star,
  Target,
} from "lucide-react";

const ResumeAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Please select a PDF file");
        setFile(null);
      }
    }
  };

  const analyzeResume = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/analyze-resume", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setAnalysis(result);
    } catch (err) {
      setError("Failed to analyze resume. Please try again.");
      console.error("Analysis error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score) => {
    if (score >= 80) return "bg-green-100 border-green-300";
    if (score >= 60) return "bg-yellow-100 border-yellow-300";
    return "bg-red-100 border-red-300";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Brain className="h-10 w-10 text-indigo-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">
              AI Resume Analyzer
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            Get instant feedback on your resume with AI-powered analysis
          </p>
        </div>

        {/* File Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="mb-4">
              <label htmlFor="resume-upload" className="cursor-pointer">
                <span className="text-lg font-medium text-gray-700">
                  Choose your resume (PDF only)
                </span>
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            {file && (
              <div className="flex items-center justify-center mb-4">
                <FileText className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm text-gray-600">{file.name}</span>
              </div>
            )}
            <button
              onClick={analyzeResume}
              disabled={!file || loading}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Analyzing..." : "Analyze Resume"}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Overall Score */}
            <div
              className={`bg-white rounded-xl shadow-lg p-6 border-2 ${getScoreBg(
                analysis.score
              )}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Overall Score
                  </h2>
                  <p className="text-gray-600">Your resume analysis score</p>
                </div>
                <div className="text-center">
                  <div
                    className={`text-4xl font-bold ${getScoreColor(
                      analysis.score
                    )}`}
                  >
                    {analysis.score}/100
                  </div>
                  <div className="flex items-center mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.floor(analysis.score / 20)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Experience</h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {analysis.experience_years} years
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Skills Found
                    </h3>
                    <p className="text-2xl font-bold text-green-600">
                      {analysis.skills_extracted.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Education</h3>
                    <p className="text-lg font-bold text-purple-600">
                      {analysis.education_level}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Strengths and Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                  <h3 className="text-xl font-bold text-gray-900">Strengths</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start">
                      <div className="h-2 w-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center mb-4">
                  <AlertCircle className="h-6 w-6 text-orange-600 mr-2" />
                  <h3 className="text-xl font-bold text-gray-900">
                    Areas for Improvement
                  </h3>
                </div>
                <ul className="space-y-2">
                  {analysis.weaknesses.map((weakness, index) => (
                    <li key={index} className="flex items-start">
                      <div className="h-2 w-2 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-700">{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                💡 Suggestions for Improvement
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500"
                  >
                    <p className="text-gray-700">{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills Extracted */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                🛠️ Skills Identified
              </h3>
              <div className="flex flex-wrap gap-2">
                {analysis.skills_extracted.map((skill, index) => (
                  <span
                    key={index}
                    className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Job Matches */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                🎯 Recommended Job Roles
              </h3>
              <div className="space-y-4">
                {analysis.job_matches.slice(0, 3).map((job, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {job.title}
                      </h4>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          job.match_percentage >= 70
                            ? "bg-green-100 text-green-800"
                            : job.match_percentage >= 50
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {job.match_percentage}% match
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-700 mb-1">
                          Matched Skills:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {job.matched_skills.map((skill, i) => (
                            <span
                              key={i}
                              className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700 mb-1">
                          Missing Skills:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {job.missing_skills.slice(0, 3).map((skill, i) => (
                            <span
                              key={i}
                              className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeAnalyzer;
