import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "..");

// Ensure this script can be run from either repo root or server directory.
dotenv.config({ path: path.join(serverDir, ".env") });

const [{ default: connectDB }, { default: DineInSession }] = await Promise.all([
  import("../config/mongodb.js"),
  import("../models/dinein-session-model.js"),
]);

const isDryRun = process.argv.includes("--dry-run");

const migrate = async () => {
  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB connection is not ready");
  }

  const collection = DineInSession.collection;

  const copyFilter = {
    last_order_id: { $exists: true, $ne: null },
    $or: [{ order_id: { $exists: false } }, { order_id: null }],
  };
  const unsetFilter = {
    $or: [
      { last_order_id: { $exists: true } },
      { branch_id: { $exists: true } },
      { status: { $exists: true } },
      { expires_at: { $exists: true } },
    ],
  };

  const sessionsToCopy = await collection.countDocuments(copyFilter);
  const sessionsToUnset = await collection.countDocuments(unsetFilter);

  console.log("DineInSession migration: last_order_id -> order_id and remove deprecated fields");
  console.log(`Sessions that need order_id copied: ${sessionsToCopy}`);
  console.log(`Sessions that still contain removed fields: ${sessionsToUnset}`);

  if (isDryRun) {
    console.log("Dry run only. No data was changed.");
    return;
  }

  const copyResult = await collection.updateMany(copyFilter, [
    { $set: { order_id: "$last_order_id" } },
  ]);

  const unsetResult = await collection.updateMany(unsetFilter, {
    $unset: { last_order_id: "", branch_id: "", status: "", expires_at: "" },
  });

  console.log(`Copied order_id for ${copyResult.modifiedCount} sessions.`);
  console.log(`Removed deprecated fields from ${unsetResult.modifiedCount} sessions.`);
};

try {
  await migrate();
  console.log("Migration completed successfully.");
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
