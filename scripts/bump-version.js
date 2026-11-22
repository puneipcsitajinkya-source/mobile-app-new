const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// 1. Increment Android versionCode
const currentCode = Number(appJson.expo?.android?.versionCode) || 17;
const newCode = currentCode + 1;
if (!appJson.expo) appJson.expo = {};
if (!appJson.expo.android) appJson.expo.android = {};
appJson.expo.android.versionCode = newCode;

// 2. Increment patch version (e.g. 1.0.0 -> 1.0.1)
const versionParts = (appJson.expo.version || '1.0.0').split('.');
if (versionParts.length === 3 && !isNaN(Number(versionParts[2]))) {
  versionParts[2] = String(Number(versionParts[2]) + 1);
  appJson.expo.version = versionParts.join('.');
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log(`✅ Version auto-incremented:`);
console.log(`   - app version: ${appJson.expo.version}`);
console.log(`   - versionCode: ${newCode}`);
