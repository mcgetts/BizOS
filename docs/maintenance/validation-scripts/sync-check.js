#!/usr/bin/env node

/**
 * Documentation Sync Checker
 *
 * Compares YAML DSL documentation with actual source code to identify
 * inconsistencies and outdated documentation.
 *
 * Usage: node sync-check.js [--auto-fix] [--report-only]
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

class SyncChecker {
  constructor(options = {}) {
    this.options = {
      autoFix: options.autoFix || false,
      reportOnly: options.reportOnly || false
    };
    this.projectRoot = path.join(__dirname, '../../../');
    this.docsRoot = path.join(this.projectRoot, 'docs/');
    this.inconsistencies = [];
    this.suggestions = [];
  }

  /**
   * Main sync checking entry point
   */
  async checkSync() {
    console.log('🔄 Checking documentation sync with source code...\n');

    try {
      await this.checkPackageJsonSync();
      await this.checkDatabaseSchemaSync();
      await this.checkApiEndpointsSync();
      await this.checkComponentsSync();
      await this.checkIntegrationsSync();

      this.printResults();

      return this.inconsistencies.length === 0;
    } catch (error) {
      console.error('❌ Sync check failed:', error.message);
      return false;
    }
  }

  /**
   * Check if system architecture matches package.json
   */
  async checkPackageJsonSync() {
    console.log('📦 Checking package.json sync...');

    const packagePath = path.join(this.projectRoot, 'package.json');
    const systemArchPath = path.join(this.docsRoot, 'architecture/system-architecture.yaml');

    if (!fs.existsSync(packagePath) || !fs.existsSync(systemArchPath)) {
      this.addInconsistency('package.json sync', 'Missing required files for comparison');
      return;
    }

    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const archData = yaml.parse(fs.readFileSync(systemArchPath, 'utf8'));

    // Check dependency versions
    this.checkDependencyVersions(packageData, archData);

    // Check Node.js version requirements
    this.checkNodeVersion(packageData, archData);

    console.log('✅ package.json sync check completed');
  }

  /**
   * Check dependency version consistency
   */
  checkDependencyVersions(packageData, archData) {
    const techStack = archData.technology_stack;
    if (!techStack) return;

    // Check key dependency versions
    const keyDeps = {
      'react': 'frontend.version',
      'express': 'backend.version',
      '@tanstack/react-query': 'frontend.state_management_version',
      'drizzle-orm': 'database.orm_version',
      'tailwindcss': 'ui_framework.version_tailwind'
    };

    Object.entries(keyDeps).forEach(([depName, yamlPath]) => {
      const packageVersion = packageData.dependencies?.[depName] || packageData.devDependencies?.[depName];
      const yamlVersion = this.getNestedProperty(techStack, yamlPath);

      if (packageVersion && yamlVersion) {
        const cleanPackageVersion = packageVersion.replace(/[\^~]/, '');
        if (cleanPackageVersion !== yamlVersion) {
          this.addInconsistency(
            'dependency versions',
            `${depName}: package.json (${packageVersion}) vs architecture YAML (${yamlVersion})`
          );
          this.addSuggestion(`Update ${depName} version in system-architecture.yaml to match package.json`);
        }
      }
    });
  }

  /**
   * Check Node.js version requirements
   */
  checkNodeVersion(packageData, archData) {
    const nodeVersion = archData.technology_stack?.runtime?.version;
    const packageEngines = packageData.engines?.node;

    if (packageEngines && nodeVersion) {
      // Simple comparison - could be enhanced with semver parsing
      if (!nodeVersion.includes(packageEngines.replace('>=', ''))) {
        this.addInconsistency(
          'Node.js version',
          `package.json engines (${packageEngines}) vs architecture YAML (${nodeVersion})`
        );
      }
    }
  }

  /**
   * Check database schema sync with actual schema files
   */
  async checkDatabaseSchemaSync() {
    console.log('🗄️  Checking database schema sync...');

    const schemaPath = path.join(this.docsRoot, 'technical/database-schema.yaml');
    const sourceSchemaPath = path.join(this.projectRoot, 'shared/schema.ts');

    if (!fs.existsSync(schemaPath) || !fs.existsSync(sourceSchemaPath)) {
      this.addInconsistency('database schema sync', 'Missing required files for comparison');
      return;
    }

    const schemaDoc = yaml.parse(fs.readFileSync(schemaPath, 'utf8'));
    const sourceCode = fs.readFileSync(sourceSchemaPath, 'utf8');

    // Check for table definitions
    this.checkTableDefinitions(schemaDoc, sourceCode);

    console.log('✅ Database schema sync check completed');
  }

  /**
   * Check if documented tables exist in source code
   */
  checkTableDefinitions(schemaDoc, sourceCode) {
    if (!schemaDoc.core_tables) return;

    Object.keys(schemaDoc.core_tables).forEach(tableName => {
      // Look for table export in source code
      const tableRegex = new RegExp(`export const ${tableName}\\s*=\\s*pgTable`, 'i');
      if (!tableRegex.test(sourceCode)) {
        this.addInconsistency(
          'database tables',
          `Table '${tableName}' documented but not found in schema.ts`
        );
        this.addSuggestion(`Verify table name '${tableName}' or add missing table definition`);
      }
    });

    // Check for tables in code that might not be documented
    const exportRegex = /export const (\w+)\s*=\s*pgTable/g;
    let match;
    while ((match = exportRegex.exec(sourceCode)) !== null) {
      const tableName = match[1];
      if (!schemaDoc.core_tables[tableName] &&
          !schemaDoc.resource_management_tables?.[tableName] &&
          !schemaDoc.budget_management_tables?.[tableName] &&
          !schemaDoc.support_knowledge_tables?.[tableName] &&
          !schemaDoc.marketing_tables?.[tableName] &&
          !schemaDoc.notification_tables?.[tableName] &&
          !schemaDoc.additional_crm_tables?.[tableName]) {
        this.addInconsistency(
          'undocumented tables',
          `Table '${tableName}' exists in source but not documented in YAML`
        );
        this.addSuggestion(`Add documentation for table '${tableName}' in database-schema.yaml`);
      }
    }
  }

  /**
   * Check API endpoints sync with routes file
   */
  async checkApiEndpointsSync() {
    console.log('🔌 Checking API endpoints sync...');

    const endpointsPath = path.join(this.docsRoot, 'technical/api-endpoints.yaml');
    const routesPath = path.join(this.projectRoot, 'server/routes.ts');

    if (!fs.existsSync(endpointsPath) || !fs.existsSync(routesPath)) {
      this.addInconsistency('API endpoints sync', 'Missing required files for comparison');
      return;
    }

    const endpointsDoc = yaml.parse(fs.readFileSync(endpointsPath, 'utf8'));
    const routesCode = fs.readFileSync(routesPath, 'utf8');

    // Check documented endpoints exist in routes
    this.checkEndpointImplementation(endpointsDoc, routesCode);

    console.log('✅ API endpoints sync check completed');
  }

  /**
   * Check if documented endpoints are implemented
   */
  checkEndpointImplementation(endpointsDoc, routesCode) {
    // Get all documented endpoints
    const endpointSections = [
      'authentication_endpoints',
      'user_management_endpoints',
      'project_management_endpoints',
      'task_management_endpoints'
    ];

    endpointSections.forEach(section => {
      if (!endpointsDoc[section]) return;

      Object.entries(endpointsDoc[section]).forEach(([endpointKey, endpoint]) => {
        if (endpoint.path && endpoint.method) {
          const path = endpoint.path.replace(/:\w+/g, ''); // Remove path parameters
          const method = endpoint.method.toLowerCase();

          // Look for route definition
          const routeRegex = new RegExp(`app\\.${method}\\(['"\`][^'"\`]*${path.replace('/api', '')}`, 'i');
          if (!routeRegex.test(routesCode)) {
            this.addInconsistency(
              'API implementation',
              `${endpoint.method} ${endpoint.path} documented but not found in routes.ts`
            );
          }
        }
      });
    });
  }

  /**
   * Check components sync with actual component files
   */
  async checkComponentsSync() {
    console.log('⚛️  Checking components sync...');

    const componentsPath = path.join(this.docsRoot, 'technical/frontend-components.yaml');
    const clientPath = path.join(this.projectRoot, 'client/src/');

    if (!fs.existsSync(componentsPath) || !fs.existsSync(clientPath)) {
      this.addInconsistency('components sync', 'Missing required files for comparison');
      return;
    }

    const componentsDoc = yaml.parse(fs.readFileSync(componentsPath, 'utf8'));

    // Check documented components exist
    this.checkComponentFiles(componentsDoc, clientPath);

    console.log('✅ Components sync check completed');
  }

  /**
   * Check if documented components exist as files
   */
  checkComponentFiles(componentsDoc, clientPath) {
    if (componentsDoc.page_components) {
      Object.entries(componentsDoc.page_components).forEach(([componentKey, component]) => {
        if (component.file) {
          const filePath = path.join(clientPath, component.file.replace('client/src/', ''));
          if (!fs.existsSync(filePath)) {
            this.addInconsistency(
              'component files',
              `Component file '${component.file}' documented but not found`
            );
          }
        }
      });
    }
  }

  /**
   * Check integrations sync with actual integration files
   */
  async checkIntegrationsSync() {
    console.log('🔗 Checking integrations sync...');

    const integrationsPath = path.join(this.docsRoot, 'integrations/integrations.yaml');
    const serverIntegrationsPath = path.join(this.projectRoot, 'server/integrations/');

    if (!fs.existsSync(integrationsPath) || !fs.existsSync(serverIntegrationsPath)) {
      this.addInconsistency('integrations sync', 'Missing required files for comparison');
      return;
    }

    const integrationsDoc = yaml.parse(fs.readFileSync(integrationsPath, 'utf8'));

    // Check integration implementation files
    const integrations = ['slack', 'teams', 'github'];
    integrations.forEach(integration => {
      const integrationFile = path.join(serverIntegrationsPath, `${integration}.ts`);
      if (!fs.existsSync(integrationFile)) {
        this.addInconsistency(
          'integration files',
          `${integration} integration documented but ${integration}.ts not found`
        );
      }
    });

    console.log('✅ Integrations sync check completed');
  }

  /**
   * Get nested property from object using dot notation
   */
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Add inconsistency to collection
   */
  addInconsistency(category, message) {
    this.inconsistencies.push({ category, message });
  }

  /**
   * Add suggestion to collection
   */
  addSuggestion(message) {
    this.suggestions.push(message);
  }

  /**
   * Print sync check results
   */
  printResults() {
    console.log('\n📊 Sync Check Results:');
    console.log(`Inconsistencies found: ${this.inconsistencies.length}`);
    console.log(`Suggestions generated: ${this.suggestions.length}`);

    if (this.inconsistencies.length > 0) {
      console.log('\n❌ Inconsistencies:');
      this.inconsistencies.forEach(item => {
        console.log(`  [${item.category}] ${item.message}`);
      });
    }

    if (this.suggestions.length > 0) {
      console.log('\n💡 Suggestions:');
      this.suggestions.forEach(suggestion => {
        console.log(`  • ${suggestion}`);
      });
    }

    if (this.inconsistencies.length === 0) {
      console.log('\n🎉 All documentation is in sync with source code!');
    } else {
      console.log('\n⚠️  Some documentation updates may be needed to maintain consistency.');
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    autoFix: args.includes('--auto-fix'),
    reportOnly: args.includes('--report-only')
  };

  const checker = new SyncChecker(options);

  checker.checkSync().then(isInSync => {
    process.exit(isInSync ? 0 : 1);
  }).catch(error => {
    console.error('Sync check error:', error);
    process.exit(1);
  });
}

module.exports = SyncChecker;