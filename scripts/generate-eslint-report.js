const fs = require('fs');
const path = require('path');

// Get timestamp from command line argument
const timestamp = process.argv[2];
if (!timestamp) {
  console.error('Error: Timestamp argument required');
  process.exit(1);
}

const tempFile = path.join('temp', `eslint-raw-${timestamp}.json`);
const reportPath = path.join('report', 'lint-checking', `lint-report-${timestamp}.md`);

let results = [];
try {
  const data = fs.readFileSync(tempFile, 'utf8');
  results = JSON.parse(data);
} catch (e) {
  console.error('Error reading ESLint output:', e.message);
  process.exit(1);
}

const errors = [];
const warnings = [];

results.forEach(file => {
  if (file.errorCount > 0) {
    errors.push(file);
  } else if (file.warningCount > 0) {
    warnings.push(file);
  }
});

let report = `# ESLint Report - ${new Date().toISOString()}\n\n`;
report += `## Summary\n\n`;
report += `- Total Files Checked: ${results.length}\n`;
report += `- Files with Errors: ${errors.length}\n`;
report += `- Files with Warnings: ${warnings.length}\n\n`;

if (errors.length > 0) {
  report += `## 🚨 URGENT - Files with Errors\n\n`;
  errors.forEach(file => {
    report += `### ${file.filePath}\n\n`;
    report += `**Errors:** ${file.errorCount} | **Warnings:** ${file.warningCount}\n\n`;
    file.messages.forEach((msg) => {
      const severity = msg.severity === 2 ? '❌ ERROR' : '⚠️  WARNING';
      report += `- [ ] ${severity} - Line ${msg.line}:${msg.column} - ${msg.message}`;
      if (msg.ruleId) report += ` (${msg.ruleId})`;
      report += `\n`;
    });
    report += `\n`;
  });
}

if (warnings.length > 0) {
  report += `## ⚠️  LOW RISK - Files with Warnings Only\n\n`;
  warnings.forEach(file => {
    report += `### ${file.filePath}\n\n`;
    report += `**Warnings:** ${file.warningCount}\n\n`;
    file.messages.forEach((msg) => {
      report += `- [ ] ⚠️  WARNING - Line ${msg.line}:${msg.column} - ${msg.message}`;
      if (msg.ruleId) report += ` (${msg.ruleId})`;
      report += `\n`;
    });
    report += `\n`;
  });
}

if (errors.length === 0 && warnings.length === 0) {
  report += `## ✅ All Clear!\n\nNo errors or warnings found.\n`;
}

fs.writeFileSync(reportPath, report);
console.log(`Report generated: ${reportPath}`);
