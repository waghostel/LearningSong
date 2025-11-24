const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure directories exist
const tempDir = path.join(__dirname, '..', 'temp');
const reportDir = path.join(__dirname, '..', 'report', 'lint-checking');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

// Generate timestamp
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
const tempFile = path.join(tempDir, `eslint-raw-${timestamp}.json`);

console.log('Running ESLint...');

// Run ESLint and save output
try {
  execSync(`cd frontend && pnpm lint:eslint --format json --output-file ${path.relative('frontend', tempFile)} . 2>&1`, {
    stdio: 'inherit'
  });
} catch (error) {
  // ESLint exits with non-zero code when it finds issues, which is expected
  console.log('ESLint completed (issues may have been found)');
}

// Generate the report
console.log('Generating report...');
execSync(`node ${path.join(__dirname, 'generate-eslint-report.js')} ${timestamp}`, {
  stdio: 'inherit'
});

console.log('✅ ESLint report generation complete!');
