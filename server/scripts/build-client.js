import { cpSync, existsSync, rmSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(serverDir, "..");
const clientDir = path.resolve(repoRoot, "client");
const clientPackagePath = path.join(clientDir, "package.json");
const clientDistPath = path.join(clientDir, "dist");
const serverPublicPath = path.join(serverDir, "public");

const shouldSkip =
  process.env.SKIP_CLIENT_BUILD === "true" ||
  process.env.npm_config_ignore_scripts === "true";

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

if (shouldSkip) {
  console.log("Skipping client build.");
  process.exit(0);
}

if (!existsSync(clientPackagePath)) {
  console.error("Client package not found; cannot build SPA assets.");
  process.exit(1);
}

run("npm", ["install", "--include=dev"], clientDir);
run("npm", ["run", "build"], clientDir);

if (!existsSync(path.join(clientDistPath, "index.html"))) {
  console.error("Client build did not produce dist/index.html.");
  process.exit(1);
}

rmSync(serverPublicPath, { recursive: true, force: true });
cpSync(clientDistPath, serverPublicPath, { recursive: true });
console.log(`Copied client build to ${path.relative(repoRoot, serverPublicPath)}.`);
