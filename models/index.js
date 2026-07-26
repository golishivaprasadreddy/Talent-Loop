import mongoose, { Schema } from "mongoose";

const baseOptions = { timestamps: true };
const UserSchema = new Schema({
  name: { type: String, required: true, trim: true }, email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true }, role: { type: String, enum: ["candidate", "recruiter", "admin"], default: "candidate" },
  avatar: String, about: String, skills: [String], experience: [Schema.Types.Mixed], education: [Schema.Types.Mixed], certifications: [String], languages: [String], portfolio: { github: String, linkedin: String, website: String }, resumeUrl: String, verified: { type: Boolean, default: false }, suspended: { type: Boolean, default: false },
  resetToken: String, resetTokenExpiry: Date
}, baseOptions);

const CompanySchema = new Schema({ owner: { type: Schema.Types.ObjectId, ref: "User", required: true }, name: { type: String, required: true }, logo: String, banner: String, description: String, website: String, industry: String, size: String, headquarters: String, approved: { type: Boolean, default: false }, featured: { type: Boolean, default: false } }, baseOptions);
const CustomQuestionSchema = new Schema({ question: { type: String, required: true }, type: { type: String, enum: ["text", "textarea", "yesno"], default: "text" }, required: { type: Boolean, default: false } }, { _id: true });
const JobSchema = new Schema({ company: { type: Schema.Types.ObjectId, ref: "Company", required: true }, title: { type: String, required: true }, description: String, responsibilities: [String], requirements: [String], skills: [String], preferredSkills: [String], benefits: [String], salaryMin: Number, salaryMax: Number, currency: { type: String, default: "INR" }, experience: String, education: String, employmentType: String, workMode: String, location: String, category: String, deadline: Date, status: { type: String, enum: ["draft", "published", "closed"], default: "draft" }, featured: { type: Boolean, default: false }, views: { type: Number, default: 0 }, customQuestions: [CustomQuestionSchema] }, baseOptions);
const ApplicationSchema = new Schema({ job: { type: Schema.Types.ObjectId, ref: "Job", required: true }, candidate: { type: Schema.Types.ObjectId, ref: "User", required: true }, resumeUrl: String, resumeFileName: String, coverLetter: String, portfolioLink: String, linkedinUrl: String, phone: String, notes: String, answers: [{ questionId: String, question: String, answer: String }], status: { type: String, enum: ["applied", "under_review", "shortlisted", "interview", "offered", "rejected"], default: "applied" } }, baseOptions);
ApplicationSchema.index({ job: 1, candidate: 1 }, { unique: true });
const SavedJobSchema = new Schema({ candidate: { type: Schema.Types.ObjectId, ref: "User", required: true }, job: { type: Schema.Types.ObjectId, ref: "Job", required: true } }, baseOptions); SavedJobSchema.index({ candidate: 1, job: 1 }, { unique: true });
const NotificationSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: "User", required: true }, type: String, title: String, body: String, read: { type: Boolean, default: false }, link: String }, baseOptions);
const ReviewSchema = new Schema({ company: { type: Schema.Types.ObjectId, ref: "Company", required: true }, candidate: { type: Schema.Types.ObjectId, ref: "User", required: true }, rating: { type: Number, min: 1, max: 5 }, pros: String, cons: String, body: String }, baseOptions);
const MessageSchema = new Schema({ conversation: String, sender: { type: Schema.Types.ObjectId, ref: "User", required: true }, recipient: { type: Schema.Types.ObjectId, ref: "User", required: true }, body: String, attachmentUrl: String, readAt: Date }, baseOptions);

const AdminLogSchema = new Schema({ admin: { type: Schema.Types.ObjectId, ref: "User", required: true }, action: { type: String, required: true }, target: String, targetId: Schema.Types.ObjectId, details: Schema.Types.Mixed, ip: String }, baseOptions);

const model = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);
export const User = model("User", UserSchema); export const Company = model("Company", CompanySchema); export const Job = model("Job", JobSchema); export const Application = model("Application", ApplicationSchema); export const SavedJob = model("SavedJob", SavedJobSchema); export const Notification = model("Notification", NotificationSchema); export const Review = model("Review", ReviewSchema); export const Message = model("Message", MessageSchema); export const AdminLog = model("AdminLog", AdminLogSchema);
