import Thread from "./models/Thread.js";
import Subreddit from "./models/Subreddit.js";
import User from "./models/User.js";

await Thread.insertMany([...]);
await Subreddit.insertMany([...]);

console.log(await Thread.countDocuments());
console.log(await Subreddit.countDocuments()); 