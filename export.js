const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outputDir = path.resolve(process.cwd(), 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const allDeps = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
};

const themePackages = Object.keys(allDeps).filter((dep) =>
  dep.startsWith('jsonresume-theme-')
);

if (themePackages.length === 0) {
  console.warn('No jsonresume-theme-* packages found in package.json.');
  process.exit(0);
}

console.log(`Found ${themePackages.length} theme(s): ${themePackages.map((t) => t.replace(/^jsonresume-theme-/, '')).join(', ')}`);

let hasError = false;
for (const pkgName of themePackages) {
  const themeName = pkgName.replace(/^jsonresume-theme-/, '');
  const outputFile = path.join('output', `resume-${themeName}.pdf`);
  console.log(`\nExporting ${themeName} -> ${outputFile}...`);
  try {
    execSync(`npx resume-cli export --theme ${themeName} ${outputFile}`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        RESUME_PUPPETEER_NO_SANDBOX: '1',
      },
    });
  } catch (error) {
    console.error(`Error exporting resume with theme "${themeName}":`, error.message);
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
}

console.log('\nAll resumes exported successfully!');
