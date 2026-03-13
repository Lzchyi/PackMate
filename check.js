const fs = require('fs');
const constants = fs.readFileSync('src/data/constants.ts', 'utf8');
const i18n = fs.readFileSync('src/i18n.ts', 'utf8');

const itemRegex = /name:\s*'([^']+)'/g;
const items = new Set();
let match;
while ((match = itemRegex.exec(constants)) !== null) {
  items.add(match[1]);
}

const missingInI18n = [];
for (const item of items) {
  if (!i18n.includes(`'item.${item}'`)) {
    missingInI18n.push(item);
  }
}

console.log('Missing items in i18n.ts:', missingInI18n);
