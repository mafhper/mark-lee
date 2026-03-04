import { copyFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const distDir = path.resolve(process.cwd(), "dist");
const source = path.join(distDir, "index.html");
const target = path.join(distDir, "404.html");

await copyFile(source, target);
console.log("Copied dist/index.html -> dist/404.html");
