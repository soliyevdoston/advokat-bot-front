#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const serverDir = path.join(projectRoot, ".next", "server");
const chunksDir = path.join(serverDir, "chunks");
const watchMode = process.argv.includes("--watch");

function copyChunkFiles() {
  if (!fs.existsSync(serverDir) || !fs.existsSync(chunksDir)) {
    return 0;
  }

  const files = fs.readdirSync(chunksDir).filter((name) => name.endsWith(".js"));
  let copied = 0;

  for (const file of files) {
    const from = path.join(chunksDir, file);
    const to = path.join(serverDir, file);

    const srcStat = fs.statSync(from);
    const needsCopy = !fs.existsSync(to) || fs.statSync(to).mtimeMs < srcStat.mtimeMs;
    if (!needsCopy) continue;

    fs.copyFileSync(from, to);
    copied += 1;
  }

  return copied;
}

function runOnce(label = "sync") {
  const copied = copyChunkFiles();
  if (copied > 0) {
    console.log(`[fix-next-runtime] ${label}: copied ${copied} chunk file(s)`);
  }
}

if (!watchMode) {
  runOnce("one-shot");
  process.exit(0);
}

runOnce("startup");
setInterval(() => runOnce("watch"), 1000);
