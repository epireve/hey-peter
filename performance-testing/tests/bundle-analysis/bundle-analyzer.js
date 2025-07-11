const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

class BundleAnalyzer {
  constructor() {
    this.projectRoot = process.cwd().replace('/performance-testing', '');
    this.buildDir = path.join(this.projectRoot, '.next');
    this.staticDir = path.join(this.buildDir, 'static');
    this.analysisResults = {
      bundles: [],
      chunks: [],
      dependencies: [],
      recommendations: [],
    };
    this.thresholds = {
      totalBundleSize: parseInt(process.env.BUNDLE_SIZE_THRESHOLD_KB) || 1024, // 1MB
      chunkSize: parseInt(process.env.CHUNK_SIZE_THRESHOLD_KB) || 256, // 256KB
      unusedCodeThreshold: 0.2, // 20%
    };
  }

  async initialize() {
    console.log('Initializing bundle analyzer...');
    console.log(`Project root: ${this.projectRoot}`);
    
    // Verify project structure
    await this.verifyProjectStructure();
    
    console.log('Bundle analyzer initialized');
  }

  async verifyProjectStructure() {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const nextConfigPath = path.join(this.projectRoot, 'next.config.mjs');
    
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`package.json not found at ${packageJsonPath}`);
    }
    
    if (!fs.existsSync(nextConfigPath)) {
      console.warn(`next.config.mjs not found at ${nextConfigPath}`);
    }
    
    console.log('Project structure verified');
  }

  async runCompleteBundleAnalysis() {
    console.log('Starting comprehensive bundle analysis...');
    
    const analysisSteps = [
      this.buildProductionBundle(),
      this.analyzeJavaScriptBundles(),
      this.analyzeCSSBundles(),
      this.analyzeThirdPartyDependencies(),
      this.detectUnusedCode(),
      this.analyzeCodeSplitting(),
      this.performTreeShakingAnalysis(),
    ];

    const results = [];
    for (const step of analysisSteps) {
      try {
        const result = await step;
        results.push(result);
      } catch (error) {
        console.error(`Analysis step failed: ${error.message}`);
        results.push({ error: error.message });
      }
    }

    const report = this.generateBundleReport(results);
    
    console.log('Bundle analysis completed');
    return report;
  }

  async buildProductionBundle() {
    console.log('Building production bundle for analysis...');
    
    return new Promise((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: this.projectRoot,
        stdio: 'pipe',
      });

      let buildOutput = '';
      let buildError = '';

      buildProcess.stdout.on('data', (data) => {
        buildOutput += data.toString();
      });

      buildProcess.stderr.on('data', (data) => {
        buildError += data.toString();
      });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Production build completed successfully');
          resolve({
            type: 'build',
            success: true,
            output: buildOutput,
            buildTime: Date.now(),
          });
        } else {
          console.error('Production build failed');
          reject(new Error(`Build failed with code ${code}: ${buildError}`));
        }
      });

      // Set timeout for build process
      setTimeout(() => {
        buildProcess.kill('SIGTERM');
        reject(new Error('Build process timed out'));
      }, 300000); // 5 minutes timeout
    });
  }

  async analyzeJavaScriptBundles() {
    console.log('Analyzing JavaScript bundles...');
    
    try {
      const chunksDir = path.join(this.staticDir, 'chunks');
      const appDir = path.join(chunksDir, 'app');
      const pagesDir = path.join(chunksDir, 'pages');
      
      const bundles = [];
      
      // Analyze main chunks
      if (fs.existsSync(chunksDir)) {
        const chunkFiles = fs.readdirSync(chunksDir)
          .filter(file => file.endsWith('.js'));
        
        for (const file of chunkFiles) {
          const filePath = path.join(chunksDir, file);
          const stats = fs.statSync(filePath);
          const analysis = await this.analyzeJavaScriptFile(filePath);
          
          bundles.push({
            name: file,
            path: filePath,
            size: stats.size,
            sizeKB: Math.round(stats.size / 1024),
            type: 'chunk',
            ...analysis,
          });
        }
      }
      
      // Analyze app directory chunks
      if (fs.existsSync(appDir)) {
        const appFiles = this.getJavaScriptFiles(appDir);
        for (const filePath of appFiles) {
          const stats = fs.statSync(filePath);
          const analysis = await this.analyzeJavaScriptFile(filePath);
          const relativePath = path.relative(this.staticDir, filePath);
          
          bundles.push({
            name: path.basename(filePath),
            path: filePath,
            relativePath: relativePath,
            size: stats.size,
            sizeKB: Math.round(stats.size / 1024),
            type: 'app',
            ...analysis,
          });
        }
      }
      
      // Analyze pages directory chunks
      if (fs.existsSync(pagesDir)) {
        const pageFiles = this.getJavaScriptFiles(pagesDir);
        for (const filePath of pageFiles) {
          const stats = fs.statSync(filePath);
          const analysis = await this.analyzeJavaScriptFile(filePath);
          const relativePath = path.relative(this.staticDir, filePath);
          
          bundles.push({
            name: path.basename(filePath),
            path: filePath,
            relativePath: relativePath,
            size: stats.size,
            sizeKB: Math.round(stats.size / 1024),
            type: 'page',
            ...analysis,
          });
        }
      }

      // Calculate totals and identify large bundles
      const totalSize = bundles.reduce((sum, bundle) => sum + bundle.size, 0);
      const largeBundles = bundles.filter(bundle => 
        bundle.sizeKB > this.thresholds.chunkSize
      );

      this.analysisResults.bundles = bundles;

      return {
        type: 'javascript_analysis',
        totalBundles: bundles.length,
        totalSize: totalSize,
        totalSizeKB: Math.round(totalSize / 1024),
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        largeBundles: largeBundles,
        bundles: bundles,
        thresholdViolations: largeBundles.length,
      };
      
    } catch (error) {
      throw new Error(`JavaScript bundle analysis failed: ${error.message}`);
    }
  }

  getJavaScriptFiles(directory) {
    const files = [];
    
    function scanDirectory(dir) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          scanDirectory(itemPath);
        } else if (item.endsWith('.js')) {
          files.push(itemPath);
        }
      }
    }
    
    if (fs.existsSync(directory)) {
      scanDirectory(directory);
    }
    
    return files;
  }

  async analyzeJavaScriptFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      const analysis = {
        lines: content.split('\n').length,
        minified: this.isMinified(content),
        dependencies: this.extractDependencies(content),
        dynamicImports: this.countDynamicImports(content),
        largeLibraries: this.detectLargeLibraries(content),
      };

      return analysis;
      
    } catch (error) {
      return {
        error: error.message,
      };
    }
  }

  isMinified(content) {
    // Simple heuristic: check average line length
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) return false;
    
    const avgLineLength = content.length / lines.length;
    return avgLineLength > 100; // Minified files typically have very long lines
  }

  extractDependencies(content) {
    const dependencies = new Set();
    
    // Look for require() calls
    const requireRegex = /require\(['"`]([^'"`]+)['"`]\)/g;
    let match;
    while ((match = requireRegex.exec(content)) !== null) {
      dependencies.add(match[1]);
    }
    
    // Look for import statements
    const importRegex = /import\s+(?:.*?\s+from\s+)?['"`]([^'"`]+)['"`]/g;
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.add(match[1]);
    }
    
    return Array.from(dependencies);
  }

  countDynamicImports(content) {
    const dynamicImportRegex = /import\s*\(/g;
    const matches = content.match(dynamicImportRegex);
    return matches ? matches.length : 0;
  }

  detectLargeLibraries(content) {
    const largeLibraries = [
      'lodash', 'moment', 'rxjs', 'core-js', 'polyfill',
      'material-ui', 'antd', 'bootstrap', 'jquery',
    ];
    
    const detected = [];
    
    for (const lib of largeLibraries) {
      if (content.includes(lib)) {
        detected.push(lib);
      }
    }
    
    return detected;
  }

  async analyzeCSSBundles() {
    console.log('Analyzing CSS bundles...');
    
    try {
      const cssFiles = [];
      
      // Find CSS files in the static directory
      const staticCssDir = path.join(this.staticDir, 'css');
      
      if (fs.existsSync(staticCssDir)) {
        const cssFileNames = fs.readdirSync(staticCssDir)
          .filter(file => file.endsWith('.css'));
        
        for (const file of cssFileNames) {
          const filePath = path.join(staticCssDir, file);
          const stats = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, 'utf8');
          
          const analysis = {
            name: file,
            path: filePath,
            size: stats.size,
            sizeKB: Math.round(stats.size / 1024),
            rules: this.countCSSRules(content),
            unused: this.estimateUnusedCSS(content),
            duplicates: this.findDuplicateCSS(content),
          };
          
          cssFiles.push(analysis);
        }
      }

      const totalCSSSize = cssFiles.reduce((sum, file) => sum + file.size, 0);
      
      return {
        type: 'css_analysis',
        totalFiles: cssFiles.length,
        totalSize: totalCSSSize,
        totalSizeKB: Math.round(totalCSSSize / 1024),
        files: cssFiles,
      };
      
    } catch (error) {
      throw new Error(`CSS bundle analysis failed: ${error.message}`);
    }
  }

  countCSSRules(content) {
    // Count CSS rules (simplified)
    const ruleRegex = /\{[^}]*\}/g;
    const matches = content.match(ruleRegex);
    return matches ? matches.length : 0;
  }

  estimateUnusedCSS(content) {
    // This is a simplified estimation
    // In a real implementation, you'd use tools like PurgeCSS
    const totalRules = this.countCSSRules(content);
    
    // Look for utility classes that might be unused
    const utilityPatterns = [
      /\.m[tblr]?-\d+/g, // Margin utilities
      /\.p[tblr]?-\d+/g, // Padding utilities
      /\.text-[a-z]+/g,  // Text utilities
      /\.bg-[a-z]+/g,    // Background utilities
    ];
    
    let utilityRules = 0;
    for (const pattern of utilityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        utilityRules += matches.length;
      }
    }
    
    // Estimate that 30% of utility classes might be unused
    const estimatedUnused = Math.floor(utilityRules * 0.3);
    
    return {
      total: totalRules,
      estimated: estimatedUnused,
      percentage: totalRules > 0 ? Math.round((estimatedUnused / totalRules) * 100) : 0,
    };
  }

  findDuplicateCSS(content) {
    // Simple duplicate detection
    const rules = content.split('}').map(rule => rule.trim()).filter(rule => rule.length > 0);
    const ruleCounts = {};
    
    for (const rule of rules) {
      if (rule.includes('{')) {
        ruleCounts[rule] = (ruleCounts[rule] || 0) + 1;
      }
    }
    
    const duplicates = Object.entries(ruleCounts)
      .filter(([rule, count]) => count > 1)
      .map(([rule, count]) => ({ rule, count }));
    
    return {
      count: duplicates.length,
      rules: duplicates.slice(0, 10), // Top 10 duplicates
    };
  }

  async analyzeThirdPartyDependencies() {
    console.log('Analyzing third-party dependencies...');
    
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const analysis = [];
      
      for (const [name, version] of Object.entries(dependencies)) {
        try {
          const depAnalysis = await this.analyzeDependency(name, version);
          analysis.push(depAnalysis);
        } catch (error) {
          analysis.push({
            name,
            version,
            error: error.message,
          });
        }
      }

      // Sort by size
      analysis.sort((a, b) => (b.size || 0) - (a.size || 0));
      
      const totalDeps = analysis.length;
      const largeDeps = analysis.filter(dep => (dep.size || 0) > 100 * 1024); // > 100KB
      const outdatedDeps = analysis.filter(dep => dep.outdated);
      
      return {
        type: 'dependency_analysis',
        totalDependencies: totalDeps,
        largeDependencies: largeDeps.length,
        outdatedDependencies: outdatedDeps.length,
        analysis: analysis,
        recommendations: this.generateDependencyRecommendations(analysis),
      };
      
    } catch (error) {
      throw new Error(`Dependency analysis failed: ${error.message}`);
    }
  }

  async analyzeDependency(name, version) {
    try {
      // Try to get package size information
      const nodeModulesPath = path.join(this.projectRoot, 'node_modules', name);
      
      if (fs.existsSync(nodeModulesPath)) {
        const size = await this.calculateDirectorySize(nodeModulesPath);
        const packageJsonPath = path.join(nodeModulesPath, 'package.json');
        
        let packageInfo = {};
        if (fs.existsSync(packageJsonPath)) {
          packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        }
        
        return {
          name,
          version,
          installedVersion: packageInfo.version,
          size: size,
          sizeKB: Math.round(size / 1024),
          sizeMB: Math.round(size / (1024 * 1024) * 100) / 100,
          description: packageInfo.description,
          license: packageInfo.license,
          outdated: this.isVersionOutdated(version, packageInfo.version),
          bundleImpact: this.estimateBundleImpact(name),
        };
      } else {
        return {
          name,
          version,
          error: 'Package not found in node_modules',
        };
      }
      
    } catch (error) {
      return {
        name,
        version,
        error: error.message,
      };
    }
  }

  async calculateDirectorySize(dirPath) {
    let totalSize = 0;
    
    function scanDirectory(dir) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          scanDirectory(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    }
    
    try {
      scanDirectory(dirPath);
      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  isVersionOutdated(requested, installed) {
    // Simple version comparison (this could be more sophisticated)
    return requested !== installed;
  }

  estimateBundleImpact(packageName) {
    // Estimate how much this package affects bundle size
    const heavyPackages = {
      'react': 'high',
      'react-dom': 'high',
      'next': 'high',
      'lodash': 'high',
      'moment': 'high',
      'rxjs': 'medium',
      '@tanstack/react-query': 'medium',
      'recharts': 'medium',
      'lucide-react': 'low',
      'clsx': 'low',
    };
    
    return heavyPackages[packageName] || 'unknown';
  }

  generateDependencyRecommendations(analysis) {
    const recommendations = [];
    
    // Large dependencies
    const largeDeps = analysis.filter(dep => (dep.sizeMB || 0) > 1);
    if (largeDeps.length > 0) {
      recommendations.push({
        category: 'Bundle Size',
        priority: 'High',
        issue: `${largeDeps.length} large dependencies detected`,
        recommendation: 'Consider lighter alternatives or implement code splitting for large packages',
        packages: largeDeps.map(dep => dep.name),
      });
    }
    
    // Outdated dependencies
    const outdatedDeps = analysis.filter(dep => dep.outdated);
    if (outdatedDeps.length > 0) {
      recommendations.push({
        category: 'Maintenance',
        priority: 'Medium',
        issue: `${outdatedDeps.length} outdated dependencies`,
        recommendation: 'Update dependencies to latest versions for better performance and security',
        packages: outdatedDeps.map(dep => dep.name),
      });
    }
    
    // High impact packages
    const highImpactDeps = analysis.filter(dep => dep.bundleImpact === 'high');
    if (highImpactDeps.length > 3) {
      recommendations.push({
        category: 'Performance',
        priority: 'Medium',
        issue: 'Multiple high-impact packages in bundle',
        recommendation: 'Consider tree shaking, dynamic imports, or alternative packages',
        packages: highImpactDeps.map(dep => dep.name),
      });
    }
    
    return recommendations;
  }

  async detectUnusedCode() {
    console.log('Detecting unused code...');
    
    try {
      // This is a simplified implementation
      // In production, you'd use tools like webpack-bundle-analyzer or source-map-explorer
      
      const srcDir = path.join(this.projectRoot, 'src');
      const unusedFiles = [];
      const unusedExports = [];
      
      if (fs.existsSync(srcDir)) {
        // Scan for potentially unused files
        const allFiles = this.getAllSourceFiles(srcDir);
        
        for (const filePath of allFiles) {
          const usage = await this.analyzeFileUsage(filePath);
          
          if (usage.importCount === 0 && !usage.isEntryPoint) {
            unusedFiles.push({
              path: filePath,
              relativePath: path.relative(this.projectRoot, filePath),
              size: fs.statSync(filePath).size,
            });
          }
          
          if (usage.unusedExports.length > 0) {
            unusedExports.push({
              file: path.relative(this.projectRoot, filePath),
              exports: usage.unusedExports,
            });
          }
        }
      }
      
      const totalUnusedSize = unusedFiles.reduce((sum, file) => sum + file.size, 0);
      
      return {
        type: 'unused_code_analysis',
        unusedFiles: unusedFiles.length,
        unusedExports: unusedExports.length,
        totalUnusedSize: totalUnusedSize,
        totalUnusedSizeKB: Math.round(totalUnusedSize / 1024),
        files: unusedFiles,
        exports: unusedExports,
      };
      
    } catch (error) {
      throw new Error(`Unused code detection failed: ${error.message}`);
    }
  }

  getAllSourceFiles(directory) {
    const files = [];
    
    function scanDirectory(dir) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          scanDirectory(itemPath);
        } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
          files.push(itemPath);
        }
      }
    }
    
    scanDirectory(directory);
    return files;
  }

  async analyzeFileUsage(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      // Check if it's an entry point
      const isEntryPoint = fileName.includes('page.') || 
                          fileName.includes('layout.') ||
                          fileName.includes('loading.') ||
                          fileName.includes('error.') ||
                          fileName === 'middleware.ts';
      
      // Count imports (simplified)
      const importRegex = new RegExp(`from\\s+['"\`][^'"\`]*${fileName.replace('.tsx', '').replace('.ts', '')}['"\`]`, 'g');
      const allFiles = this.getAllSourceFiles(path.join(this.projectRoot, 'src'));
      
      let importCount = 0;
      for (const otherFile of allFiles) {
        if (otherFile === filePath) continue;
        
        try {
          const otherContent = fs.readFileSync(otherFile, 'utf8');
          const matches = otherContent.match(importRegex);
          if (matches) {
            importCount += matches.length;
          }
        } catch (error) {
          // Ignore read errors
        }
      }
      
      // Extract exports
      const exports = this.extractExports(content);
      
      return {
        importCount,
        isEntryPoint,
        exports,
        unusedExports: [], // Would need more sophisticated analysis
      };
      
    } catch (error) {
      return {
        importCount: 0,
        isEntryPoint: false,
        exports: [],
        unusedExports: [],
        error: error.message,
      };
    }
  }

  extractExports(content) {
    const exports = [];
    
    // Named exports
    const namedExportRegex = /export\s+(?:const|let|var|function|class)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    // Export statements
    const exportStatementRegex = /export\s*\{\s*([^}]+)\s*\}/g;
    while ((match = exportStatementRegex.exec(content)) !== null) {
      const exportList = match[1].split(',').map(exp => exp.trim());
      exports.push(...exportList);
    }
    
    // Default export
    if (content.includes('export default')) {
      exports.push('default');
    }
    
    return exports;
  }

  async analyzeCodeSplitting() {
    console.log('Analyzing code splitting effectiveness...');
    
    try {
      const appDir = path.join(this.projectRoot, 'src', 'app');
      const pagesAnalysis = [];
      
      if (fs.existsSync(appDir)) {
        const pageFiles = this.findPageFiles(appDir);
        
        for (const pageFile of pageFiles) {
          const analysis = await this.analyzePageSplitting(pageFile);
          pagesAnalysis.push(analysis);
        }
      }
      
      const totalPages = pagesAnalysis.length;
      const dynamicallyLoaded = pagesAnalysis.filter(page => page.hasDynamicImports).length;
      const avgChunkSize = pagesAnalysis.reduce((sum, page) => sum + (page.estimatedSize || 0), 0) / totalPages;
      
      return {
        type: 'code_splitting_analysis',
        totalPages: totalPages,
        dynamicallyLoaded: dynamicallyLoaded,
        splittingEffectiveness: totalPages > 0 ? Math.round((dynamicallyLoaded / totalPages) * 100) : 0,
        averageChunkSize: Math.round(avgChunkSize),
        pages: pagesAnalysis,
      };
      
    } catch (error) {
      throw new Error(`Code splitting analysis failed: ${error.message}`);
    }
  }

  findPageFiles(directory) {
    const pageFiles = [];
    
    function scanDirectory(dir) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          scanDirectory(itemPath);
        } else if (item === 'page.tsx' || item === 'page.ts') {
          pageFiles.push(itemPath);
        }
      }
    }
    
    scanDirectory(directory);
    return pageFiles;
  }

  async analyzePageSplitting(pageFile) {
    try {
      const content = fs.readFileSync(pageFile, 'utf8');
      const stats = fs.statSync(pageFile);
      const relativePath = path.relative(this.projectRoot, pageFile);
      
      const analysis = {
        path: relativePath,
        size: stats.size,
        hasDynamicImports: content.includes('import('),
        hasLazyLoading: content.includes('lazy(') || content.includes('dynamic('),
        estimatedSize: this.estimatePageSize(content),
        dependencies: this.extractDependencies(content),
      };
      
      return analysis;
      
    } catch (error) {
      return {
        path: path.relative(this.projectRoot, pageFile),
        error: error.message,
      };
    }
  }

  estimatePageSize(content) {
    // Rough estimation based on content analysis
    const baseSize = content.length;
    const importCount = (content.match(/import\s+/g) || []).length;
    const componentCount = (content.match(/const\s+[A-Z]/g) || []).length;
    
    // Rough estimation formula
    return baseSize + (importCount * 1000) + (componentCount * 500);
  }

  async performTreeShakingAnalysis() {
    console.log('Analyzing tree shaking effectiveness...');
    
    try {
      // This would typically require integration with the build process
      // For this implementation, we'll do a simplified analysis
      
      const analysis = {
        librariesAnalyzed: [],
        treeShakingOpportunities: [],
        estimatedSavings: 0,
      };
      
      // Analyze specific libraries known for tree shaking issues
      const librariesToCheck = [
        'lodash', 'moment', 'rxjs', 'material-ui', 'antd'
      ];
      
      for (const library of librariesToCheck) {
        const libAnalysis = await this.analyzeLibraryTreeShaking(library);
        if (libAnalysis) {
          analysis.librariesAnalyzed.push(libAnalysis);
          
          if (libAnalysis.opportunities.length > 0) {
            analysis.treeShakingOpportunities.push(...libAnalysis.opportunities);
            analysis.estimatedSavings += libAnalysis.estimatedSavings;
          }
        }
      }
      
      return {
        type: 'tree_shaking_analysis',
        ...analysis,
      };
      
    } catch (error) {
      throw new Error(`Tree shaking analysis failed: ${error.message}`);
    }
  }

  async analyzeLibraryTreeShaking(libraryName) {
    const nodeModulesPath = path.join(this.projectRoot, 'node_modules', libraryName);
    
    if (!fs.existsSync(nodeModulesPath)) {
      return null;
    }
    
    try {
      const packageJsonPath = path.join(nodeModulesPath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const analysis = {
        name: libraryName,
        version: packageJson.version,
        hasESModules: !!packageJson.module || !!packageJson.exports,
        sideEffects: packageJson.sideEffects,
        opportunities: [],
        estimatedSavings: 0,
      };
      
      // Check for tree shaking opportunities
      if (!analysis.hasESModules) {
        analysis.opportunities.push({
          type: 'ES Modules',
          description: 'Library does not provide ES modules, limiting tree shaking',
          recommendation: 'Consider alternative libraries with ES module support',
        });
        analysis.estimatedSavings += 50000; // Estimated 50KB savings
      }
      
      if (analysis.sideEffects !== false) {
        analysis.opportunities.push({
          type: 'Side Effects',
          description: 'Library may have side effects, reducing tree shaking effectiveness',
          recommendation: 'Import only specific functions/components needed',
        });
        analysis.estimatedSavings += 30000; // Estimated 30KB savings
      }
      
      return analysis;
      
    } catch (error) {
      return {
        name: libraryName,
        error: error.message,
      };
    }
  }

  generateBundleReport(results) {
    const report = {
      testSuite: 'Bundle Size Analysis',
      timestamp: new Date().toISOString(),
      configuration: {
        projectRoot: this.projectRoot,
        thresholds: this.thresholds,
      },
      results: results,
      summary: this.generateBundleSummary(results),
      recommendations: this.generateBundleRecommendations(results),
      optimizationPotential: this.calculateOptimizationPotential(results),
    };

    return report;
  }

  generateBundleSummary(results) {
    const summary = {
      totalBundleSize: 0,
      totalChunks: 0,
      largeChunks: 0,
      unusedCode: 0,
      thirdPartySize: 0,
      optimizationOpportunities: 0,
    };

    results.forEach(result => {
      if (result.type === 'javascript_analysis') {
        summary.totalBundleSize += result.totalSize || 0;
        summary.totalChunks += result.totalBundles || 0;
        summary.largeChunks += result.thresholdViolations || 0;
      }
      
      if (result.type === 'unused_code_analysis') {
        summary.unusedCode += result.totalUnusedSize || 0;
      }
      
      if (result.type === 'dependency_analysis') {
        summary.thirdPartySize += result.analysis?.reduce((sum, dep) => sum + (dep.size || 0), 0) || 0;
      }
    });

    return summary;
  }

  generateBundleRecommendations(results) {
    const recommendations = [];
    
    results.forEach(result => {
      if (result.recommendations) {
        recommendations.push(...result.recommendations);
      }
    });
    
    // Add general recommendations based on analysis
    const jsAnalysis = results.find(r => r.type === 'javascript_analysis');
    if (jsAnalysis && jsAnalysis.totalSizeMB > 2) {
      recommendations.push({
        category: 'Bundle Size',
        priority: 'High',
        issue: 'Large total bundle size detected',
        recommendation: 'Implement aggressive code splitting and lazy loading',
        metric: `Total size: ${jsAnalysis.totalSizeMB}MB`,
      });
    }
    
    const unusedAnalysis = results.find(r => r.type === 'unused_code_analysis');
    if (unusedAnalysis && unusedAnalysis.unusedFiles > 5) {
      recommendations.push({
        category: 'Code Cleanup',
        priority: 'Medium',
        issue: `${unusedAnalysis.unusedFiles} unused files detected`,
        recommendation: 'Remove unused files and exports to reduce bundle size',
        metric: `Potential savings: ${unusedAnalysis.totalUnusedSizeKB}KB`,
      });
    }
    
    return recommendations;
  }

  calculateOptimizationPotential(results) {
    let potentialSavings = 0;
    const opportunities = [];
    
    // Calculate potential savings from unused code
    const unusedAnalysis = results.find(r => r.type === 'unused_code_analysis');
    if (unusedAnalysis) {
      potentialSavings += unusedAnalysis.totalUnusedSize || 0;
      opportunities.push({
        category: 'Unused Code Removal',
        savings: unusedAnalysis.totalUnusedSize || 0,
        savingsKB: unusedAnalysis.totalUnusedSizeKB || 0,
      });
    }
    
    // Calculate potential savings from tree shaking
    const treeShakingAnalysis = results.find(r => r.type === 'tree_shaking_analysis');
    if (treeShakingAnalysis) {
      potentialSavings += treeShakingAnalysis.estimatedSavings || 0;
      opportunities.push({
        category: 'Tree Shaking Optimization',
        savings: treeShakingAnalysis.estimatedSavings || 0,
        savingsKB: Math.round((treeShakingAnalysis.estimatedSavings || 0) / 1024),
      });
    }
    
    return {
      totalPotentialSavings: potentialSavings,
      totalPotentialSavingsKB: Math.round(potentialSavings / 1024),
      totalPotentialSavingsMB: Math.round(potentialSavings / (1024 * 1024) * 100) / 100,
      opportunities: opportunities,
    };
  }
}

// Main execution
async function runBundleAnalysis() {
  const analyzer = new BundleAnalyzer();
  
  try {
    await analyzer.initialize();
    const report = await analyzer.runCompleteBundleAnalysis();
    
    // Save report
    const reportPath = path.join(__dirname, '../../reports', `bundle-analysis-${Date.now()}.json`);
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Display summary
    console.log('\n=== Bundle Analysis Results ===');
    console.log(`Total Bundle Size: ${(report.summary.totalBundleSize / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`Total Chunks: ${report.summary.totalChunks}`);
    console.log(`Large Chunks: ${report.summary.largeChunks}`);
    console.log(`Unused Code: ${(report.summary.unusedCode / 1024).toFixed(1)}KB`);
    console.log(`Optimization Potential: ${report.optimizationPotential.totalPotentialSavingsMB}MB`);
    
    if (report.recommendations.length > 0) {
      console.log('\n=== Recommendations ===');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.issue}`);
        console.log(`   ${rec.recommendation}`);
        if (rec.metric) console.log(`   Metric: ${rec.metric}`);
        console.log('');
      });
    }
    
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error(`Bundle analysis failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runBundleAnalysis().catch(console.error);
}

module.exports = BundleAnalyzer;