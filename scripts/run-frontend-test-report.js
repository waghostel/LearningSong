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

let testsPassed = true;
let combinedOutput = '';

try {
  // Run tests and capture output
  // Jest with --json outputs JSON to stdout, but when tests fail it exits non-zero
  const output = execSync(
    'pnpm test --ci --coverage --json 2>&1',
    {
      cwd: path.join(__dirname, '..', 'frontend'),
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large test outputs
    }
  );
  
  combinedOutput = output;
  console.log('✅ Tests completed successfully\n');
  
} catch (error) {
  // Tests failed, but we still want to generate a report
  // Combine stdout and stderr - Jest outputs JSON to stdout even on failure
  testsPassed = false;
  combinedOutput = (error.stdout || '') + (error.stderr || '');
  
  if (!combinedOutput) {
    combinedOutput = error.message || 'Unknown error';
  }
  
  console.log('⚠️  Some tests failed\n');
}

// Save the combined output
fs.writeFileSync(textOutputFile, combinedOutput);

// Try to extract JSON from output (Jest outputs a single JSON object)
try {
  // Look for Jest JSON output - it starts with {"numFailedTestSuites" or similar
  const jsonMatch = combinedOutput.match(/\{[\s\S]*"numFailedTestSuites"[\s\S]*\}/);
  if (jsonMatch) {
    // Validate it's proper JSON before saving
    JSON.parse(jsonMatch[0]);
    fs.writeFileSync(jsonOutputFile, jsonMatch[0]);
    console.log('📊 JSON test results extracted\n');
  }
} catch (e) {
  console.warn('Could not extract JSON from test output:', e.message);
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
