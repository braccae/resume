const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

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

const resumeJsonPath = path.resolve(process.cwd(), 'resume.json');
const resume = JSON.parse(fs.readFileSync(resumeJsonPath, 'utf8'));

console.log(`Found ${themePackages.length} theme(s): ${themePackages.map((t) => t.replace(/^jsonresume-theme-/, '')).join(', ')}`);

const { buildTheme } = require('./build-themes');

async function ensureThemeBuilt(pkgName) {
  const themeDir = path.resolve(process.cwd(), 'node_modules', pkgName);
  const distFile = path.join(themeDir, 'dist', 'index.js');
  const indexJsx = path.join(themeDir, 'index.jsx');
  if (fs.existsSync(indexJsx)) {
    let needsBuild = !fs.existsSync(distFile);
    if (!needsBuild) {
      try {
        const stat = fs.statSync(distFile);
        if (stat.size < 150000) {
          needsBuild = true;
        }
      } catch (e) {
        needsBuild = true;
      }
    }
    if (needsBuild) {
      await buildTheme(pkgName);
    }
  }
}

async function loadThemeModule(pkgName) {
  await ensureThemeBuilt(pkgName);
  const themeDir = path.resolve(process.cwd(), 'node_modules', pkgName);
  const distFile = path.join(themeDir, 'dist', 'index.js');

  if (fs.existsSync(distFile)) {
    try {
      const mod = await import(`${pkgName}/dist`);
      return mod.default || mod;
    } catch (e) {
      // fallback to require / standard import
    }
  }

  try {
    return require(pkgName);
  } catch (errRequire) {
    try {
      const mod = await import(pkgName);
      return mod.default || mod;
    } catch (errImport) {
      const mod = await import(`${pkgName}/dist`);
      return mod.default || mod;
    }
  }
}

async function exportAll() {
  const puppeteerLaunchArgs = ['--no-sandbox', '--disable-setuid-sandbox'];

  const browser = await puppeteer.launch({
    args: puppeteerLaunchArgs,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  });

  const page = await browser.newPage();
  let hasError = false;

  for (const pkgName of themePackages) {
    const themeName = pkgName.replace(/^jsonresume-theme-/, '');
    const outputFile = path.join('output', `resume-${themeName}.pdf`);
    console.log(`\nExporting ${themeName} -> ${outputFile}...`);

    try {
      const themeModule = await loadThemeModule(pkgName);
      const renderFn =
        themeModule.render ||
        themeModule.default?.render ||
        (typeof themeModule === 'function' ? themeModule : null);

      if (typeof renderFn !== 'function') {
        throw new Error(`Theme ${pkgName} does not export a render function`);
      }

      const html = await renderFn(resume);
      const themePkg = themeModule.default || themeModule;

      await page.emulateMediaType(themePkg.pdfRenderOptions?.mediaType || 'screen');
      await page.setContent(html, { waitUntil: 'networkidle0' });

      if (themePkg.pdfViewport) {
        await page.setViewport(themePkg.pdfViewport);
      }

      await page.pdf({
        path: outputFile,
        format: 'Letter',
        printBackground: true,
        ...themePkg.pdfRenderOptions,
      });

      console.log(`Done! Find your new .pdf resume at:\n ${path.resolve(process.cwd(), outputFile)}`);
    } catch (error) {
      console.error(`Error exporting resume with theme "${themeName}":`, error.message);
      hasError = true;
    }
  }

  await browser.close();

  if (hasError) {
    process.exit(1);
  }

  console.log('\nAll resumes exported successfully!');
}

exportAll().catch((err) => {
  console.error('Fatal error during resume export:', err);
  process.exit(1);
});
