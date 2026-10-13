import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, canWriteResource } from "@/lib/auth";

// Smart parse + resume auto-extract endpoint.
//
// Accepts a single resume file (PDF/DOC/DOCX/TXT) and uses the LLM to
// extract a structured candidate profile, ready to be reviewed + committed.
//
// Returns: { candidateName, email, phone, location, primarySkill,
//            secondarySkills, technology, totalExperience, relevantExperience,
//            currentEmployer, currentDesignation, noticePeriod, expectedRate,
//            currency, employmentType, resourceType, certifications, education,
//            domainExperience, remarks, rawText }
//
// The frontend then collects all extracted candidates and calls /commit to
// actually create them with the original CV file attached.

const MAX_CV_CHARS = 10000;

// Best-effort text extraction from various file formats.
// For .txt files this is exact. For .pdf/.doc/.docx we strip binary noise —
// the LLM is forgiving and can still extract structured data from the
// readable text fragments.
async function extractText(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "").toLowerCase();

  if (ext === "txt") {
    return buf.toString("utf-8").slice(0, MAX_CV_CHARS);
  }

  if (ext === "pdf") {
    // PDFs have text streams in parentheses (format: (text) Tj)
    // Extract printable text from content streams
    const text = buf.toString("latin1");
    const extracted: string[] = [];
    // Match text in parentheses inside BT...ET blocks
    const re = /\(([^()]{1,200})\)\s*(?:Tj|TJ|Td|TD)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[1].trim() && /[a-zA-Z]/.test(m[1])) extracted.push(m[1]);
    }
    // Also extract from BT...ET multiline text arrays
    const re2 = /\[([^\]]+)\]\s*TJ/g;
    while ((m = re2.exec(text)) !== null) {
      const parts = m[1].match(/\(([^()]+)\)/g);
      if (parts) {
        const line = parts.map(p => p.slice(1, -1)).join("");
        if (line.trim() && /[a-zA-Z]/.test(line)) extracted.push(line);
      }
    }
    let result = extracted.join("\n");
    // Fallback: if extraction failed, use binary-to-text with stripping
    if (result.length < 50) {
      result = buf.toString("utf-8")
        .replace(/[^\x20-\x7E\n\r]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
    return result.slice(0, MAX_CV_CHARS);
  }

  if (ext === "doc" || ext === "docx") {
    // DOC/DOCX are binary (OLE/ZIP containers). Best-effort extraction: strip
    // non-printable chars, keep runs of readable text.
    const text = buf.toString("utf-8")
      .replace(/[^\x20-\x7E\n\r]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, MAX_CV_CHARS);
  }

  // Unknown format — try plain text
  return buf.toString("utf-8").slice(0, MAX_CV_CHARS);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteResource(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["pdf", "doc", "docx", "txt"].includes(ext)) {
      return NextResponse.json({ error: `Unsupported file type: .${ext}. Supported: PDF, DOC, DOCX, TXT` }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Extract text from the file
    const text = await extractText(file);
    if (!text || text.length < 20) {
      return NextResponse.json({
        error: "Could not extract enough text from this file. Try a different file or paste the resume text manually.",
      }, { status: 422 });
    }

    // Call the LLM to extract structured candidate info
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const systemPrompt = `You are an expert resume parser. Extract structured candidate information from the resume text provided.

Output ONLY a JSON object with EXACTLY this schema (omit fields you can't reliably extract — leave them as null, not empty string):
{
  "candidateName": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "primarySkill": string | null,
  "secondarySkills": string | null,
  "technology": string | null,
  "totalExperience": number | null,
  "relevantExperience": number | null,
  "currentEmployer": string | null,
  "currentDesignation": string | null,
  "noticePeriod": string | null,
  "expectedRate": number | null,
  "currency": string | null,
  "employmentType": string | null,
  "resourceType": string | null,
  "certifications": string | null,
  "education": string | null,
  "domainExperience": string | null,
  "remarks": string | null
}

Rules:
- For totalExperience / relevantExperience / expectedRate, output numeric values (e.g., 8 or 8.5)
- For currency, default to "USD" if not stated
- For employmentType, use one of: "Full-time", "Contract", "C2H", "Part-time"
- For resourceType, use one of: "Internal", "External", "Bench"
- For location, prefer "City, Country" format
- For primarySkill, pick the dominant technical skill (e.g., "Java", "Python", "React", "AWS")
- For secondarySkills, list 2-5 supporting skills, comma-separated
- For technology, list the main tech stack
- For remarks, write a 1-sentence summary of the candidate's strengths
- Output ONLY the JSON, no markdown fences, no commentary.`;

    const userPrompt = `RESUME TEXT FROM FILE: ${file.name}\n\n--- BEGIN RESUME ---\n${text}\n--- END RESUME ---\n\nExtract the structured candidate JSON.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let parsed: any = null;
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]); } catch {}
    }

    if (!parsed) {
      return NextResponse.json({
        error: "Could not parse LLM response. Try a different resume or paste the data manually.",
        rawPreview: raw.slice(0, 300),
      }, { status: 422 });
    }

    return NextResponse.json({
      ...parsed,
      fileName: file.name,
      fileType: ext,
      fileSize: file.size,
      textPreview: text.slice(0, 200) + (text.length > 200 ? "..." : ""),
    });
  } catch (e: any) {
    console.error("Resume extract error:", e);
    return NextResponse.json({ error: "Resume extraction failed: " + e.message }, { status: 500 });
  }
}
