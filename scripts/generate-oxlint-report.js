const fs = require('fs');
const path = require('path');

// Get timestamp from command line argument
const timestamp = process.argv[2];
if (!timestamp) {
  console.error('Error: Timestamp argument required');
  process.exit(1);
}

const tempFile = path.join('temp', `oxlint-raw-${timestamp}.json`);
const reportPath = path.join('report', 'lint-checking', `oxlint-report-${timestamp}.md`);

let rawData = '';
try {
  rawData = fs.readFileSync(tempFile, 'utf8');
} catch (e) {
  console.error('Error reading oxlint output:', e.message);
  process.exit(1);
}

const issues = [];
let jsonData = [];

// Try to parse as JSON first
try {
  jsonData = JSON.parse(rawData);
} catch (e) {
  // Parse text format if JSON fails
  const lines = rawData.split('\n');
  lines.forEach(line => {
    if (line.includes('error') || line.includes('warning')) {
      issues.push({ raw: line, severity: line.includes('error') ? 'error' : 'warning' });
    }
  });
}

// Group by file
const fileMap = {};
if (Array.isArray(jsonData)) {
  jsonData.forEach(item => {
    const file = item.filePath || item.file || 'unknown';
    if (!fileMap[file]) fileMap[file] = { errors: [], warnings: [] };
    if (item.severity === 'error' || item.level === 'error') {
      fileMap[file].errors.push(item);
    } else {
      fileMap[file].warnings.push(item);
    }
  });
}

// Sort: errors first, then warnings
const filesWithErrors = Object.keys(fileMap).filter(f => fileMap[f].errors.length > 0).sort();
const filesWithWarningsOnly = Object.keys(fileMap).filter(f => fileMap[f].errors.length === 0 && fileMap[f].warnings.length > 0).sort();

let report = `# Oxlint Report - ${new Date().toISOString()}\n\n`;
report += `## Summary\n\n`;
report += `- Total Files with Errors: ${filesWithErrors.length}\n`;
report += `- Total Files with Warnings Only: ${filesWithWarningsOnly.length}\n\n`;

if (filesWithErrors.length > 0) {
  report += `## 🚨 URGENT - Files with Errors\n\n`;
  filesWithErrors.forEach(file => {
    const data = fileMap[file];
    report += `### ${file}\n\n`;
    report += `**Errors:** ${data.errors.length} | **Warnings:** ${data.warnings.length}\n\n`;
    data.errors.forEach(err => {
      report += `- [ ] ❌ ERROR - Line ${err.line || '?'}:${err.column || '?'} - ${err.message || err.ruleId || 'Unknown error'}`;
      if (err.ruleId) report += ` (${err.ruleId})`;
      report += `\n`;
    });
    data.warnings.forEach(warn => {
      report += `- [ ] ⚠️  WARNING - Line ${warn.line || '?'}:${warn.column || '?'} - ${warn.message || warn.ruleId || 'Unknown warning'}`;
      if (warn.ruleId) report += ` (${warn.ruleId})`;
      report += `\n`;
    });
    report += `\n`;
  });
}

if (filesWithWarningsOnly.length > 0) {
  report += `## ⚠️  LOW RISK - Files with Warnings Only\n\n`;
  filesWithWarningsOnly.forEach(file => {
    const data = fileMap[file];
    report += `### ${file}\n\n`;
    report += `**Warnings:** ${data.warnings.length}\n\n`;
    data.warnings.forEach(warn => {
      report += `- [ ] ⚠️  WARNING - Line ${warn.line || '?'}:${warn.column || '?'} - ${warn.message || warn.ruleId || 'Unknown warning'}`;
      if (warn.ruleId) report += ` (${warn.ruleId})`;
      report += `\n`;
    });
    report += `\n`;
  });
}

if (filesWithErrors.length === 0 && filesWithWarningsOnly.length === 0) {
  report += `## ✅ All Clear!\n\nNo errors or warnings found.\n`;
}

fs.writeFileSync(reportPath, report);
console.log(`Report generated: ${reportPath}`);
