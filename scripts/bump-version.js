const fs = require("fs");

const type = process.argv[2] || "patch";

function bumpVersion(version, type) {
  const parts = version.split(".").map(Number);
  if (type === "major") {
    parts[0]++;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === "minor") {
    parts[1]++;
    parts[2] = 0;
  } else {
    parts[2]++;
  }
  return parts.join(".");
}

const rootPkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
const nextVersion = bumpVersion(rootPkg.version, type);

const pkgPaths = [
  "./package.json",
  "./packages/core/package.json",
  "./packages/react/package.json",
];

pkgPaths.forEach((p) => {
  const data = JSON.parse(fs.readFileSync(p, "utf-8"));
  data.version = nextVersion;
  
  // Update internal monorepo dependency automatically
  if (data.dependencies && data.dependencies["virtual-engine"]) {
    data.dependencies["virtual-engine"] = `^${nextVersion}`;
  }
  
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
});

console.log(`🚀 Bumped all monorepo packages to version v${nextVersion}`);
