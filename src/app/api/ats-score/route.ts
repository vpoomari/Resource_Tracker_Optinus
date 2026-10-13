import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, logAudit } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";

// ATS Score Validator — uses z-ai-web-dev-sdk LLM (backend only) to score
// candidate CVs against a job description.
//
// Accepts multipart form data:
//   - jdText (string, optional)  : pasted JD text
//   - jdFile (File, optional)    : JD file (.txt / .pdf / .doc / .docx)
//   - cvIds[] (string, optional): IDs of resources already in DB to score
//   - cvFiles[] (File, optional): raw CV uploads to score
//
// Returns: { results: [{ candidateName, score, breakdown, recommendation, summary }] }

const MAX_JD_CHARS = 12000;
const MAX_CV_CHARS = 8000;
const MAX_CV_PER_REQUEST = 5;

interface CvInput {
  id: string;
  candidateName: string;
  content: string;
  fileName: string;
}

async function extractTextFromFile(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "").toLowerCase();

  if (ext === "txt") return buf.toString("utf-8").slice(0, MAX_CV_CHARS);

  // For PDF/DOC/DOCX we can't easily extract text without external libs,
  // so we'll do a best-effort extraction: try to strip non-printable chars
  // and rely on the binary being mostly text (works for many .doc files).
  const raw = buf.toString("utf-8").replace(/[^\x20-\x7E\n\r]/g, " ").replace(/\s+/g, " ").trim();
  return raw.slice(0, MAX_CV_CHARS);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const jdText = (form.get("jdText") as string) || "";
    const jdFile = form.get("jdFile") as File | null;
    const cvFileEntries = form.getAll("cvFiles") as File[];
    const cvIdEntries = form.getAll("cvIds") as string[];

    // Resolve JD
    let jdContent = jdText.trim();
    if (jdFile) {
      const fileText = await extractTextFromFile(jdFile);
      jdContent = (jdContent + "\n\n" + fileText).trim();
    }
    if (!jdContent) {
      return NextResponse.json({ error: "Provide JD text or upload a JD file" }, { status: 400 });
    }
    if (jdContent.length > MAX_JD_CHARS) jdContent = jdContent.slice(0, MAX_JD_CHARS);

    // Resolve CVs
    const cvs: CvInput[] = [];
    for (const f of cvFileEntries.slice(0, MAX_CV_PER_REQUEST)) {
      const content = await extractTextFromFile(f);
      if (content) cvs.push({ id: `file-${f.name}`, candidateName: f.name.replace(/\.[^.]+$/, ""), content, fileName: f.name });
    }
    if (cvIdEntries.length > 0) {
      // Lookup from DB
      const { db } = await import("@/lib/db");
      const resources = await db.resource.findMany({
        where: { id: { in: cvIdEntries.slice(0, MAX_CV_PER_REQUEST) } },
        select: { id: true, candidateName: true, primarySkill: true, secondarySkills: true, technology: true, totalExperience: true, currentDesignation: true, currentEmployer: true, certifications: true, education: true, domainExperience: true, remarks: true },
      });
      for (const r of resources) {
        const content = [
          `Name: ${r.candidateName}`,
          `Primary Skill: ${r.primarySkill || "N/A"}`,
          `Secondary Skills: ${r.secondarySkills || "N/A"}`,
          `Technology: ${r.technology || "N/A"}`,
          `Total Experience: ${r.totalExperience ?? "N/A"} years`,
          `Current Designation: ${r.currentDesignation || "N/A"}`,
          `Current Employer: ${r.currentEmployer || "N/A"}`,
          `Certifications: ${r.certifications || "N/A"}`,
          `Education: ${r.education || "N/A"}`,
          `Domain Experience: ${r.domainExperience || "N/A"}`,
          `Remarks: ${r.remarks || "N/A"}`,
        ].join("\n");
        cvs.push({ id: r.id, candidateName: r.candidateName, content: content.slice(0, MAX_CV_CHARS), fileName: `${r.candidateName}.txt` });
      }
    }

    if (cvs.length === 0) {
      return NextResponse.json({ error: "Provide at least one CV (file upload or resource ID)" }, { status: 400 });
    }

    // Use z-ai-web-dev-sdk LLM (server-side only)
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const systemPrompt = `You are an Applicant Tracking System (ATS) scoring engine. Your job is to evaluate how well a candidate's CV matches a job description (JD).

For each candidate, output ONLY a JSON object with EXACTLY this schema:
{
  "score": number,            // 0-100 integer match score
  "skillMatch": number,       // 0-100
  "experienceMatch": number,  // 0-100
  "educationMatch": number,   // 0-100
  "domainMatch": number,      // 0-100
  "matchedSkills": string[],  // skills found in both JD and CV
  "missingSkills": string[],  // important JD skills not in CV
  "strengths": string,        // 1-2 sentence summary of strengths
  "gaps": string,             // 1-2 sentence summary of gaps
  "recommendation": "Strong Match" | "Good Match" | "Partial Match" | "Weak Match" | "No Match"
}

Rules:
- Score > 80: Strong Match
- Score 65-80: Good Match
- Score 45-64: Partial Match
- Score 25-44: Weak Match
- Score < 25: No Match
- Be strict but fair. Don't give high scores for missing critical skills.
- Output ONLY the JSON, no other text, no markdown fences.`;

    const results: any[] = [];
    for (const cv of cvs) {
      try {
        const userPrompt = `JOB DESCRIPTION:\n${jdContent}\n\n---\n\nCANDIDATE CV:\nName: ${cv.candidateName}\n${cv.content}\n\nEvaluate this candidate against the JD and return the JSON.`;

        const completion = await zai.chat.completions.create({
          messages: [
            { role: "assistant", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          thinking: { type: "disabled" },
        });

        const raw = completion.choices[0]?.message?.content || "";
        // Extract JSON from response (handles both clean JSON and JSON inside markdown fences)
        let jsonMatch = raw.match(/\{[\s\S]*\}/);
        let parsed: any = null;
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]); } catch {}
        }
        if (!parsed) {
          results.push({
            candidateName: cv.candidateName,
            cvId: cv.id,
            fileName: cv.fileName,
            score: 0,
            skillMatch: 0,
            experienceMatch: 0,
            educationMatch: 0,
            domainMatch: 0,
            matchedSkills: [],
            missingSkills: [],
            strengths: "Unable to parse LLM response",
            gaps: raw.slice(0, 200),
            recommendation: "No Match",
            raw: raw.slice(0, 500),
          });
        } else {
          results.push({
            candidateName: cv.candidateName,
            cvId: cv.id,
            fileName: cv.fileName,
            ...parsed,
          });
        }
      } catch (e: any) {
        results.push({
          candidateName: cv.candidateName,
          cvId: cv.id,
          fileName: cv.fileName,
          score: 0,
          skillMatch: 0,
          experienceMatch: 0,
          educationMatch: 0,
          domainMatch: 0,
          matchedSkills: [],
          missingSkills: [],
          strengths: "LLM call failed",
          gaps: e.message,
          recommendation: "No Match",
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => (b.score || 0) - (a.score || 0));

    await logAudit({
      userId: user.id, userName: user.name,
      action: "ats.score", entityType: "ATS",
      entityName: `${cvs.length} CVs scored`,
      details: { jdLength: jdContent.length, cvCount: cvs.length },
    });

    return NextResponse.json({ results, jdSnippet: jdContent.slice(0, 200) + "..." });
  } catch (e: any) {
    console.error("ATS score error:", e);
    return NextResponse.json({ error: "ATS scoring failed: " + e.message }, { status: 500 });
  }
}
