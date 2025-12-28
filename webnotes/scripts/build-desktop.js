const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// 1. Setup Paths
const root = process.cwd();
const apiPath = path.join(root, "src/app/api");
const hiddenPath = path.join(root, "src/app/_api_hidden");

// Helper to check if API exists
const hasApi = fs.existsSync(apiPath);

console.log("📦 PREPARING DESKTOP BUILD...");

try {
  // 2. Hide the API folder
  if (hasApi) {
    console.log("🙈 Hiding API routes...");
    fs.renameSync(apiPath, hiddenPath);
  }

  // 3. Run the Build Command
  // We include NO_STRIP=true for your Arch Linux setup
  // We include NEXT_PUBLIC_IS_DESKTOP=true for your next.config.ts
  console.log("🚀 Compiling Rust & React...");

  // Note: We use 'inherit' so you see the logs in your terminal
  execSync(
    "cross-env NEXT_PUBLIC_IS_DESKTOP=true NO_STRIP=true bun run tauri build",
    {
      stdio: "inherit",
    }
  );

  console.log("✅ BUILD SUCCESSFUL!");
} catch (error) {
  console.error("❌ BUILD FAILED.");
  // We don't exit yet, we must restore the folder first
  process.exitCode = 1;
} finally {
  // 4. Restore the API folder (The Safety Net)
  if (fs.existsSync(hiddenPath)) {
    console.log("👀 Restoring API routes...");
    fs.renameSync(hiddenPath, apiPath);
    console.log("✨ Project restored.");
  }
}
