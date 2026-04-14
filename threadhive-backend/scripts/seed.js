import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/User.js";
import Subreddit from "../models/Subreddit.js";
import Thread from "../models/Thread.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const dataPaths = {
  users: path.join(projectRoot, "data", "users.json"),
  subreddits: path.join(projectRoot, "data", "subreddits.json"),
  threads: path.join(projectRoot, "data", "threads.json"),
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinLastDays(days) {
  const now = Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;
  const offset = Math.floor(Math.random() * windowMs);
  return new Date(now - offset);
}

function pickRandom(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function validateUniqueIds(collectionName, docs) {
  const ids = docs.map((doc) => doc._id);
  const unique = new Set(ids);
  assert(
    ids.length === unique.size,
    `${collectionName}: duplicate _id values found in JSON data.`
  );
}

function validateNoIdOverlap(users, subreddits, threads) {
  const all = [...users, ...subreddits, ...threads].map((doc) => doc._id);
  const unique = new Set(all);
  assert(
    all.length === unique.size,
    "ObjectId overlap found across collections. Every _id must be globally unique."
  );
}

function prepareUsers(usersData) {
  return usersData.map((u) => ({
    _id: new mongoose.Types.ObjectId(u._id),
    name: u.name,
    email: u.email,
    password: u.password,
    createdAt: randomDateWithinLastDays(60),
  }));
}

function prepareSubreddits(subredditsData, validUserIds) {
  return subredditsData.map((s) => {
    assert(
      validUserIds.has(s.author),
      `Subreddit ${s.name} references missing user author id ${s.author}`
    );

    return {
      _id: new mongoose.Types.ObjectId(s._id),
      name: s.name,
      description: s.description,
      author: new mongoose.Types.ObjectId(s.author),
      createdAt: randomDateWithinLastDays(60),
    };
  });
}

function prepareThreads(threadsData, userIds, validSubredditIds) {
  return threadsData.map((t) => {
    assert(
      validSubredditIds.has(t.subredditId),
      `Thread \"${t.title}\" references missing subreddit id ${t.subredditId}`
    );

    const upvotes = randomInt(0, 500);
    const downvotes = randomInt(0, 200);

    return {
      _id: new mongoose.Types.ObjectId(t._id),
      title: t.title,
      content: t.content,
      author: new mongoose.Types.ObjectId(pickRandom(userIds)),
      subreddit: new mongoose.Types.ObjectId(t.subredditId),
      upvotes,
      downvotes,
      voteCount: upvotes - downvotes,
      createdAt: randomDateWithinLastDays(60),
    };
  });
}

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  assert(mongoUri, "MONGODB_URI is not set in .env");

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");
}

async function clearData() {
  console.log("Clearing existing collections...");
  await Thread.deleteMany({});
  await Subreddit.deleteMany({});
  await User.deleteMany({});
  console.log("Existing data removed");
}

async function seed() {
  console.log("Loading JSON seed files...");
  const [usersData, subredditsData, threadsData] = await Promise.all([
    readJson(dataPaths.users),
    readJson(dataPaths.subreddits),
    readJson(dataPaths.threads),
  ]);

  console.log("Validating ID uniqueness...");
  validateUniqueIds("users", usersData);
  validateUniqueIds("subreddits", subredditsData);
  validateUniqueIds("threads", threadsData);
  validateNoIdOverlap(usersData, subredditsData, threadsData);

  const userIdSet = new Set(usersData.map((u) => u._id));
  const subredditIdSet = new Set(subredditsData.map((s) => s._id));

  console.log("Preparing documents with randomized fields...");
  const users = prepareUsers(usersData);
  const subreddits = prepareSubreddits(subredditsData, userIdSet);
  const threads = prepareThreads(threadsData, [...userIdSet], subredditIdSet);

  console.log("Inserting users...");
  await User.insertMany(users, { ordered: true });
  console.log(`Inserted ${users.length} users`);

  console.log("Inserting subreddits...");
  await Subreddit.insertMany(subreddits, { ordered: true });
  console.log(`Inserted ${subreddits.length} subreddits`);

  console.log("Inserting threads...");
  await Thread.insertMany(threads, { ordered: true });
  console.log(`Inserted ${threads.length} threads`);

  const [userCount, subredditCount, threadCount] = await Promise.all([
    User.countDocuments(),
    Subreddit.countDocuments(),
    Thread.countDocuments(),
  ]);

  console.log("Seed completed successfully");
  console.log(
    `Final counts => users: ${userCount}, subreddits: ${subredditCount}, threads: ${threadCount}`
  );
}

async function run() {
  try {
    await connectDatabase();
    await clearData();
    await seed();
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

run();
