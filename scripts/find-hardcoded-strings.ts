import fs from 'fs';
import path from 'path';

// Load defined translation keys from translations.ts
const translationsFilePath = path.join(process.cwd(), 'src/components/translations.ts');

function getTranslationKeys(): Set<string> {
  const keys = new Set<string>();
  if (!fs.existsSync(translationsFilePath)) {
    console.error('translations.ts not found at:', translationsFilePath);
    return keys;
  }
  const content = fs.readFileSync(translationsFilePath, 'utf-8');
  // Simple regex to extract keys from translations object
  const keyMatches = content.matchAll(/"([^"\\]+)"|'([^'\\]+)'/g);
  for (const match of keyMatches) {
    const key = match[1] || match[2];
    if (key && key.includes('_')) { // Translation keys usually use underscores, e.g. hero_title
      keys.add(key);
    }
  }
  return keys;
}

const definedKeys = getTranslationKeys();
console.log(`Loaded ${definedKeys.size} defined translation keys.`);

const directoriesToScan = [
  path.join(process.cwd(), 'src/app'),
  path.join(process.cwd(), 'src/components')
];

// Regex patterns to identify hardcoded English strings in JSX
const patterns = [
  // 1. Text between JSX tags, e.g. <span>Hello World</span>
  />\s*([A-Za-z0-9\s,\.!?:'\(\)-]+[A-Za-z]+[A-Za-z0-9\s,\.!?:'\(\)-]*)\s*</g,
  // 2. Static attributes, e.g. placeholder="Enter your name" or label="Name"
  /\b(placeholder|label|title|alt)=["']([A-Za-z0-9\s,\.!?:'\(\)-]+[A-Za-z]+[A-Za-z0-9\s,\.!?:'\(\)-]*)["']/g,
  // 3. String literals in curly braces, e.g. {'Some Text'}
  /\{\s*["']([A-Za-z0-9\s,\.!?:'\(\)-]+[A-Za-z]+[A-Za-z0-9\s,\.!?:'\(\)-]*)["']\s*\}/g
];

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(process.cwd(), filePath);
  let issuesCount = 0;

  lines.forEach((line, lineIndex) => {
    // Ignore imports, comments, and console logs
    if (line.trim().startsWith('import') || line.trim().startsWith('//') || line.includes('console.log')) {
      return;
    }

    patterns.forEach((pattern) => {
      let match;
      // Reset regex index
      pattern.lastIndex = 0;
      while ((match = pattern.exec(line)) !== null) {
        const text = (match[1] || match[2]).trim();
        // Ignore single characters, numbers, Tailwind classes, CSS properties, or translation calls themselves
        if (
          text.length < 2 ||
          /^[0-9\s]+$/.test(text) ||
          definedKeys.has(text) ||
          line.includes(`t('${text}')`) ||
          line.includes(`t("${text}")`) ||
          text.startsWith('w-') || text.startsWith('h-') || text.startsWith('bg-') || text.startsWith('text-')
        ) {
          continue;
        }

        console.log(`[HARDCODED STRING] ${relativePath}:${lineIndex + 1} -> "${text}"`);
        issuesCount++;
      }
    });
  });

  return issuesCount;
}

function walkDir(dir: string, callback: (filePath: string) => void) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      // Exclude special directories
      if (file !== 'node_modules' && file !== '.next') {
        walkDir(fullPath, callback);
      }
    } else if (file.endsWith('.tsx') || (file.endsWith('.ts') && !file.endsWith('.d.ts') && !file.includes('translations'))) {
      callback(fullPath);
    }
  });
}

console.log('Scanning files for hardcoded English strings...');
let totalIssues = 0;

directoriesToScan.forEach((dir) => {
  if (fs.existsSync(dir)) {
    walkDir(dir, (filePath) => {
      totalIssues += scanFile(filePath);
    });
  }
});

console.log(`\nScan completed. Found ${totalIssues} hardcoded strings.`);
