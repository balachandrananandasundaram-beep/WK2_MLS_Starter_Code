import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/User.js";
import Subreddit from "../models/Subreddit.js";
import Thread from "../models/Thread.js";

dotenv.config();

const TEST_RUN_ID = `crud-${Date.now()}`;
const createdIds = {
  users: [],
  subreddits: [],
  threads: [],
};

const state = {
  seededUser: null,
  seededSubreddit: null,
  seededThread: null,
  user: null,
  subreddit: null,
  thread: null,
  secondaryThread: null,
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    return true;
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(`  ${error.message}`);
    return false;
  }
}

async function cleanup() {
  const threadIds = createdIds.threads.filter(Boolean);
  const subredditIds = createdIds.subreddits.filter(Boolean);
  const userIds = createdIds.users.filter(Boolean);

  if (threadIds.length > 0) {
    await Thread.deleteMany({ _id: { $in: threadIds } });
  }

  if (subredditIds.length > 0) {
    await Subreddit.deleteMany({ _id: { $in: subredditIds } });
  }

  if (userIds.length > 0) {
    await User.deleteMany({ _id: { $in: userIds } });
  }
}

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  assert(mongoUri, "MONGODB_URI is not set in the environment or .env file.");

  const results = [];

  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const tests = [
      {
        name: "01. Seeded users collection is reachable",
        fn: async () => {
          const userCount = await User.countDocuments();
          assert(userCount >= 1, `Expected at least 1 user, found ${userCount}`);

          state.seededUser = await User.findOne().sort({ createdAt: 1, _id: 1 });
          assert(state.seededUser, "Could not load an existing user document");
        },
      },
      {
        name: "02. Seeded subreddits collection is reachable",
        fn: async () => {
          const subredditCount = await Subreddit.countDocuments();
          assert(
            subredditCount >= 1,
            `Expected at least 1 subreddit, found ${subredditCount}`
          );

          state.seededSubreddit = await Subreddit.findOne().sort({ createdAt: 1, _id: 1 });
          assert(state.seededSubreddit, "Could not load an existing subreddit document");
        },
      },
      {
        name: "03. Seeded threads collection is reachable",
        fn: async () => {
          const threadCount = await Thread.countDocuments();
          assert(threadCount >= 1, `Expected at least 1 thread, found ${threadCount}`);

          state.seededThread = await Thread.findOne().sort({ createdAt: 1, _id: 1 });
          assert(state.seededThread, "Could not load an existing thread document");
        },
      },
      {
        name: "04. Read an existing user by email",
        fn: async () => {
          assert(state.seededUser, "Existing user was not loaded in prior tests");

          const seededUser = await User.findOne({ email: state.seededUser.email });
          assert(seededUser, `User ${state.seededUser.email} was not found by email`);
          assert(
            seededUser._id.toString() === state.seededUser._id.toString(),
            "User lookup by email returned an unexpected document"
          );
        },
      },
      {
        name: "05. Read an existing subreddit by name",
        fn: async () => {
          assert(state.seededSubreddit, "Existing subreddit was not loaded in prior tests");

          const subreddit = await Subreddit.findOne({ name: state.seededSubreddit.name });
          assert(subreddit, `Subreddit ${state.seededSubreddit.name} was not found by name`);
          assert(
            subreddit._id.toString() === state.seededSubreddit._id.toString(),
            "Subreddit lookup by name returned an unexpected document"
          );
        },
      },
      {
        name: "06. Read threads for an existing subreddit",
        fn: async () => {
          assert(state.seededSubreddit, "Existing subreddit was not loaded in prior tests");

          const threads = await Thread.find({ subreddit: state.seededSubreddit._id });
          assert(
            threads.length >= 1,
            `Expected at least 1 thread for subreddit ${state.seededSubreddit.name}, found ${threads.length}`
          );
        },
      },
      {
        name: "07. Create a user document",
        fn: async () => {
          const user = await User.create({
            name: "CRUD Test User",
            email: `${TEST_RUN_ID}@example.com`,
            password: "Password@123",
            createdAt: new Date(),
          });

          state.user = user;
          createdIds.users.push(user._id);

          assert(user._id, "Created user is missing an _id");
          assert(user.email === `${TEST_RUN_ID}@example.com`, "Created user email mismatch");
        },
      },
      {
        name: "08. Read the created user back from the database",
        fn: async () => {
          assert(state.user, "Created user is not available in test state");
          const savedUser = await User.findById(state.user._id);
          assert(savedUser, "Created user could not be read back");
          assert(savedUser.name === "CRUD Test User", "Created user name mismatch");
        },
      },
      {
        name: "09. Update the created user",
        fn: async () => {
          assert(state.user, "Created user is not available in test state");
          const updatedUser = await User.findByIdAndUpdate(
            state.user._id,
            { name: "CRUD Updated User" },
            { new: true }
          );

          assert(updatedUser, "Updated user was not returned");
          assert(updatedUser.name === "CRUD Updated User", "User update did not persist");
          state.user = updatedUser;
        },
      },
      {
        name: "10. Create a subreddit owned by the created user",
        fn: async () => {
          assert(state.user, "Created user is required before subreddit creation");

          const subreddit = await Subreddit.create({
            name: `${TEST_RUN_ID}-subreddit`,
            description: "Temporary subreddit for CRUD validation",
            author: state.user._id,
            createdAt: new Date(),
          });

          state.subreddit = subreddit;
          createdIds.subreddits.push(subreddit._id);

          assert(subreddit._id, "Created subreddit is missing an _id");
        },
      },
      {
        name: "11. Read the created subreddit with populated author",
        fn: async () => {
          assert(state.subreddit, "Created subreddit is not available in test state");
          const subreddit = await Subreddit.findById(state.subreddit._id).populate("author");
          assert(subreddit, "Created subreddit could not be read back");
          assert(subreddit.author.email === `${TEST_RUN_ID}@example.com`, "Subreddit author population failed");
        },
      },
      {
        name: "12. Update the created subreddit description",
        fn: async () => {
          assert(state.subreddit, "Created subreddit is not available in test state");
          const updatedSubreddit = await Subreddit.findByIdAndUpdate(
            state.subreddit._id,
            { description: "Updated CRUD subreddit description" },
            { new: true }
          );

          assert(updatedSubreddit, "Updated subreddit was not returned");
          assert(
            updatedSubreddit.description === "Updated CRUD subreddit description",
            "Subreddit update did not persist"
          );
          state.subreddit = updatedSubreddit;
        },
      },
      {
        name: "13. Create a thread in the created subreddit",
        fn: async () => {
          assert(state.user && state.subreddit, "User and subreddit are required before thread creation");

          const thread = await Thread.create({
            title: `${TEST_RUN_ID} thread title`,
            content: "Temporary thread content for CRUD validation",
            author: state.user._id,
            subreddit: state.subreddit._id,
            upvotes: 5,
            downvotes: 1,
            voteCount: 4,
            createdAt: new Date(),
          });

          state.thread = thread;
          createdIds.threads.push(thread._id);

          assert(thread._id, "Created thread is missing an _id");
        },
      },
      {
        name: "14. Read the created thread with populated relations",
        fn: async () => {
          assert(state.thread, "Created thread is not available in test state");
          const thread = await Thread.findById(state.thread._id)
            .populate("author")
            .populate("subreddit");

          assert(thread, "Created thread could not be read back");
          assert(thread.author.name === "CRUD Updated User", "Thread author population failed");
          assert(
            thread.subreddit.name === `${TEST_RUN_ID}-subreddit`,
            "Thread subreddit population failed"
          );
        },
      },
      {
        name: "15. Update the created thread vote counters",
        fn: async () => {
          assert(state.thread, "Created thread is not available in test state");
          const updatedThread = await Thread.findByIdAndUpdate(
            state.thread._id,
            { upvotes: 8, downvotes: 2, voteCount: 6 },
            { new: true }
          );

          assert(updatedThread, "Updated thread was not returned");
          assert(updatedThread.voteCount === 6, "Thread voteCount update did not persist");
          state.thread = updatedThread;
        },
      },
      {
        name: "16. Query threads created by the test user",
        fn: async () => {
          assert(state.user, "Created user is not available in test state");
          const userThreads = await Thread.find({ author: state.user._id });
          assert(userThreads.length >= 1, "Expected at least one thread for the test user");
        },
      },
      {
        name: "17. Create a second thread and verify counting",
        fn: async () => {
          assert(state.user && state.subreddit, "User and subreddit are required before thread creation");

          const secondaryThread = await Thread.create({
            title: `${TEST_RUN_ID} second thread`,
            content: "Second temporary thread content",
            author: state.user._id,
            subreddit: state.subreddit._id,
            upvotes: 1,
            downvotes: 0,
            voteCount: 1,
            createdAt: new Date(),
          });

          state.secondaryThread = secondaryThread;
          createdIds.threads.push(secondaryThread._id);

          const threadCount = await Thread.countDocuments({ author: state.user._id });
          assert(threadCount >= 2, `Expected at least 2 threads for the test user, found ${threadCount}`);
        },
      },
      {
        name: "18. Delete one created thread",
        fn: async () => {
          assert(state.secondaryThread, "Secondary thread is not available in test state");
          const deletedThread = await Thread.findByIdAndDelete(state.secondaryThread._id);
          assert(deletedThread, "Secondary thread was not deleted");

          const stillExists = await Thread.exists({ _id: state.secondaryThread._id });
          assert(!stillExists, "Secondary thread still exists after deletion");

          createdIds.threads = createdIds.threads.filter(
            (threadId) => threadId.toString() !== state.secondaryThread._id.toString()
          );
          state.secondaryThread = null;
        },
      },
      {
        name: "19. Delete the remaining created thread and subreddit in order",
        fn: async () => {
          assert(state.thread && state.subreddit, "Primary thread and subreddit must exist before deletion");

          const deletedThread = await Thread.findByIdAndDelete(state.thread._id);
          assert(deletedThread, "Primary thread was not deleted");

          createdIds.threads = createdIds.threads.filter(
            (threadId) => threadId.toString() !== state.thread._id.toString()
          );
          state.thread = null;

          const deletedSubreddit = await Subreddit.findByIdAndDelete(state.subreddit._id);
          assert(deletedSubreddit, "Created subreddit was not deleted");

          const subredditStillExists = await Subreddit.exists({ _id: deletedSubreddit._id });
          assert(!subredditStillExists, "Subreddit still exists after deletion");

          createdIds.subreddits = createdIds.subreddits.filter(
            (subredditId) => subredditId.toString() !== deletedSubreddit._id.toString()
          );
          state.subreddit = null;
        },
      },
      {
        name: "20. Delete the created user and verify cleanup",
        fn: async () => {
          assert(state.user, "Created user is not available in test state");
          const deletedUser = await User.findByIdAndDelete(state.user._id);
          assert(deletedUser, "Created user was not deleted");

          const userStillExists = await User.exists({ _id: deletedUser._id });
          assert(!userStillExists, "User still exists after deletion");

          createdIds.users = createdIds.users.filter(
            (userId) => userId.toString() !== deletedUser._id.toString()
          );
          state.user = null;
        },
      },
    ];

    for (const currentTest of tests) {
      const passed = await test(currentTest.name, currentTest.fn);
      results.push(passed);
    }
  } catch (error) {
    console.error("Fatal error while running CRUD tests:", error.message);
    process.exitCode = 1;
  } finally {
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error("Cleanup failed:", cleanupError.message);
      process.exitCode = 1;
    }

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }

  const passedCount = results.filter(Boolean).length;
  const failedCount = results.length - passedCount;

  console.log(`\nSummary: ${passedCount}/${results.length} tests passed`);

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

run();