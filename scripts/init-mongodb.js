const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

function loadEnvironment() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const collections = ["users", "companies", "jobs", "applications", "savedjobs", "notifications", "reviews", "messages", "skills", "categories"];

async function initialize() {
  loadEnvironment();
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing. Add it to .env or .env.local first.");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const database = mongoose.connection.db;
  const existing = new Set((await database.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name));
  const created = [];
  for (const name of collections) {
    if (!existing.has(name)) { await database.createCollection(name); created.push(name); }
  }
  await database.collection("users").createIndex({ email: 1 }, { unique: true });
  await database.collection("applications").createIndex({ job: 1, candidate: 1 }, { unique: true });
  await database.collection("savedjobs").createIndex({ candidate: 1, job: 1 }, { unique: true });
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@talentloop.dev").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";
  const existingAdmin = await database.collection("users").findOne({ email: adminEmail });
  if (!existingAdmin) {
    await database.collection("users").insertOne({
      name: process.env.ADMIN_NAME || "Platform Admin",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "admin",
      verified: true,
      suspended: false,
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      languages: [],
      portfolio: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`Created admin account: ${adminEmail}`);
  } else {
    console.log(`Admin account already exists: ${adminEmail}`);
  }
  console.log(`MongoDB initialized. Created: ${created.length ? created.join(", ") : "none (all collections already exist)"}`);
  console.log(`Verified collections: ${collections.join(", ")}`);
  await mongoose.disconnect();
}

initialize().catch(async (error) => { console.error(`MongoDB initialization failed: ${error.message}`); await mongoose.disconnect(); process.exit(1); });
