import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, canWriteDemand, canWriteResource, logAudit } from "@/lib/auth";

// Normalize a column header for matching: lowercase, strip whitespace, strip
// non-alphanumeric characters. Handles "Candidate Name", "CandidateName",
// "candidate_name", "Candidate-Name" all the same way → "candidatename".
function normalize(h: string): string {
  return (h || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Flexible field lookup: tries multiple header-name variants to find a value
// in the row. Case-insensitive, whitespace-insensitive, separator-insensitive.
//
// Usage: const name = getField(row, ["Name", "CandidateName", "FullName", "ResourceName"])
function getField(row: Record<string, string>, aliases: string[]): string {
  // Build a normalized lookup map once per row (cached on the row object)
  const cacheKey = "__normMap__";
  let normMap: Record<string, string> = (row as any)[cacheKey];
  if (!normMap) {
    normMap = {};
    for (const k of Object.keys(row)) {
      normMap[normalize(k)] = row[k];
    }
    (row as any)[cacheKey] = normMap;
  }
  for (const alias of aliases) {
    const n = normalize(alias);
    if (normMap[n] !== undefined && normMap[n] !== "") {
      return normMap[n];
    }
  }
  return "";
}

// Generate the next sequential ID for a given prefix (DMD, RES)
async function nextId(prefix: "DMD" | "RES", existingIds: Set<string>): Promise<string> {
  let max = 1000;
  for (const id of existingIds) {
    const m = id.match(new RegExp(`${prefix}-(\\d+)`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  let n = max + 1;
  while (existingIds.has(`${prefix}-${n}`)) n++;
  const newId = `${prefix}-${n}`;
  existingIds.add(newId);
  return newId;
}

// Common column-name aliases for each field — accept any reasonable variant
const FIELD_ALIASES = {
  // Demand fields
  DemandID: ["DemandID", "Demand ID", "DemandId", "ID"],
  Client: ["Client", "Company", "CompanyName", "ClientName", "Customer", "Organization", "Organisation"],
  Account: ["Account", "AccountName", "Account Unit", "Business Unit"],
  Project: ["Project", "ProjectName", "Project Name"],
  Position: ["Position", "PositionTitle", "Position Title", "Title", "Role", "JobTitle", "Job Title"],
  PrimarySkill: ["PrimarySkill", "Primary Skill", "Skill", "Skills", "MainSkill", "Main Skill", "PrimarySkillset"],
  SecondarySkills: ["SecondarySkills", "Secondary Skills", "SecondarySkill", "SkillsSecondary", "OtherSkills"],
  MinExp: ["MinExp", "Min Experience", "MinimumExperience", "Minimum Experience", "MinYears", "Min Years", "ExperienceMin"],
  MaxExp: ["MaxExp", "Max Experience", "MaximumExperience", "Maximum Experience", "MaxYears", "Max Years", "ExperienceMax"],
  Location: ["Location", "City", "CityCountry", "City Country", "WorkLocation", "Work Location", "JobLocation", "Job Location", "Place"],
  WorkMode: ["WorkMode", "Work Mode", "Mode", "WorkType", "Work Type"],
  Positions: ["Positions", "NumberOfPositions", "Number Of Positions", "Headcount", "Openings", "Vacancy", "Vacancies", "Count"],
  Priority: ["Priority"],
  Status: ["Status"],
  Owner: ["Owner", "OwnerName", "Owner Name", "DemandOwner", "Demand Owner"],
  ResourceManager: ["ResourceManager", "Resource Manager", "RM", "RMName"],
  // Resource fields
  Name: ["Name", "CandidateName", "Candidate Name", "FullName", "Full Name", "ResourceName", "Resource Name", "Candidate", "Person", "ContactName", "Contact Name"],
  Email: ["Email", "E-mail", "Email Address", "EmailAddress", "E Mail", "Mail", "EmailID"],
  Phone: ["Phone", "Phone Number", "PhoneNumber", "Mobile", "Mobile Number", "MobileNumber", "Contact", "Contact Number", "ContactNumber", "Cell", "CellPhone", "Telephone"],
  Technology: ["Technology", "Tech", "Stack", "TechStack", "PrimaryTech"],
  TotalExperience: ["TotalExperience", "Total Experience", "Experience", "Exp", "YearsExperience", "Years of Experience", "ExperienceYears", "TotalYears", "Total Yrs"],
  RelevantExperience: ["RelevantExperience", "Relevant Experience", "RelExp", "Relevant Exp"],
  CurrentEmployer: ["CurrentEmployer", "Current Employer", "Employer", "Company", "CurrentCompany", "Current Company", "Organization", "Organisation", "CurrentOrg"],
  Designation: ["Designation", "CurrentDesignation", "Current Designation", "Role", "Title", "JobTitle", "Job Title", "Position", "CurrentRole"],
  NoticePeriod: ["NoticePeriod", "Notice Period", "Notice", "NP"],
  ExpectedRate: ["ExpectedRate", "Expected Rate", "Rate", "Salary", "CTC", "Compensation", "ExpectedSalary"],
  Currency: ["Currency", "Curr"],
  EmploymentType: ["EmploymentType", "Employment Type", "Employment", "EmpType", "Emp Type", "Type"],
  ResourceType: ["ResourceType", "Resource Type", "ResType"],
  Tags: ["Tags", "Tag"],
};

// Validate + preview import data
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { type, rows } = body as { type: "demands" | "resources"; rows: Record<string, string>[] };
  if (!rows || !Array.isArray(rows)) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const valid: Record<string, string>[] = [];
  const errors: { row: number; field: string; message: string }[] = [];
  const duplicates: { row: number; existing: string }[] = [];

  // For resources we still check duplicates by email/phone
  const existingResources = type === "resources"
    ? await db.resource.findMany({ select: { resourceId: true, email: true, phone: true } })
    : [];
  const existingEmails = new Set(existingResources.map(r => r.email).filter(Boolean) as string[]);
  const existingPhones = new Set(existingResources.map(r => r.phone).filter(Boolean) as string[]);

  // Capture what columns were detected (for the UI to display)
  const detectedColumns: Record<string, string | null> = {};
  if (rows.length > 0) {
    const sampleRow = rows[0];
    const allKeys = Object.keys(sampleRow);
    const requiredFields = type === "demands"
      ? ["Client", "Position", "PrimarySkill"]
      : ["Name", "PrimarySkill"];
    for (const field of requiredFields) {
      const aliases = (FIELD_ALIASES as any)[field] as string[];
      const matched = aliases.find(a => allKeys.some(k => normalize(k) === normalize(a)));
      detectedColumns[field] = matched ? allKeys.find(k => normalize(k) === normalize(matched!))! : null;
    }
  }

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 for header
    if (type === "demands") {
      const client = getField(row, FIELD_ALIASES.Client).trim();
      const position = getField(row, FIELD_ALIASES.Position).trim();
      const skill = getField(row, FIELD_ALIASES.PrimarySkill).trim();
      if (!client) { errors.push({ row: rowNum, field: "Client", message: "Required — no column found for Client/Company. Add a 'Client' column." }); return; }
      if (!position) { errors.push({ row: rowNum, field: "Position", message: "Required — no column found for Position/Title. Add a 'Position' column." }); return; }
      if (!skill) { errors.push({ row: rowNum, field: "PrimarySkill", message: "Required — no column found for PrimarySkill/Skill. Add a 'PrimarySkill' column." }); return; }
      valid.push(row);
    } else if (type === "resources") {
      const name = getField(row, FIELD_ALIASES.Name).trim();
      const skill = getField(row, FIELD_ALIASES.PrimarySkill).trim();
      const email = getField(row, FIELD_ALIASES.Email).trim().toLowerCase();
      const phone = getField(row, FIELD_ALIASES.Phone).trim();
      if (!name) { errors.push({ row: rowNum, field: "Name", message: "Required — no column found for Name. Try headers like 'Name', 'Candidate Name', 'FullName', or 'Resource Name'." }); return; }
      if (!skill) { errors.push({ row: rowNum, field: "PrimarySkill", message: "Required — no column found for PrimarySkill. Add a 'PrimarySkill' or 'Skill' column." }); return; }
      if (email && existingEmails.has(email)) {
        duplicates.push({ row: rowNum, existing: `email ${email}` });
        return;
      }
      if (phone && existingPhones.has(phone)) {
        duplicates.push({ row: rowNum, existing: `phone ${phone}` });
        return;
      }
      if (email) existingEmails.add(email);
      if (phone) existingPhones.add(phone);
      valid.push(row);
    }
  });

  return NextResponse.json({
    total: rows.length,
    valid: valid.length,
    duplicates: duplicates.length,
    errors: errors.length,
    errorDetails: errors.slice(0, 50),
    duplicateDetails: duplicates.slice(0, 50),
    validRows: valid,
    detectedColumns,
  });
}

// Commit (actually import) the validated rows — auto-generates IDs as needed
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { type, rows } = body as { type: "demands" | "resources"; rows: Record<string, string>[] };

  let created = 0;
  if (type === "demands") {
    if (!canWriteDemand(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const allDemandIds = new Set((await db.demand.findMany({ select: { demandId: true } })).map(d => d.demandId));
    for (const r of rows) {
      const demandId = await nextId("DMD", allDemandIds);
      await db.demand.create({
        data: {
          demandId,
          client: getField(r, FIELD_ALIASES.Client),
          account: getField(r, FIELD_ALIASES.Account) || null,
          project: getField(r, FIELD_ALIASES.Project) || null,
          positionTitle: getField(r, FIELD_ALIASES.Position),
          primarySkill: getField(r, FIELD_ALIASES.PrimarySkill),
          secondarySkills: getField(r, FIELD_ALIASES.SecondarySkills) || null,
          minExperience: (() => { const v = getField(r, FIELD_ALIASES.MinExp); return v ? Number(v) : null; })(),
          maxExperience: (() => { const v = getField(r, FIELD_ALIASES.MaxExp); return v ? Number(v) : null; })(),
          location: getField(r, FIELD_ALIASES.Location) || null,
          workMode: getField(r, FIELD_ALIASES.WorkMode) || "Onsite",
          numberOfPositions: Number(getField(r, FIELD_ALIASES.Positions) || 1),
          priority: getField(r, FIELD_ALIASES.Priority) || "Medium",
          status: getField(r, FIELD_ALIASES.Status) || "New",
          ownerName: getField(r, FIELD_ALIASES.Owner) || user.name,
          ownerId: user.id,
          resourceManagerName: getField(r, FIELD_ALIASES.ResourceManager) || user.name,
          resourceManagerId: user.id,
        },
      });
      created++;
    }
  } else if (type === "resources") {
    if (!canWriteResource(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const allResourceIds = new Set((await db.resource.findMany({ select: { resourceId: true } })).map(r => r.resourceId));
    for (const r of rows) {
      const resourceId = getField(r, FIELD_ALIASES.DemandID.length ? ["ResourceID", "Resource ID", "ResID"] : ["ResourceID"]) || await nextId("RES", allResourceIds);
      await db.resource.create({
        data: {
          resourceId,
          candidateName: getField(r, FIELD_ALIASES.Name),
          email: getField(r, FIELD_ALIASES.Email) || null,
          phone: getField(r, FIELD_ALIASES.Phone) || null,
          currentLocation: getField(r, FIELD_ALIASES.Location) || null,
          primarySkill: getField(r, FIELD_ALIASES.PrimarySkill),
          technology: getField(r, FIELD_ALIASES.Technology) || null,
          totalExperience: (() => { const v = getField(r, FIELD_ALIASES.TotalExperience); return v ? Number(v) : null; })(),
          relevantExperience: (() => { const v = getField(r, FIELD_ALIASES.RelevantExperience); return v ? Number(v) : null; })(),
          currentEmployer: getField(r, FIELD_ALIASES.CurrentEmployer) || null,
          currentDesignation: getField(r, FIELD_ALIASES.Designation) || null,
          noticePeriod: getField(r, FIELD_ALIASES.NoticePeriod) || null,
          expectedRate: (() => { const v = getField(r, FIELD_ALIASES.ExpectedRate); return v ? Number(v) : null; })(),
          currency: getField(r, FIELD_ALIASES.Currency) || "USD",
          employmentType: getField(r, FIELD_ALIASES.EmploymentType) || "Full-time",
          resourceType: getField(r, FIELD_ALIASES.ResourceType) || "External",
          status: getField(r, FIELD_ALIASES.Status) || "Available",
          tags: getField(r, FIELD_ALIASES.Tags) || null,
        },
      });
      created++;
    }
  }

  await logAudit({ userId: user.id, userName: user.name, action: "import.commit", entityType: type === "demands" ? "Demand" : "Resource", entityName: `${created} records`, details: { type, count: created } });
  return NextResponse.json({ created });
}
