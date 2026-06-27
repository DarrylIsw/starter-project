const fs = require('fs');
const path = require('path');

function rawdoc(componentName) {
  const src = componentName && componentName.src;
  if (!src) return '';
  const dir = path.resolve(process.cwd(), 'app');
  const target = path.resolve(dir, src);
  if (!target.startsWith(dir) || !fs.existsSync(target)) return '';
  const content = fs.readFileSync(target, 'utf8');
  return content.toString();
}

module.exports = rawdoc;
