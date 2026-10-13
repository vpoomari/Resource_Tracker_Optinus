// Seed script for ResourceFlow — populates realistic demo data
// Run with: bun run scripts/seed.ts

import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

async function main() {
  console.log("Seeding database...");

  // ---- USERS ----
  const adminPassword = await hashPassword("admin123");

  const users = [
    { id: "u_admin",  email: "admin@optinus.com",    name: "Anand Patel",    role: "Admin",            avatarColor: "#1565D8", phone: "+91 98765 43210" },
    { id: "u_rm1",    email: "rm@optinus.com",       name: "Reshma Iyer",    role: "Resource Manager", avatarColor: "#2196F3", phone: "+91 98000 11111" },
    { id: "u_rec1",   email: "recruiter@optinus.com", name: "Karan Mehta",   role: "Recruiter",        avatarColor: "#8B5CF6", phone: "+91 99000 22222" },
    { id: "u_dm1",    email: "dm@optinus.com",       name: "Sunita Rao",     role: "Demand Manager",   avatarColor: "#10B981", phone: "+91 97000 33333" },
    { id: "u_mgmt1",  email: "mgmt@optinus.com",     name: "Vikram Nair",    role: "Management",       avatarColor: "#F59E0B", phone: "+91 96000 44444" },
    { id: "u_viewer", email: "viewer@optinus.com",   name: "Pooja Shetty",   role: "Viewer",            avatarColor: "#64748B", phone: "+91 95000 55555" },
  ];

  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, avatarColor: u.avatarColor, phone: u.phone, passwordHash: adminPassword, active: true },
      create: { ...u, passwordHash: adminPassword },
    });
  }
  console.log(`  Users: ${users.length}`);

  // ---- CLIENTS ----
  const clients = [
    { name: "HSBC Global",      industry: "Banking",     contactName: "James Carter", contactEmail: "james.carter@hsbc.com",   website: "hsbc.com" },
    { name: "Accenture",        industry: "IT Services", contactName: "Lara Wong",     contactEmail: "lara.wong@accenture.com", website: "accenture.com" },
    { name: "Cognizant",        industry: "IT Services", contactName: "Mohan Das",    contactEmail: "mohan.das@cognizant.com", website: "cognizant.com" },
    { name: "Capgemini",        industry: "Consulting",  contactName: "Eva Braun",    contactEmail: "eva.braun@capgemini.com", website: "capgemini.com" },
    { name: "JPMorgan Chase",    industry: "Finance",     contactName: "Robert Lin",    contactEmail: "robert.lin@jpm.com",       website: "jpmorganchase.com" },
  ];
  for (const c of clients) {
    await db.client.upsert({
      where: { name: c.name },
      update: c,
      create: c,
    });
  }
  console.log(`  Clients: ${clients.length}`);

  // ---- DEMANDS ----
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const daysAhead = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  const demands = [
    { demandId: "DMD-1001", client: "HSBC Global",     account: "Banking Operations", project: "Core Banking Modernization", positionTitle: "Senior Java Developer", primarySkill: "Java", secondarySkills: "Spring Boot, Microservices, Kafka", minExperience: 6, maxExperience: 10, location: "Bangalore", workMode: "Hybrid", priority: "Critical", status: "Client Review", ownerId: "u_rm1", resourceManagerId: "u_rm1", targetClosureDate: daysAhead(20), createdAt: daysAgo(3) },
    { demandId: "DMD-1002", client: "Accenture",       account: "Delivery", project: "Cloud Migration", positionTitle: "AWS Cloud Engineer", primarySkill: "AWS", secondarySkills: "Terraform, Lambda, ECS", minExperience: 5, maxExperience: 8, location: "Mumbai", workMode: "Remote", priority: "High", status: "Sourcing", ownerId: "u_dm1", resourceManagerId: "u_rm1", targetClosureDate: daysAhead(30), createdAt: daysAgo(5) },
    { demandId: "DMD-1003", client: "Cognizant",       account: "Healthcare", project: "Claims Engine", positionTitle: "Full Stack Engineer", primarySkill: "React", secondarySkills: "Node.js, MongoDB, REST", minExperience: 4, maxExperience: 7, location: "Hyderabad", workMode: "Hybrid", priority: "High", status: "Interview", ownerId: "u_rm1", resourceManagerId: "u_rm1", targetClosureDate: daysAhead(15), createdAt: daysAgo(9) },
    { demandId: "DMD-1004", client: "Capgemini",        account: "Insurance", project: "Policy Admin", positionTitle: "DevOps Engineer", primarySkill: "DevOps", secondarySkills: "Jenkins, Docker, Kubernetes", minExperience: 5, maxExperience: 9, location: "Pune", workMode: "Onsite", priority: "Medium", status: "Profile Submitted", ownerId: "u_dm1", resourceManagerId: "u_rm1", targetClosureDate: daysAhead(25), createdAt: daysAgo(12) },
    { demandId: "DMD-1005", client: "JPMorgan Chase",  account: "Risk", project: "Fraud Detection", positionTitle: "Python Data Engineer", primarySkill: "Python", secondarySkills: "Pandas, Spark, Airflow", minExperience: 5, maxExperience: 8, location: "Bangalore", workMode: "Hybrid", priority: "Critical", status: "Client Review", ownerId: "u_rm1", resourceManagerId: "u_rm1", targetClosureDate: daysAhead(10), createdAt: daysAgo(18) },
    { demandId: "DMD-1006", client: "HSBC Global",     account: "Digital Channels", project: "Mobile App", positionTitle: "React Native Developer", primarySkill: "React Native", secondarySkills: "iOS, Android, Redux", minExperience: 4, maxExperience: 7, location: "Bangalore", workMode: "Hybrid", priority: "High", status: "Selected", ownerId: "u_rm1", resourceManagerId: "u_rm1", targetClosureDate: daysAhead(7), createdAt: daysAgo(24) },
    { demandId: "DMD-1007", client: "Accenture",       account: "Delivery", project: "ERP Implementation", positionTitle: "Project Manager", primarySkill: "PMP", secondarySkills: "Agile, Scrum, JIRA", minExperience: 8, maxExperience: 12, location: "Mumbai", workMode: "Hybrid", priority: "Medium", status: "Open", ownerId: "u_dm1", resourceManagerId: "u_rm1", targetClosureDate: daysAhead(45), createdAt: daysAgo(2) },
    { demandId: "DMD-1008", client: "Cognizant",       account: "Retail", project: "E-commerce Platform", positionTitle: "QA Automation Engineer", primarySkill: "Selenium", secondarySkills: "Cypress, Java, REST Assured", minExperience: 4, maxExperience: 6, location: "Hyderabad", workMode: "Onsite", priority: "Low", status: "Sourcing", ownerId: "u_dm1", resourceManagerId: "u_rm1", targetClosureDate: daysAhead(40), createdAt: daysAgo(7) },
    { demandId: "DMD-1009", client: "Capgemini",        account: "Insurance", project: "Claims Portal", positionTitle: "Senior Angular Developer", primarySkill: "Angular", secondarySkills: "TypeScript, RxJS, NgRx", minExperience: 6, maxExperience: 9, location: "Pune", workMode: "Remote", priority: "High", status: "Interview", ownerId: "u_rm1", resourceManagerId: "u_rm1", targetClosureDate: daysAhead(14), createdAt: daysAgo(15) },
    { demandId: "DMD-1010", client: "JPMorgan Chase",  account: "Trading", project: "Trading Dashboard", positionTitle: "UI/UX Designer", primarySkill: "Figma", secondarySkills: "Sketch, Adobe XD, Prototyping", minExperience: 5, maxExperience: 8, location: "Bangalore", workMode: "Hybrid", priority: "Medium", status: "Profile Submitted", ownerId: "u_rm1", resourceManagerId: "u_rm1", targetClosureDate: daysAhead(30), createdAt: daysAgo(20) },
    { demandId: "DMD-1011", client: "HSBC Global",     account: "Banking Operations", project: "API Gateway", positionTitle: "Solution Architect", primarySkill: "Architecture", secondarySkills: "Java, AWS, API Design", minExperience: 10, maxExperience: 15, location: "Bangalore", workMode: "Hybrid", priority: "Critical", status: "Joined", ownerId: "u_rm1", resourceManagerId: "u_rm1", targetClosureDate: daysAhead(2), createdAt: daysAgo(35), closedAt: daysAgo(2) },
    { demandId: "DMD-1012", client: "Accenture",       account: "Delivery", project: "Cloud Migration", positionTitle: "Senior Java Developer", primarySkill: "Java", secondarySkills: "Spring, Hibernate", minExperience: 6, maxExperience: 9, location: "Bangalore", workMode: "Hybrid", priority: "High", status: "Sourcing", ownerId: "u_rm1", resourceManagerId: "u_rm1", targetClosureDate: daysAhead(25), createdAt: daysAgo(4) },
    { demandId: "DMD-1013", client: "Cognizant",       account: "Healthcare", project: "Patient Portal", positionTitle: "Backend Developer", primarySkill: "Node.js", secondarySkills: "Express, MongoDB, JWT", minExperience: 4, maxExperience: 6, location: "Hyderabad", workMode: "Remote", priority: "Medium", status: "New", ownerId: "u_dm1", resourceManagerId: "u_rm1", targetClosureDate: daysAhead(40), createdAt: daysAgo(1) },
    { demandId: "DMD-1014", client: "Capgemini",        account: "Insurance", project: "Quote Engine", positionTitle: "Data Scientist", primarySkill: "Machine Learning", secondarySkills: "Python, TensorFlow, NLP", minExperience: 6, maxExperience: 9, location: "Pune", workMode: "Hybrid", priority: "Critical", status: "On Hold", ownerId: "u_rm1", resourceManagerId: "u_rm1", targetClosureDate: daysAhead(60), createdAt: daysAgo(28) },
    { demandId: "DMD-1015", client: "JPMorgan Chase",  account: "Risk", project: "Credit Scoring", positionTitle: "Senior SQL Developer", primarySkill: "SQL", secondarySkills: "SSIS, SSRS, ETL", minExperience: 7, maxExperience: 10, location: "Bangalore", workMode: "Onsite", priority: "Medium", status: "Closed", ownerId: "u_rm1", resourceManagerId: "u_rm1", targetClosureDate: daysAhead(-5), createdAt: daysAgo(50), closedAt: daysAgo(5) },
  ];

  for (const d of demands) {
    await db.demand.upsert({
      where: { demandId: d.demandId },
      update: {},
      create: {
        ...d,
        ownerName: d.ownerId === "u_rm1" ? "Reshma Iyer" : "Sunita Rao",
        resourceManagerName: "Reshma Iyer",
        accountManagerName: "Anand Patel",
        accountManagerId: "u_admin",
        jobDescription: "Responsible for design, development, and support of mission-critical applications. Collaborate with cross-functional teams to deliver high-quality solutions. Strong communication and problem-solving skills required.",
        numberOfPositions: 1 + Math.floor(Math.random() * 3),
      },
    });
  }
  console.log(`  Demands: ${demands.length}`);

  // ---- RESOURCES ----
  const resourceSeeds = [
    { name: "Rahul Kumar",       email: "rahul.kumar@email.com",      phone: "+91 99001 10001", loc: "Bangalore", skill: "Java",            tech: "Spring Boot",   exp: 8.0,  emp: "TCS",          desig: "Senior Developer" },
    { name: "Priya Sharma",      email: "priya.sharma@email.com",     phone: "+91 99001 10002", loc: "Bangalore", skill: "React",           tech: "React",          exp: 5.5,  emp: "Infosys",      desig: "Frontend Dev" },
    { name: "Arun Kumar",        email: "arun.kumar@email.com",        phone: "+91 99001 10003", loc: "Bangalore", skill: "AWS",            tech: "Terraform",     exp: 7.0,  emp: "Wipro",        desig: "Cloud Engineer" },
    { name: "Deepika Reddy",    email: "deepika.r@email.com",         phone: "+91 99001 10004", loc: "Hyderabad", skill: "Angular",        tech: "TypeScript",    exp: 6.0,  emp: "Tech M",       desig: "Senior Engineer" },
    { name: "Karthik Subramani", email: "karthik.s@email.com",        phone: "+91 99001 10005", loc: "Chennai",   skill: "Python",         tech: "Pandas",        exp: 6.5,  emp: "Cognizant",    desig: "Data Engineer" },
    { name: "Sneha Patel",       email: "sneha.patel@email.com",       phone: "+91 99001 10006", loc: "Pune",       skill: "DevOps",         tech: "Kubernetes",    exp: 7.5,  emp: "Capgemini",    desig: "DevOps Lead" },
    { name: "Mohammed Irfan",    email: "irfan.mohammed@email.com",    phone: "+91 99001 10007", loc: "Hyderabad", skill: "Java",           tech: "Microservices", exp: 9.0,  emp: "Accenture",    desig: "Tech Lead" },
    { name: "Ananya Iyer",       email: "ananya.iyer@email.com",      phone: "+91 99001 10008", loc: "Mumbai",     skill: "React Native",   tech: "React Native",  exp: 4.5,  emp: "FreeLancer",   desig: "Mobile Dev" },
    { name: "Rohit Verma",       email: "rohit.verma@email.com",       phone: "+91 99001 10009", loc: "Delhi",      skill: "Node.js",        tech: "Express",       exp: 5.0,  emp: "Freelancer",   desig: "Backend Dev" },
    { name: "Lakshmi Menon",     email: "lakshmi.m@email.com",         phone: "+91 99001 10010", loc: "Bangalore", skill: "SQL",            tech: "Snowflake",     exp: 8.0,  emp: "JPMorgan",     desig: "Senior DB Dev" },
    { name: "Vignesh Raghav",    email: "vignesh.r@email.com",        phone: "+91 99001 10011", loc: "Chennai",   skill: "Selenium",       tech: "Cypress",       exp: 4.0,  emp: "TCS",          desig: "QA Engineer" },
    { name: "Fatima Sheikh",     email: "fatima.s@email.com",          phone: "+91 99001 10012", loc: "Pune",       skill: "Figma",          tech: "Adobe XD",      exp: 5.0,  emp: "Independent",  desig: "UX Designer" },
    { name: "Ankit Jain",         email: "ankit.jain@email.com",       phone: "+91 99001 10013", loc: "Bangalore", skill: "Architecture",   tech: "AWS",           exp: 12.0, emp: "Accenture",    desig: "Architect" },
    { name: "Divya Nair",         email: "divya.nair@email.com",       phone: "+91 99001 10014", loc: "Mumbai",     skill: "Java",           tech: "Spring Boot",   exp: 6.5,  emp: "Infosys",      desig: "Senior Dev" },
    { name: "Suresh Pillai",     email: "suresh.p@email.com",         phone: "+91 99001 10015", loc: "Trivandrum",skill: "PMP",           tech: "Agile",         exp: 11.0, emp: "Wipro",        desig: "Project Manager" },
    { name: "Geetha Krishnan",   email: "geetha.k@email.com",         phone: "+91 99001 10016", loc: "Bangalore", skill: "Machine Learning", tech: "TensorFlow",  exp: 7.0,  emp: "Cognizant",    desig: "ML Engineer" },
    { name: "Imran Khan",         email: "imran.k@email.com",          phone: "+91 99001 10017", loc: "Hyderabad", skill: "AWS",            tech: "Lambda",        exp: 6.0,  emp: "Tech M",       desig: "Cloud Engineer" },
    { name: "Nisha Agarwal",      email: "nisha.a@email.com",          phone: "+91 99001 10018", loc: "Pune",       skill: "Angular",        tech: "NgRx",          exp: 5.5,  emp: "Capgemini",    desig: "Senior Dev" },
    { name: "Santosh Gupta",     email: "santosh.g@email.com",        phone: "+91 99001 10019", loc: "Delhi",      skill: "DevOps",         tech: "Jenkins",       exp: 8.5,  emp: "Accenture",    desig: "DevOps Engineer" },
    { name: "Meera Joshi",        email: "meera.j@email.com",          phone: "+91 99001 10020", loc: "Mumbai",     skill: "Python",         tech: "Airflow",       exp: 5.5,  emp: "JPMorgan",     desig: "Data Engineer" },
    { name: "Harish Kumar",       email: "harish.k@email.com",         phone: "+91 99001 10021", loc: "Bangalore", skill: "React",           tech: "Redux",         exp: 4.5,  emp: "TCS",          desig: "Frontend Dev" },
    { name: "Pallavi Deshmukh",   email: "pallavi.d@email.com",        phone: "+91 99001 10022", loc: "Pune",       skill: "Java",           tech: "Hibernate",     exp: 6.0,  emp: "Infosys",      desig: "Senior Developer" },
    { name: "Manoj Bhat",         email: "manoj.b@email.com",          phone: "+91 99001 10023", loc: "Bangalore", skill: "Node.js",        tech: "NestJS",        exp: 7.0,  emp: "Wipro",        desig: "Lead Engineer" },
    { name: "Sahana Reddy",       email: "sahana.r@email.com",         phone: "+91 99001 10024", loc: "Hyderabad", skill: "SQL",            tech: "ETL",           exp: 9.0,  emp: "Cognizant",    desig: "Data Lead" },
    { name: "Faizan Ahmed",       email: "faizan.a@email.com",         phone: "+91 99001 10025", loc: "Chennai",   skill: "Selenium",       tech: "Java",          exp: 5.0,  emp: "Tech M",       desig: "QA Lead" },
    { name: "Ramya Sridhar",      email: "ramya.s@email.com",          phone: "+91 99001 10026", loc: "Bangalore", skill: "Figma",          tech: "Sketch",        exp: 6.0,  emp: "Accenture",    desig: "Senior UX" },
    { name: "Yusuf Khan",         email: "yusuf.k@email.com",          phone: "+91 99001 10027", loc: "Mumbai",     skill: "Architecture",   tech: "Java",          exp: 13.0, emp: "Capgemini",    desig: "Solution Architect" },
    { name: "Trisha Nambiar",     email: "trisha.n@email.com",         phone: "+91 99001 10028", loc: "Bangalore", skill: "React Native",   tech: "iOS",           exp: 4.0,  emp: "Freelancer",   desig: "Mobile Dev" },
    { name: "Aditya Menon",       email: "aditya.m@email.com",         phone: "+91 99001 10029", loc: "Pune",       skill: "Machine Learning", tech: "PyTorch",     exp: 6.5,  emp: "JPMorgan",     desig: "ML Engineer" },
    { name: "Aishwarya Gowda",    email: "aishwarya.g@email.com",      phone: "+91 99001 10030", loc: "Bangalore", skill: "Python",         tech: "Spark",         exp: 5.0,  emp: "TCS",          desig: "Data Engineer" },
    { name: "Naveen Shetty",      email: "naveen.s@email.com",         phone: "+91 99001 10031", loc: "Mumbai",     skill: "AWS",            tech: "ECS",           exp: 6.0,  emp: "Infosys",      desig: "Cloud Engineer" },
    { name: "Bhavya Sri",         email: "bhavya.s@email.com",         phone: "+91 99001 10032", loc: "Hyderabad", skill: "Angular",        tech: "Material",      exp: 5.0,  emp: "Wipro",        desig: "Frontend Dev" },
    { name: "Chetan Desai",       email: "chetan.d@email.com",         phone: "+91 99001 10033", loc: "Pune",       skill: "DevOps",         tech: "Docker",        exp: 7.0,  emp: "Cognizant",    desig: "DevOps Engineer" },
    { name: "Krithika Rao",       email: "krithika.r@email.com",       phone: "+91 99001 10034", loc: "Bangalore", skill: "Java",           tech: "Spring Cloud",  exp: 7.5,  emp: "Accenture",    desig: "Tech Lead" },
    { name: "Tanvi Bhat",         email: "tanvi.b@email.com",          phone: "+91 99001 10035", loc: "Mumbai",     skill: "React",          tech: "Next.js",       exp: 6.0,  emp: "Tech M",       desig: "Senior Dev" },
    { name: "Umesh Pai",          email: "umesh.p@email.com",          phone: "+91 99001 10036", loc: "Bangalore", skill: "Node.js",        tech: "GraphQL",       exp: 6.5,  emp: "Capgemini",    desig: "Backend Lead" },
    { name: "Varsha Kulkarni",    email: "varsha.k@email.com",         phone: "+91 99001 10037", loc: "Pune",       skill: "SQL",            tech: "Postgres",      exp: 8.0,  emp: "TCS",          desig: "Senior DBA" },
    { name: "Waheed Anwar",       email: "waheed.a@email.com",         phone: "+91 99001 10038", loc: "Hyderabad", skill: "Selenium",       tech: "REST Assured",  exp: 5.5,  emp: "Infosys",      desig: "QA Engineer" },
    { name: "Zara Sheikh",        email: "zara.s@email.com",           phone: "+91 99001 10039", loc: "Bangalore", skill: "Figma",          tech: "Prototyping",   exp: 4.5,  emp: "Freelancer",   desig: "Designer" },
    { name: "Akhil Raghav",       email: "akhil.r@email.com",          phone: "+91 99001 10040", loc: "Chennai",   skill: "Architecture",   tech: "Microservices", exp: 11.0, emp: "Wipro",        desig: "Architect" },
  ];

  const resourceStatusPool = ["Available", "Proposed", "Available", "Available", "Allocated", "Available", "Available", "Available"];
  const tagsPool = ["Hot Candidate", "Immediate Joiner", "Client Priority", "Internal", "External", "Difficult to Source", "Urgent"];

  for (let i = 0; i < resourceSeeds.length; i++) {
    const r = resourceSeeds[i];
    const resourceId = `RES-${1001 + i}`;
    const tagCount = Math.floor(Math.random() * 3);
    const tags = Array.from({ length: tagCount }, () => tagsPool[Math.floor(Math.random() * tagsPool.length)]).filter((v, idx, arr) => arr.indexOf(v) === idx);
    const expectedRate = 5 + Math.floor(Math.random() * 15);
    const empType = i % 5 === 0 ? "Contract" : (i % 7 === 0 ? "C2H" : "Full-time");
    const rType = i % 9 === 0 ? "Internal" : "External";
    await db.resource.upsert({
      where: { resourceId },
      update: {},
      create: {
        resourceId,
        candidateName: r.name,
        email: r.email,
        phone: r.phone,
        currentLocation: r.loc,
        preferredLocation: r.loc,
        totalExperience: r.exp,
        relevantExperience: r.exp - 1,
        primarySkill: r.skill,
        secondarySkills: r.tech + ", REST APIs",
        technology: r.tech,
        currentEmployer: r.emp,
        currentDesignation: r.desig,
        noticePeriod: ["60 days", "30 days", "90 days", "15 days", "Immediate"][(i % 5)],
        availabilityDate: daysAhead(Math.floor(Math.random() * 30)),
        expectedRate: expectedRate * 1000,
        currency: "USD",
        employmentType: empType,
        resourceType: rType,
        status: resourceStatusPool[i % resourceStatusPool.length],
        certifications: ["AWS Certified", "Scrum Master", "PMP"][i % 3] ?? "",
        education: "B.E. Computer Science",
        domainExperience: "Banking, Insurance",
        previousClientExp: "HSBC, Cognizant",
        remarks: "Strong communicator, immediate availability possible for right opportunity.",
        tags: tags.join(", "),
        avatarColor: ["#1565D8","#2196F3","#8B5CF6","#10B981","#F59E0B","#EC4899","#06B6D4"][i % 7],
      },
    });
  }
  console.log(`  Resources: ${resourceSeeds.length}`);

  // ---- ASSIGNMENTS — map resources to demands ----
  const allDemands = await db.demand.findMany();
  const allResources = await db.resource.findMany();

  const pickResources = (idxList: number[]) => idxList.map(i => allResources[i]).filter(Boolean);

  const assignmentPlan: { demandIdx: number; resources: number[]; stage: string; daysAgo: number; offeredRate?: number }[] = [
    { demandIdx: 0,  resources: [0, 13, 33], stage: "Client Review",     daysAgo: 2 },
    { demandIdx: 1,  resources: [2, 16],     stage: "Sourcing",          daysAgo: 4 },
    { demandIdx: 2,  resources: [4, 19],      stage: "Interview",         daysAgo: 7, offeredRate: 12000 },
    { demandIdx: 3,  resources: [5, 18, 32], stage: "Profile Submitted", daysAgo: 9 },
    { demandIdx: 4,  resources: [4, 29],      stage: "Client Review",     daysAgo: 10 },
    { demandIdx: 5,  resources: [7],          stage: "Selected",          daysAgo: 5, offeredRate: 15000 },
    { demandIdx: 7,  resources: [10, 24],     stage: "Sourcing",          daysAgo: 4 },
    { demandIdx: 8,  resources: [3, 17],      stage: "Interview",         daysAgo: 6 },
    { demandIdx: 9,  resources: [11, 25],      stage: "Profile Submitted", daysAgo: 8 },
    { demandIdx: 10, resources: [12],         stage: "Joined",            daysAgo: 2, offeredRate: 18000 },
    { demandIdx: 11, resources: [0, 13, 33],  stage: "Sourcing",          daysAgo: 2 },
    { demandIdx: 12, resources: [8, 22],       stage: "Profile Submitted", daysAgo: 1 },
    { demandIdx: 13, resources: [15, 28],      stage: "On Hold",           daysAgo: 12 },
    { demandIdx: 14, resources: [9],          stage: "Joined",            daysAgo: 5, offeredRate: 14000 },
  ];

  let asnCounter = 1001;
  let createdAsn = 0;
  for (const plan of assignmentPlan) {
    const demand = allDemands[plan.demandIdx];
    if (!demand) continue;
    const rs = pickResources(plan.resources);
    for (const r of rs) {
      const assignmentId = `ASN-${asnCounter++}`;
      await db.demandResourceAssignment.upsert({
        where: { assignmentId },
        update: {},
        create: {
          assignmentId,
          demandId: demand.id,
          resourceId: r.id,
          submissionDate: daysAgo(plan.daysAgo),
          currentStage: plan.stage,
          proposedById: "u_rec1",
          offeredRate: plan.offeredRate,
          currency: "USD",
          interviewDate: plan.stage === "Interview" || plan.stage === "Selected" || plan.stage === "Joined" ? daysAgo(Math.max(0, plan.daysAgo - 2)) : null,
          interviewResult: plan.stage === "Selected" || plan.stage === "Joined" ? "Cleared" : (plan.stage === "Interview" ? "Pending" : null),
          selectionDate: plan.stage === "Selected" || plan.stage === "Joined" ? daysAgo(Math.max(0, plan.daysAgo - 1)) : null,
          clientFeedback: plan.stage === "Client Review" ? "Awaiting feedback from client SME" : null,
          lastUpdated: daysAgo(Math.max(0, plan.daysAgo - 1)),
        },
      });
      createdAsn++;

      // Status history for the assignment
      const flow = ["Sourcing", "Profile Submitted", "Client Review", "Interview", "Selected", "Joined"];
      const stageIdx = flow.indexOf(plan.stage);
      const historyStages = stageIdx === -1 ? [plan.stage] : flow.slice(0, stageIdx + 1);
      let prev: string | null = null;
      for (let s = 0; s < historyStages.length; s++) {
        const st = historyStages[s];
        await db.statusHistory.create({
          data: {
            demandId: demand.id,
            resourceId: r.id,
            previousStatus: prev,
            newStatus: st,
            changedById: "u_rec1",
            changedByName: "Karan Mehta",
            comments: s === 0 ? "Initial sourcing" : `Moved to ${st}`,
            createdAt: daysAgo(Math.max(0, plan.daysAgo - s)),
          },
        });
        prev = st;
      }
    }
  }
  console.log(`  Assignments: ${createdAsn}`);

  // ---- AUDIT LOGS ----
  await db.auditLog.createMany({
    data: [
      { userId: "u_admin", userName: "Anand Patel",  action: "user.login",       entityType: "User",       entityId: "u_admin",  entityName: "Anand Patel",  details: "{}" },
      { userId: "u_rm1",   userName: "Reshma Iyer",  action: "demand.create",     entityType: "Demand",     entityId: "DMD-1001",  entityName: "DMD-1001",     details: "{}" },
      { userId: "u_rec1",  userName: "Karan Mehta",  action: "resource.create",  entityType: "Resource",  entityId: "RES-1001",  entityName: "Rahul Kumar",  details: "{}" },
      { userId: "u_rec1",  userName: "Karan Mehta",  action: "assignment.move",  entityType: "Assignment", entityId: "ASN-1001",  entityName: "ASN-1001",     details: JSON.stringify({ from: "Client Review", to: "Interview" }) },
      { userId: "u_rm1",   userName: "Reshma Iyer",  action: "demand.close",     entityType: "Demand",     entityId: "DMD-1015",  entityName: "DMD-1015",     details: "{}" },
    ],
  });
  console.log("  Audit logs: 5");

  // ---- NOTIFICATIONS ----
  await db.notification.createMany({
    data: [
      { userId: "u_rm1", title: "New demand created", body: "DMD-1013 - Backend Developer for Cognizant", type: "info" },
      { userId: "u_rm1", title: "Candidate selected", body: "Mohammed Irfan selected for DMD-1006", type: "success" },
      { userId: "u_rm1", title: "Demand aging", body: "DMD-1014 has been open for 28 days", type: "warning" },
      { userId: "u_admin", title: "Demand closed", body: "DMD-1015 closed successfully", type: "success" },
    ],
  });
  console.log("  Notifications: 4");

  // ---- SETTINGS ----
  const settings = [
    { key: "demand_prefix",       value: "DMD" },
    { key: "resource_prefix",     value: "RES" },
    { key: "assignment_prefix",   value: "ASN" },
    { key: "currency",             value: "USD" },
    { key: "aging_warning_days",  value: "30" },
    { key: "aging_critical_days", value: "60" },
    { key: "company_name",        value: "Optinus" },
    { key: "product_name",        value: "Resource Management" },
  ];
  for (const s of settings) {
    await db.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log("  Settings: " + settings.length);

  console.log("Seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
