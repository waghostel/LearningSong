const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Generate timestamp
const now = new Date();
const timestamp = now.toISOString()
  .replace(/[-:]/g, '')
  .replace('T', '-')
  .split('.')[0]
  .slice(0, 15);

const tempDir = path.join(__dirname, '..', 'temp');
const reportDir = path.join(__dirname, '..', 'report', 'frontend-test');

// Ensure directories exist
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const jsonOutputFile = path.join(tempDir, `frontend-test-raw-${timestamp}.json`);
const textOutputFile = path.join(tempDir, `frontend-test-output-${timestamp}.txt`);

console.log('Running frontend tests...\n');

try {
  // Run tests and capture output
  const output = execSync(
    'pnpm test --ci --coverage --json',
    {
      cwd: path.join(__dirname, '..', 'frontend'),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }
  );
  
  // Save outputs
  fs.writeFileSync(textOutputFile, output);
  
  // Try to extract JSON from output
  try {
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      fs.writeFileSync(jsonOutputFile, jsonMatch[0]);
    }
  } catch (e) {
    console.warn('Could not extract JSON from test output');
  }
  
  console.log('✅ Tests completed successfully\n');
  
} catch (error) {
  // Tests failed, but we still want to generate a report
  const output = error.stdout || error.stderr || error.message;
  fs.writeFileSync(textOutputFile, output);
  
  console.log('⚠️  Some tests failed\n');
}

// Generate the report
console.log('Generating report...');
try {
  execSync(`node "${path.join(__dirname, 'generate-frontend-test-report.js')}"`, {
    stdio: 'inherit'
  });
  console.log('\n✅ Frontend test report generation complete!');
} catch (e) {
  console.error('Error generating report:', e.message);
  process.exit(1);
}
