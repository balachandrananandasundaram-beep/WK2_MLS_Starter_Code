import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Subreddit from "./models/Subreddit.js";
import Thread from "./models/Thread.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find({});
  console.log("Users:", users);

  const subs = await Subreddit.find({});
  console.log("Subreddits:", subs);

  const threads = await Thread.find({});
  console.log("Threads:", threads);

  await mongoose.disconnect();
}

run();