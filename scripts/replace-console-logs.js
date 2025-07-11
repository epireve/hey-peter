#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Patterns to match and their replacements
const replacements = [
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.info(',
    import: "import { logger } from '@/lib/services';"
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
    import: "import { logger } from '@/lib/services';"
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
    import: "import { logger } from '@/lib/services';"
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'logger.info(',
    import: "import { logger } from '@/lib/services';"
  },
  {
    pattern: /console\.debug\(/g,
    replacement: 'logger.debug(',
    import: "import { logger } from '@/lib/services';"
  }
];

// Files/directories to skip
const skipPatterns = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.test\./,
  /\.spec\./,
  /jest\.setup/,
  /jest\.config/,
  /next\.config/,
  /tailwind\.config/,
  /postcss\.config/,
  /scripts/,
  /logger\.ts$/,
  /logging-service\.ts$/
];

async function* walkDir(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    
    // Skip if matches skip patterns
    if (skipPatterns.some(pattern => pattern.test(filePath))) {
      continue;
    }
    
    if (file.isDirectory()) {
      yield* walkDir(filePath);
    } else if (file.isFile() && /\.(ts|tsx|js|jsx)$/.test(file.name)) {
      yield filePath;
    }
  }
}

async function processFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let hasChanges = false;
    let needsImport = false;
    
    // Check if file contains any console statements
    const hasConsole = replacements.some(r => r.pattern.test(content));
    if (!hasConsole) {
      return { filePath, changed: false };
    }
    
    // Apply replacements
    for (const { pattern, replacement } of replacements) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        content = content.replace(pattern, replacement);
        hasChanges = true;
        needsImport = true;
      }
    }
    
    if (hasChanges && needsImport) {
      // Check if logger is already imported
      const hasLoggerImport = /import\s+{[^}]*logger[^}]*}\s+from\s+['"]@\/lib\/services['"]/.test(content);
      
      if (!hasLoggerImport) {
        // Add import at the top after any existing imports
        const importMatch = content.match(/^((?:import\s+.*?\s+from\s+['"].*?['"];?\s*\n)*)/m);
        if (importMatch) {
          const existingImports = importMatch[1];
          const restOfFile = content.slice(existingImports.length);
          
          // Check if there's already an import from @/lib/services
          const servicesImportMatch = existingImports.match(/import\s+{([^}]*)}\s+from\s+['"]@\/lib\/services['"];?/);
          
          if (servicesImportMatch) {
            // Add logger to existing import
            const currentImports = servicesImportMatch[1];
            const newImports = currentImports.includes('logger') 
              ? currentImports 
              : `${currentImports.trim()}, logger`;
            
            const updatedImport = existingImports.replace(
              servicesImportMatch[0],
              `import { ${newImports} } from '@/lib/services';`
            );
            content = updatedImport + restOfFile;
          } else {
            // Add new import after existing imports
            content = existingImports + "import { logger } from '@/lib/services';\n" + restOfFile;
          }
        } else {
          // No imports found, add at the beginning
          content = "import { logger } from '@/lib/services';\n\n" + content;
        }
      }
    }
    
    if (hasChanges) {
      await fs.writeFile(filePath, content, 'utf8');
      return { filePath, changed: true };
    }
    
    return { filePath, changed: false };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { filePath, changed: false, error: error.message };
  }
}

async function main() {
  console.log('Starting console.log replacement...\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  const publicDir = path.join(process.cwd(), 'public');
  
  let totalFiles = 0;
  let changedFiles = 0;
  let errorFiles = 0;
  const results = [];
  
  // Process src directory
  for await (const filePath of walkDir(srcDir)) {
    totalFiles++;
    const result = await processFile(filePath);
    results.push(result);
    
    if (result.changed) {
      changedFiles++;
      console.log(`✓ Updated: ${path.relative(process.cwd(), filePath)}`);
    } else if (result.error) {
      errorFiles++;
      console.log(`✗ Error: ${path.relative(process.cwd(), filePath)} - ${result.error}`);
    }
  }
  
  // Special handling for public/sw.js
  const swPath = path.join(publicDir, 'sw.js');
  try {
    const swContent = await fs.readFile(swPath, 'utf8');
    let updatedSwContent = swContent;
    
    // For service worker, we'll keep console but comment with logger equivalent
    updatedSwContent = updatedSwContent.replace(
      /console\.log\(/g,
      '// Replace with logger.info when available\nconsole.log('
    );
    updatedSwContent = updatedSwContent.replace(
      /console\.error\(/g,
      '// Replace with logger.error when available\nconsole.error('
    );
    
    if (updatedSwContent !== swContent) {
      await fs.writeFile(swPath, updatedSwContent, 'utf8');
      console.log(`✓ Updated service worker: ${path.relative(process.cwd(), swPath)}`);
      changedFiles++;
    }
  } catch (error) {
    // Service worker might not exist
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total files scanned: ${totalFiles}`);
  console.log(`Files updated: ${changedFiles}`);
  console.log(`Files with errors: ${errorFiles}`);
  console.log('\nConsole.log replacement complete!');
}

main().catch(console.error);