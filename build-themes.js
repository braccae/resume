const fs = require('fs');
const path = require('path');
const { build } = require('vite');
const react = require('@vitejs/plugin-react');

async function buildTheme(pkgName) {
  const themeDir = path.resolve(process.cwd(), 'node_modules', pkgName);
  const entryFile = path.resolve(themeDir, 'index.jsx');
  const distDir = path.resolve(themeDir, 'dist');

  if (!fs.existsSync(entryFile)) {
    return;
  }

  console.log(`Building Vite SSR bundle for ${pkgName}...`);
  await build({
    root: themeDir,
    plugins: [react()],
    build: {
      ssr: true,
      target: 'node18',
      outDir: distDir,
      emptyOutDir: true,
      minify: false,
      lib: {
        entry: entryFile,
        formats: ['es'],
        fileName: 'index',
      },
      rollupOptions: {
        external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'],
        output: {
          exports: 'named',
        },
      },
    },
    ssr: {
      noExternal: [
        '@jsonresume/core',
        'styled-components',
        '@emotion/is-prop-valid',
        'stylis',
        'shallowequal',
      ],
    },
    configFile: false,
    logLevel: 'warn',
  });
  console.log(`Successfully built bundle for ${pkgName} in ${distDir}`);
}

async function buildAll() {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  const themePackages = Object.keys(allDeps).filter((dep) =>
    dep.startsWith('jsonresume-theme-')
  );

  for (const themePkg of themePackages) {
    const themeDir = path.resolve(process.cwd(), 'node_modules', themePkg);
    const viteConfig = path.join(themeDir, 'vite.config.js');
    const indexJsx = path.join(themeDir, 'index.jsx');

    if (fs.existsSync(viteConfig) || fs.existsSync(indexJsx)) {
      await buildTheme(themePkg);
    }
  }
}

if (require.main === module) {
  buildAll().catch((err) => {
    console.error('Failed to build themes:', err);
    process.exit(1);
  });
}

module.exports = { buildTheme, buildAll };
