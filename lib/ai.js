async function askAI(instructions, input, maxTokens = 700) {
  if (!process.env.OPENAI_API_KEY) return null;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4.1-mini", instructions, input, max_output_tokens: maxTokens }),
  });
  if (!response.ok) throw new Error("AI request failed");
  const data = await response.json();
  return data.output_text;
}

export async function analyzeResume({ skills = [], jobSkills = [], summary = "" }) {
  const candidateLower = skills.map((s) => s.toLowerCase());
  const matched = jobSkills.filter((s) => candidateLower.includes(s.toLowerCase()));
  const missing = jobSkills.filter((s) => !candidateLower.includes(s.toLowerCase()));
  const score = jobSkills.length
    ? Math.round((matched.length / jobSkills.length) * 100)
    : Math.max(35, Math.min(72, 55 + skills.length * 2));
  const fallback = {
    score,
    matchedSkills: matched,
    missingSkills: missing,
    feedback: [
      "Lead with a two-line impact-focused professional summary.",
      "Quantify outcomes in recent experience with scope, metrics, or scale.",
      missing.length ? `Add evidence of ${missing.slice(0, 3).join(", ")} where accurate.` : "Tailor the opening summary to the target role.",
    ],
    source: "rules",
  };
  const answer = await askAI(
    "You are a precise career coach. Return concise resume feedback as 2-3 sentences. Do not invent experience.",
    `Candidate skills: ${skills.join(", ")}. Target skills: ${jobSkills.join(", ")}. Summary: ${summary}`,
  );
  return { ...fallback, narrative: answer || "Your profile has a solid foundation. Focus the resume on the requirements that matter most for this role." };
}

export async function generateJobDescription({ title, experience, skills }) {
  const fallback = {
    summary: `We are looking for a ${title} who brings strong ownership and thoughtful collaboration to a growing team.`,
    responsibilities: [
      "Own high-quality delivery across the role's core responsibilities.",
      "Collaborate with product, design, and engineering partners.",
      "Use data and feedback to continuously improve outcomes.",
    ],
    qualifications: [
      `${experience || "Relevant"} experience in a similar role.`,
      `Hands-on experience with ${skills?.join(", ") || "relevant tools and practices"}.`,
      "Clear communication and a growth mindset.",
    ],
  };
  const answer = await askAI(
    "Write a concise inclusive job description. Return plain text with Summary, Responsibilities, Qualifications headings.",
    `Title: ${title}; experience: ${experience}; skills: ${(skills || []).join(", ")}`,
  );
  return { ...fallback, generatedText: answer };
}

export async function generateCoverLetter({ role, experience, skills }) {
  const fallback = `Dear Hiring Team,\n\nI'm excited to apply for the ${role} position. My ${experience || "relevant"} experience and strengths in ${(skills || []).join(", ") || "collaboration and delivery"} would let me contribute quickly while continuing to learn from your team.\n\nI'm especially drawn to the opportunity to build meaningful work with a high-performing, thoughtful team. I would welcome the chance to discuss how my experience can support your goals.\n\nSincerely,\n[Your name]`;
  const answer = await askAI(
    "Write a genuine, concise 3-paragraph cover letter. Never fabricate achievements. Use first person. Address it to 'Dear Hiring Team'.",
    `Target role: ${role}; candidate experience: ${experience}; skills: ${(skills || []).join(", ")}`,
    500,
  );
  return { coverLetter: answer || fallback };
}

async function extractResumeText(resumeBase64) {
  if (!resumeBase64) return "";
  // Strip the data URI prefix to get raw base64
  const base64 = resumeBase64.replace(/^data:[^;]+;base64,/, "");
  if (!process.env.OPENAI_API_KEY) {
    // Fallback: decode and strip PDF binary noise, keep printable ASCII runs ≥4 chars
    try {
      const raw = Buffer.from(base64, "base64").toString("latin1");
      const chunks = raw.match(/[\x20-\x7E]{4,}/g) || [];
      return chunks.join(" ").slice(0, 3000);
    } catch { return ""; }
  }
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: "Extract all readable text from this PDF resume. Return plain text only, no commentary.",
        input: [{ type: "input_file", filename: "resume.pdf", file_data: `data:application/pdf;base64,${base64}` }],
        max_output_tokens: 1500,
      }),
    });
    if (!response.ok) throw new Error();
    const data = await response.json();
    return data.output_text || "";
  } catch {
    try {
      const raw = Buffer.from(base64, "base64").toString("latin1");
      const chunks = raw.match(/[\x20-\x7E]{4,}/g) || [];
      return chunks.join(" ").slice(0, 3000);
    } catch { return ""; }
  }
}

