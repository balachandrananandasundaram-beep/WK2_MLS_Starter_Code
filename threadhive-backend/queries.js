import mongoose from 'mongoose';
import dotenv from 'dotenv';

import User from "./models/User.js"
import Subreddit from './models/Subreddit.js';
import Thread from './models/Thread.js';

// 1. Find user by email diana@example.com
async function query1() {
    // Write code for Query 1 here
    const user = await User.findOne({ email: "diana@example.com" });
    console.log("Query 1: User by email\n", user);
}

// 2. Get threads in a subreddit programming
async function query2() {
    // Write code for Query 2 here
  const subreddit = await Subreddit.findOne({ name: "programming" });
  const threads = await Thread.find({ subreddit: subreddit._id }).populate(
    "author",
  );
  console.log("Query 2: Threads in subreddit\n", threads);    
}

// 3. Threads posted by a specific user Ethan
async function query3() {
    // Write code for Query 3 here
    // Step 1: Find Ethan
  const user = await User.findOne({ name: "Ethan" });

  if (!user) {
    console.log("User not found");
    return;
  }

  // Step 2: Find threads authored by Ethan
  const threads = await Thread.find({ author: user._id }).populate("subreddit");

  console.log("Query 3: Threads posted by Ethan\n", threads);  
}

// 4. Users who posted threads
async function query4() {
    // Write code for Query 4 here  
  console.log("Query 4: Users who posted threads");

  // Step 1: Get distinct author IDs from threads
  const authorIds = await Thread.distinct("author");

  // Step 2: Fetch user documents for those IDs
  const users = await User.find({ _id: { $in: authorIds } });

  console.log("Users who posted threads:\n", users); 
}

// 5. Get threads with at least 2 upvotes
//async function query5() {
//  console.log("Query 5: Threads with at least 2 upvotes");

 // const threads = await Thread.find({ upvotes: { $gte: 2 } })
  //  .populate("author")
  //  .populate("subreddit");

//  console.log("Threads with >= 2 upvotes:\n", threads);
//}

// 5. Threads with at least 2 upvotes
async function query5() {
  const threads = await Thread.find({ upvotes: { $gte: 2 } });
  console.log("Query 5: Threads with at least 2 upvotes\n", threads);
}

// 6. Threads created on or after January 1, 2024
//async function query6() {
//  console.log("Query 6: Threads created on or after Jan 1, 2024");

//  const threads = await Thread.find({
//    createdAt: { $gte: new Date("2024-01-01") }
  //})
 //   .populate("author")
//    .populate("subreddit");

//  console.log("Threads created on or after Jan 1, 2024:\n", threads);
//}

// 6. Threads created on or after January 1, 2024
async function query6() {
  const threads = await Thread.find({
    createdAt: { $gte: new Date("2024-01-01") },
  });
  console.log("Query 6: Threads created after Jan 2024\n", threads);
}

// 7. Add a new thread in subreddit devops by Ethan
async function query7() {
  console.log("Query 7: Add new thread");

  // Step 1: Find Ethan
  const user = await User.findOne({ name: "Ethan" });
  if (!user) {
    console.log("User Ethan not found");
    return;
  }

  // Step 2: Find devops subreddit
  const subreddit = await Subreddit.findOne({ name: "devops" });
  if (!subreddit) {
    console.log("Subreddit devops not found");
    return;
  }

  // Step 3: Create new thread
  const newThread = await Thread.create({
    title: "Docker and kubernetes?",
    content: "Which one is better for large-scale apps?",
    author: user._id,
    subreddit: subreddit._id,
    upvotes: 0,
    downvotes: 0,
    voteCount: 0,
    createdAt: new Date()
  });

  console.log("New thread created for Ethan:\n", newThread);
}
// 8. Update thread title Docker and kubernetes?
async function query8() {
  const thread = await Thread.findOne({ title: "Docker and kubernetes?" });
  if (!thread) {
    console.log("Thread not found.");
    return;
  }
  thread.title = "How to start learning Node.js in 2025?";
  await thread.save();
  console.log("Query 8: Updated thread title\n", thread);
}

// 9. Delete all threads by Ethan
async function query9() {
  console.log("Query 9: Delete all threads by Ethan");

  // Step 1: Find Ethan
  const user = await User.findOne({ name: "Ethan" });
  if (!user) {
    console.log("User Ethan not found.");
    return;
  }

  // Step 2: Count threads authored by Ethan
  const count = await Thread.countDocuments({ author: user._id });
  console.log(`Threads by Ethan: ${count}`);

  if (count === 0) {
    console.log("No threads to delete.");
    return;
  }

  // Step 3: Delete all threads by Ethan
  const result = await Thread.deleteMany({ author: user._id });

  console.log(`Deleted ${result.deletedCount} thread(s) by Ethan.`);
}

// 10. Delete all subreddits and their associated threads
async function query10() {
  console.log("Query 10: Delete all subreddits and their associated threads");

  // Step 1: Get all subreddit IDs
  const subredditIds = await Subreddit.find().distinct("_id");

  console.log(`Total subreddits found: ${subredditIds.length}`);

  if (subredditIds.length === 0) {
    console.log("No subreddits to delete.");
    return;
  }

  // Step 2: Delete all threads belonging to these subreddits
  const threadResult = await Thread.deleteMany({
    subreddit: { $in: subredditIds }
  });

  console.log(`Deleted ${threadResult.deletedCount} associated thread(s).`);

  // Step 3: Delete all subreddits
  const subredditResult = await Subreddit.deleteMany({});

  console.log(`Deleted ${subredditResult.deletedCount} subreddit(s).`);
}

// 11. Retrieve user IDs and thread counts
async function query11() {
  console.log("Query 11: User IDs with number of threads posted");

  const results = await Thread.aggregate([
    {
      $group: {
        _id: "$author",        // group by author ID
        threadCount: { $sum: 1 } // count threads
      }
    }
  ]);

  console.log("Users and their thread counts:\n", results);
}

// 12. Find the author ID and thread count for the user who posted the most threads
async function query12() {
  console.log("Query 12: User with the most threads");

  const result = await Thread.aggregate([
    {
      $group: {
        _id: "$author",          // group by author ID
        threadCount: { $sum: 1 } // count threads
      }
    },
    {
      $sort: { threadCount: -1 } // highest count first
    },
    {
      $limit: 1                  // only the top user
    }
  ]);

  console.log("Most active user:", result);
}

// 12. Find the author ID and thread count for the user who posted the most threads
async function query13() {
  const result = await Thread.aggregate([
    { $group: { _id: "$author", threadCount: { $sum: 1 } } },
    { $sort: { threadCount: -1 } },
    { $limit: 1 },
  ]);
  console.log("Query 13: Top author by thread count\n", result);
}

async function runQueries() {
    // Uncomment the query you want to run
    // await query1();
     //await query2();
     //await query3();
     //await query4();
     //await query5();
    //await query6();
    //await query7();
    //await query8();
    //await query9();
    //await query10();
    //await query11();
    //await query12();
    await query13();



}  

async function main() {
  try {
    dotenv.config();
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");
    await runQueries();
  } catch (err) {
    console.error("DB connection failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from DB");
  }
}

main();