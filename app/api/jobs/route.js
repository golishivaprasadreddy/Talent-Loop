import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "../../../lib/db";
import { Company, Job } from "../../../models";
import { requirePermission } from "../../../lib/guard";
import { PERMISSIONS } from "../../../lib/rbac";

const DEMO_JOBS = [
  { id: 1, title: "Senior Product Designer", company: "Luma", location: "Hyderabad, India", type: "Full-time", mode: "Hybrid", salary: "₹28L – ₹38L", category: "Design", posted: "2d ago", initials: "LU", color: "purple", description: "Shape intuitive experiences for a product used by teams across the world." },
  { id: 2, title: "Frontend Engineer", company: "Orbit", location: "Bengaluru, India", type: "Full-time", mode: "Remote", salary: "₹22L – ₹32L", category: "Engineering", posted: "3d ago", initials: "OR", color: "orange", description: "Build performant, polished product surfaces with React and modern web tooling." },
  { id: 3, title: "Product Manager", company: "Clover", location: "Mumbai, India", type: "Full-time", mode: "Hybrid", salary: "₹24L – ₹35L", category: "Product", posted: "4d ago", initials: "CL", color: "green", description: "Lead discovery and delivery for a high-impact financial wellness product." },
  { id: 4, title: "Data Analyst", company: "Nexora", location: "Pune, India", type: "Full-time", mode: "Remote", salary: "₹12L – ₹18L", category: "Data", posted: "5d ago", initials: "NE", color: "blue", description: "Turn product and customer data into clear decisions for growing teams." },
  { id: 5, title: "Backend Engineer", company: "Pollen", location: "Hyderabad, India", type: "Full-time", mode: "On-site", salary: "₹20L – ₹30L", category: "Engineering", posted: "1w ago", initials: "PO", color: "pink", description: "Design reliable APIs and services that power a fast-growing marketplace." },
  { id: 6, title: "Growth Marketer", company: "Mosaic", location: "Delhi, India", type: "Contract", mode: "Remote", salary: "₹10L – ₹16L", category: "Marketing", posted: "1w ago", initials: "MO", color: "yellow", description: "Experiment across acquisition channels and help define our growth engine." },
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const workMode = searchParams.get("workMode");
  const salaryMin = searchParams.get("salaryMin");
  const companyId = searchParams.get("companyId");

  try {
    await connectDB();
    const filter = { status: "published" };
    if (category) filter.category = category;
    if (workMode) filter.workMode = workMode;
    if (salaryMin) filter.salaryMin = { $gte: Number(salaryMin) };
    if (companyId) filter.company = companyId;

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 50));
    const skip = (page - 1) * limit;
    const q = searchParams.get("q");
    if (q) filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { skills: { $regex: q, $options: "i" } },
    ];

    const [dbJobs, total] = await Promise.all([
      Job.find(filter)
        .populate("company", "name logo website industry headquarters")
        .sort({ featured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(filter),
    ]);

    if (dbJobs.length) return NextResponse.json({ jobs: dbJobs, total, page, pages: Math.ceil(total / limit) });
  } catch { /* fall through to demo data */ }

  return NextResponse.json({ jobs: DEMO_JOBS });
}

const jobSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(1).default("See full description on our site."),
  responsibilities: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  experience: z.string().optional(),
  education: z.string().optional(),
  employmentType: z.string().optional(),
  workMode: z.string().optional(),
  location: z.string().min(2),
  category: z.string().optional(),
  deadline: z.string().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});

export async function POST(request) {
  const guard = await requirePermission(PERMISSIONS.manageOwnJobs);
  if (guard.error) return guard.error;
  try {
    const data = jobSchema.parse(await request.json());
    await connectDB();
    const company = await Company.findOne({ owner: guard.session.userId });
    if (!company) return NextResponse.json({ error: "Create a company profile first." }, { status: 400 });
    const job = await Job.create({ ...data, company: company._id, deadline: data.deadline ? new Date(data.deadline) : undefined });
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.issues?.[0]?.message || "Unable to create job." }, { status: 400 });
  }
}
