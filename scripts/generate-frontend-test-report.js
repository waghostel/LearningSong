const fs = require('fs');
const path = require('path');

// Find the most recent test output files
const tempDir = path.join(__dirname, '..', 'temp');
const reportDir = path.join(__dirname, '..', 'report', 'frontend-test');

// Ensure report directory exists
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

// Find most recent frontend test files
const files = fs.readdirSync(tempDir);
const testJsonFiles = files.filter(f => f.startsWith('frontend-test-raw-') && f.endsWith('.json'));
const testOutputFiles = files.filter(f => f.startsWith('frontend-test-output-') && f.endsWith('.txt'));

if (testJsonFiles.length === 0 && testOutputFiles.length === 0) {
  console.error('Error: No test output files found');
  process.exit(1);
}

// Get the most recent files
const latestJsonFile = testJsonFiles.sort().reverse()[0];
const latestOutputFile = testOutputFiles.sort().reverse()[0];

// Extract timestamp from filename
const timestamp = latestJsonFile ? latestJsonFile.match(/frontend-test-raw-(\d{8}-\d{6})/)[1] : 
                  latestOutputFile.match(/frontend-test-output-(\d{8}-\d{6})/)[1];

const reportPath = path.join(reportDir, `frontend-test-report-${timestamp}.md`);

let testResults = null;
let textOutput = '';

// Try to read JSON output
if (latestJsonFile) {
  try {
    const jsonPath = path.join(tempDir, latestJsonFile);
    const data = fs.readFileSync(jsonPath, 'utf8');
    testResults = JSON.parse(data);
  } catch (e) {
    console.warn('Could not parse JSON output:', e.message);
  }
}

// Read text output
if (latestOutputFile) {
  try {
    const textPath = path.join(tempDir, latestOutputFile);
    textOutput = fs.readFileSync(textPath, 'utf8');
    
    // Try to extract JSON from text output if we don't have it yet
    if (!testResults) {
      const jsonMatch = textOutput.match(/\{"numFailedTestSuites"[\s\S]*?\}(?=\n|$)/);
      if (jsonMatch) {
        try {
          testResults = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.warn('Could not parse embedded JSON:', e.message);
        }
      }
    }
  } catch (e) {
    console.warn('Could not read text output:', e.message);
  }
}

// Generate report
let report = `# Frontend Test Report - ${new Date().toISOString()}\n\n`;

// Parse results
if (testResults) {
  // Jest JSON format
  const { 
    numTotalTests, 
    numPassedTests, 
    numFailedTests, 
    numPendingTests,
    numTotalTestSuites,
    numPassedTestSuites,
    numFailedTestSuites,
    testResults: suites 
  } = testResults;
  
  report += `## Summary\n\n`;
  report += `- Total Test Suites: ${numTotalTestSuites || 0} (${numPassedTestSuites || 0} passed, ${numFailedTestSuites || 0} failed)\n`;
  report += `- Total Tests: ${numTotalTests || 0}\n`;
  report += `- Passed: ${numPassedTests || 0} ✅\n`;
  report += `- Failed: ${numFailedTests || 0} ❌\n`;
  report += `- Pending: ${numPendingTests || 0} ⏸️\n`;
  report += `\n`;
  
  // Organize failures by severity
  const failedSuites = suites ? suites.filter(suite => {
    return suite.assertionResults && suite.assertionResults.some(test => test.status === 'failed');
  }) : [];
  
  if (failedSuites.length > 0) {
    report += `## 🚨 URGENT - Failed Tests (${numFailedTests} failures)\n\n`;
    
    failedSuites.forEach(suite => {
      const suiteName = suite.name.replace(/\\/g, '/');
      const failedTests = suite.assertionResults.filter(test => test.status === 'failed');
      
      report += `### ${suiteName}\n\n`;
      report += `**Failed:** ${failedTests.length} test${failedTests.length > 1 ? 's' : ''}\n\n`;
      
      failedTests.forEach(test => {
        const fullTestName = test.ancestorTitles.length > 0 
          ? `${test.ancestorTitles.join(' › ')} › ${test.title}`
          : test.title;
        
        report += `- [ ] ❌ **${fullTestName}**\n`;
        
        if (test.failureMessages && test.failureMessages.length > 0) {
          // Get first error message and clean it up
          const errorMsg = test.failureMessages[0];
          const lines = errorMsg.split('\n').slice(0, 5); // First 5 lines
          lines.forEach(line => {
            if (line.trim()) {
              report += `  ${line.trim()}\n`;
            }
          });
        }
        report += `\n`;
      });
    });
  }
  
  if (numFailedTests === 0) {
    report += `## ✅ All Tests Passed!\n\n`;
    report += `All ${numTotalTests} tests in ${numTotalTestSuites} test suites passed successfully.\n`;
  }
  
} else if (textOutput) {
  // Parse text output as fallback
  report += `## Summary\n\n`;
  report += `Test output captured from Jest.\n\n`;
  
  // Try to extract basic info from text
  const passMatch = textOutput.match(/Tests:\s+(\d+)\s+passed/);
  const failMatch = textOutput.match(/(\d+)\s+failed/);
  const totalMatch = textOutput.match(/(\d+)\s+total/);
  
  if (totalMatch) report += `- Total Tests: ${totalMatch[1]}\n`;
  if (passMatch) report += `- Passed: ${passMatch[1]}\n`;
  if (failMatch) report += `- Failed: ${failMatch[1]}\n`;
  
  report += `\n`;
  
  if (failMatch && parseInt(failMatch[1]) > 0) {
    report += `## 🚨 URGENT - Test Failures Detected\n\n`;
    report += `Please review the full test output for details.\n\n`;
    report += `\`\`\`\n${textOutput.slice(0, 2000)}\n\`\`\`\n`;
  } else {
    report += `## ✅ All Tests Passed!\n\n`;
  }
} else {
  report += `## ⚠️ Unable to Parse Test Results\n\n`;
  report += `No valid test output found. Please check the test execution.\n`;
}

fs.writeFileSync(reportPath, report);
console.log(`Report generated: ${reportPath}`);
