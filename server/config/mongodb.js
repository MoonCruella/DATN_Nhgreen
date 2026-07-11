import dns from "node:dns/promises";
import mongoose from "mongoose";
import { config } from "./env.js";

const shouldUseExplicitDnsServers = () => {
  if (!config.mongodbUri?.startsWith("mongodb+srv://")) return false;
  if (process.env.MONGODB_DNS_SERVERS) return true;

  const majorNodeVersion = Number(process.versions.node.split(".")[0]);
  return process.platform === "win32" && majorNodeVersion >= 24;
};

const configureMongoDnsResolver = () => {
  if (!shouldUseExplicitDnsServers()) return;

  const servers = (process.env.MONGODB_DNS_SERVERS || "1.1.1.1,8.8.8.8")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  if (servers.length === 0) return;

  dns.setServers(servers);
  console.log(`MongoDB SRV DNS resolver set to: ${servers.join(", ")}`);
};

const connectDB = async () => {
  try {
    configureMongoDnsResolver();

    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB", err);
  }
};
export default connectDB;