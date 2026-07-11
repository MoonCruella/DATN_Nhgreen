import { createClient } from "redis";

const buildRedisUrl = () => {
  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = process.env.REDIS_PORT || "6379";
  const username = process.env.REDIS_USERNAME || "";
  const password = process.env.REDIS_PASSWORD || "";
  const db = process.env.REDIS_DB || "0";

  const credentials = password
    ? `${username ? encodeURIComponent(username) : "default"}:${encodeURIComponent(password)}@`
    : "";

  return `redis://${credentials}${host}:${port}/${db}`;
};

const redisClient = createClient({
  url: buildRedisUrl(),
});

redisClient.on("error", (err) => console.error("Redis error:", err));

// Connect Redis once when this module is loaded.
(async () => {
  try {
    await redisClient.connect();
    console.log("Redis connected successfully");
  } catch (error) {
    console.error("Redis connection error:", error);
  }
})();

export default redisClient;