export async function screenApplicant({ jobTitle, jobSkills = [], jobRequirements = [], candidateSkills = [], experience = [], answers = [], coverLetter = "", resumeBase64 = "" }) {
  const skillMatched = jobSkills.filter(s => candidateSkills.map(c => c.toLowerCase()).includes(s.toLowerCase()));
  const skillScore = jobSkills.length ? Math.round((skillMatched.length / jobSkills.length) * 100) : 50;

  const expYears = experience.reduce((sum, e) => {
    const match = (e.duration || "").match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  const fallbackScore = Math.min(100, Math.round(skillScore * 0.6 + Math.min(expYears * 5, 40) * 0.4));

  const resumeText = await extractResumeText(resumeBase64);
  const answersText = answers.map(a => `Q: ${a.question} A: ${a.answer}`).join("\n");
  const prompt = `Job: ${jobTitle}. Required skills: ${jobSkills.join(", ")}. Requirements: ${jobRequirements.join(", ")}.
Candidate skills: ${candidateSkills.join(", ")}. Experience: ${experience.map(e => `${e.role} at ${e.company} (${e.duration})`).join("; ")}.
Screening answers:\n${answersText || "None"}.
Cover letter excerpt: ${coverLetter.slice(0, 300) || "None"}.
Resume text:\n${resumeText.slice(0, 2000) || "Not provided"}.`;

  const answer = await askAI(
    `You are an ATS screening engine. Score this candidate 0-100 for the job. Reply with ONLY a JSON object: {"score": <number>, "verdict": "strong"|"good"|"weak", "reason": "<one sentence>"}`,
    prompt,
    120,
  );

  try {
    const parsed = JSON.parse(answer);
    if (typeof parsed.score === "number") return parsed;
  } catch {}

  return { score: fallbackScore, verdict: fallbackScore >= 70 ? "strong" : fallbackScore >= 45 ? "good" : "weak", reason: `Matched ${skillMatched.length} of ${jobSkills.length} required skills.` };
}

export async function resumeFeedback({ skills = [], summary = "", experience = "", targetRole = "" }) {
  const hasSummary = summary.trim().length > 20;
  const suggestions = [];
  if (!hasSummary) suggestions.push({ type: "weak_summary", tip: "Your summary is missing or too short. Write 2 sentences: who you are and the value you bring." });
  if (skills.length === 0) suggestions.push({ type: "missing_skills", tip: "Add a skills section listing your top 6–10 technical and soft skills." });
  else if (skills.length < 5) suggestions.push({ type: "missing_skills", tip: `You listed ${skills.length} skill(s). Aim for at least 8 to improve keyword matching.` });
  suggestions.push({ type: "formatting", tip: "Use bullet points for experience entries. Start each bullet with an action verb and include a measurable outcome." });
  suggestions.push({ type: "formatting", tip: "Keep your resume to one page if you have under 5 years of experience." });
  if (targetRole) suggestions.push({ type: "tailoring", tip: `Mirror keywords from ${targetRole} job descriptions in your summary and experience bullets.` });

  const answer = await askAI(
    "You are a senior recruiter. Give 3–5 specific, actionable resume improvement tips. Be direct. No generic advice.",
    `Candidate skills: ${skills.join(", ") || "none listed"}. Summary: ${summary || "none"}. Experience: ${experience || "none"}. Target role: ${targetRole || "general"}.`,
    400,
  );

  return {
    suggestions,
    aiTips: answer || null,
    score: Math.min(100, 40 + (hasSummary ? 20 : 0) + Math.min(30, skills.length * 3) + (targetRole ? 10 : 0)),
  };
}
