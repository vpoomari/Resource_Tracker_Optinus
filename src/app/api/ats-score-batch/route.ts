import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

// Batch ATS scoring — scores resources against a JD in chunks.
// The frontend calls this repeatedly with increasing offset until all resources are scored.
//
// POST /api/ats-score-batch
// Body: { jdText: string, offset?: number, limit?: number }
// Returns: { scored: [...], total, offset, limit, hasMore }

const MAX_JD_CHARS = 10000;
const DEFAULT_BATCH_SIZE = 3;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { jdText, offset = 0, limit = DEFAULT_BATCH_SIZE } = body;
    if (!jdText || jdText.trim().length < 10) {
      return NextResponse.json({ error: "JD text is required (at least 10 characters)" }, { status: 400 });
    }
    const jd = jdText.slice(0, MAX_JD_CHARS);

    // Fetch ALL resource IDs + minimal info (lightweight query)
    const allResources = await db.resource.findMany({
      select: {
        id: true, resourceId: true, candidateName: true,
        primarySkill: true, secondarySkills: true, technology: true,
        totalExperience: true, relevantExperience: true,
        currentEmployer: true, currentDesignation: true,
        certifications: true, education: true,
        domainExperience: true, previousClientExp: true,
        remarks: true,
      },
      orderBy: { resourceId: "asc" },
    });

    const total = allResources.length;
    console.log(`[ats-batch] allResources.length=${allResources.length}, offset=${offset}, limit=${limit}`);

    // Slice the batch we need
    const batch = allResources.slice(offset, offset + limit);
    console.log(`[ats-batch] batch.length=${batch.length}, ids=${batch.map(r => r.resourceId).join(", ")}`);

    if (batch.length === 0) {
      return NextResponse.json({ scored: [], total, offset, limit, hasMore: false });
    }

    // Initialize the LLM
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const systemPrompt = `You are an Applicant Tracking System (ATS) scoring engine. Evaluate how well a candidate's profile matches a job description (JD).

For each candidate, output ONLY a JSON object with EXACTLY this schema:
{
  "score": number,
  "skillMatch": number,
  "experienceMatch": number,
  "educationMatch": number,
  "domainMatch": number,
  "matchedSkills": string[],
  "missingSkills": string[],
  "strengths": string,
  "gaps": string,
  "recommendation": "Strong Match" | "Good Match" | "Partial Match" | "Weak Match" | "No Match"
}

Rules:
- Score > 80: Strong Match | 65-80: Good Match | 45-64: Partial Match | 25-44: Weak Match | < 25: No Match
- Output ONLY the JSON, no other text, no markdown fences.`;

    const scored: any[] = [];

    for (const r of batch) {
      let result: any = null;
      let score = 0;
      try {
        const candidateText = [
          `Name: ${r.candidateName}`,
          `Primary Skill: ${r.primarySkill || "N/A"}`,
          `Secondary Skills: ${r.secondarySkills || "N/A"}`,
          `Technology: ${r.technology || "N/A"}`,
          `Total Experience: ${r.totalExperience ?? "N/A"} years`,
          `Relevant Experience: ${r.relevantExperience ?? "N/A"} years`,
          `Current Employer: ${r.currentEmployer || "N/A"}`,
          `Current Designation: ${r.currentDesignation || "N/A"}`,
          `Certifications: ${r.certifications || "N/A"}`,
          `Education: ${r.education || "N/A"}`,
          `Domain Experience: ${r.domainExperience || "N/A"}`,
          `Previous Client Experience: ${r.previousClientExp || "N/A"}`,
          `Remarks: ${r.remarks || "N/A"}`,
        ].join("\n");

        const userPrompt = `JOB DESCRIPTION:\n${jd}\n\n---\n\nCANDIDATE PROFILE:\n${candidateText}\n\nEvaluate this candidate against the JD and return the JSON.`;

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

        score = parsed?.score ?? 0;
        result = {
          resourceId: r.resourceId,
          candidateName: r.candidateName,
          score,
          skillMatch: parsed?.skillMatch ?? 0,
          experienceMatch: parsed?.experienceMatch ?? 0,
          educationMatch: parsed?.educationMatch ?? 0,
          domainMatch: parsed?.domainMatch ?? 0,
          matchedSkills: parsed?.matchedSkills ?? [],
          missingSkills: parsed?.missingSkills ?? [],
          strengths: parsed?.strengths ?? "Unable to parse",
          gaps: parsed?.gaps ?? "Unable to parse",
          recommendation: parsed?.recommendation ?? "No Match",
        };
      } catch (e: any) {
        result = {
          resourceId: r.resourceId,
          candidateName: r.candidateName,
          score: 0,
          error: e.message,
          recommendation: "Error",
        };
      }

      // Push result ONCE (either success or error — never both)
      scored.push(result);

      // Save the score to the DB using raw SQL (avoids stale Prisma client cache issue)
      if (!result.error) {
        try {
          await db.$executeRaw`
            UPDATE resources
            SET atsScore = ${score},
                atsScoreDate = ${new Date().toISOString()},
                atsScoreJd = ${jd.slice(0, 200) + (jd.length > 200 ? "..." : "")}
            WHERE id = ${r.id}
          `;
        } catch (dbErr: any) {
          console.error(`[ats-batch] DB update failed for ${r.resourceId}:`, dbErr.message);
        }
      }
    }

    await logAudit({
      userId: user.id, userName: user.name,
      action: "ats.batch", entityType: "Resource",
      entityName: `Batch scored ${scored.length} resources (offset ${offset})`,
      details: { total, offset, limit, scored: scored.length },
    });

    return NextResponse.json({
      scored,
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    });
  } catch (e: any) {
    console.error("ATS batch error:", e);
    return NextResponse.json({ error: "Batch scoring failed: " + e.message }, { status: 500 });
  }
}
