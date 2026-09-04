import fs from "fs";
import path from "path";

const clientDir = path.resolve("dist", "client");
const shellHtml = path.join(clientDir, "_shell.html");
const indexHtml = path.join(clientDir, "index.html");
const notFoundHtml = path.join(clientDir, "404.html");
const noJekyll = path.join(clientDir, ".nojekyll");

if (fs.existsSync(shellHtml)) {
  fs.copyFileSync(shellHtml, indexHtml);
  fs.copyFileSync(shellHtml, notFoundHtml);
  console.log("✓ Copied _shell.html to index.html and 404.html");
} else {
  console.warn("Warning: _shell.html not found in dist/client");
}

fs.writeFileSync(noJekyll, "");
console.log("✓ Created .nojekyll in dist/client");
