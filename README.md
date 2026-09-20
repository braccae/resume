# Resume

Personal resume maintained using the [JSON Resume](https://jsonresume.org/) standard.

## Features

- **Multi-theme PDF Export**: Generates PDF resumes across all installed JSON Resume themes into `output/`.
- **Automated CI/CD Release**: Pushing changes to `resume.json` automatically triggers a GitHub Actions workflow that builds all themes and publishes a GitHub release with the PDF artifacts.

## Usage

### Install Dependencies

```bash
npm install
```

### Export Resumes

Export PDFs for every installed theme into the `output/` directory:

```bash
npm run export
```

### Add a New Theme

Install any JSON Resume theme:

```bash
npm install jsonresume-theme-<theme-name>
```

The export script will automatically detect and export it on the next run.
