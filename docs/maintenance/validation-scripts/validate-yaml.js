#!/usr/bin/env node

/**
 * YAML DSL Validation Script
 *
 * Validates all YAML DSL files for:
 * - Syntax correctness
 * - Schema compliance
 * - Cross-file consistency
 * - Version synchronization
 *
 * Usage: node validate-yaml.js [--fix] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

class YamlValidator {
  constructor(options = {}) {
    this.options = {
      fix: options.fix || false,
      verbose: options.verbose || false,
      docsRoot: path.join(__dirname, '../../')
    };
    this.errors = [];
    this.warnings = [];
    this.stats = {
      filesChecked: 0,
      errorsFound: 0,
      warningsFound: 0
    };
  }

  /**
   * Main validation entry point
   */
  async validate() {
    console.log('🔍 Starting YAML DSL validation...\n');

    try {
      await this.validateAllFiles();
      this.validateCrossFileConsistency();
      this.printResults();

      return this.errors.length === 0;
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return false;
    }
  }

  /**
   * Validate all YAML files in the docs directory
   */
  async validateAllFiles() {
    const yamlFiles = this.findYamlFiles();

    for (const file of yamlFiles) {
      await this.validateFile(file);
    }
  }

  /**
   * Find all YAML files in the docs directory
   */
  findYamlFiles() {
    const files = [];

    const searchDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          searchDir(fullPath);
        } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
          files.push(fullPath);
        }
      }
    };

    searchDir(this.options.docsRoot);
    return files;
  }

  /**
   * Validate individual YAML file
   */
  async validateFile(filePath) {
    const relativePath = path.relative(this.options.docsRoot, filePath);
    this.stats.filesChecked++;

    if (this.options.verbose) {
      console.log(`📄 Checking ${relativePath}...`);
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const document = yaml.parseDocument(content);

      // Check for YAML syntax errors
      if (document.errors.length > 0) {
        document.errors.forEach(error => {
          this.addError(relativePath, `YAML syntax error: ${error.message}`);
        });
        return;
      }

      const data = document.toJS();

      // Validate metadata section
      this.validateMetadata(relativePath, data);

      // File-specific validations
      this.validateFileSpecific(relativePath, data);

      console.log(`✅ ${relativePath} - OK`);

    } catch (error) {
      this.addError(relativePath, `Failed to parse: ${error.message}`);
    }
  }

  /**
   * Validate metadata section that should exist in all files
   */
  validateMetadata(filePath, data) {
    if (!data.metadata) {
      this.addError(filePath, 'Missing required metadata section');
      return;
    }

    const required = ['name', 'version', 'description'];
    required.forEach(field => {
      if (!data.metadata[field]) {
        this.addError(filePath, `Missing required metadata field: ${field}`);
      }
    });

    // Validate version format (semantic versioning)
    if (data.metadata.version && !this.isValidVersion(data.metadata.version)) {
      this.addError(filePath, `Invalid version format: ${data.metadata.version}. Expected semantic version (e.g., 4.0.0)`);
    }
  }

  /**
   * File-specific validation rules
   */
  validateFileSpecific(filePath, data) {
    const filename = path.basename(filePath);

    switch (filename) {
      case 'system-architecture.yaml':
        this.validateSystemArchitecture(filePath, data);
        break;
      case 'database-schema.yaml':
        this.validateDatabaseSchema(filePath, data);
        break;
      case 'api-endpoints.yaml':
        this.validateApiEndpoints(filePath, data);
        break;
      case 'frontend-components.yaml':
        this.validateFrontendComponents(filePath, data);
        break;
      case 'security-auth.yaml':
        this.validateSecurityAuth(filePath, data);
        break;
      case 'integrations.yaml':
        this.validateIntegrations(filePath, data);
        break;
      case 'business-domains.yaml':
        this.validateBusinessDomains(filePath, data);
        break;
    }
  }

  /**
   * Validate system architecture file
   */
  validateSystemArchitecture(filePath, data) {
    const required = ['technology_stack', 'authentication', 'deployment'];
    required.forEach(section => {
      if (!data[section]) {
        this.addWarning(filePath, `Missing recommended section: ${section}`);
      }
    });
  }

  /**
   * Validate database schema file
   */
  validateDatabaseSchema(filePath, data) {
    if (!data.core_tables) {
      this.addError(filePath, 'Missing core_tables section');
      return;
    }

    // Check for essential tables
    const essentialTables = ['users', 'projects', 'tasks'];
    essentialTables.forEach(table => {
      if (!data.core_tables[table]) {
        this.addWarning(filePath, `Missing essential table: ${table}`);
      }
    });
  }

  /**
   * Validate API endpoints file
   */
  validateApiEndpoints(filePath, data) {
    const requiredSections = ['authentication_endpoints', 'api_configuration'];
    requiredSections.forEach(section => {
      if (!data[section]) {
        this.addError(filePath, `Missing required section: ${section}`);
      }
    });
  }

  /**
   * Validate frontend components file
   */
  validateFrontendComponents(filePath, data) {
    if (!data.page_components) {
      this.addError(filePath, 'Missing page_components section');
    }

    if (!data.ui_components) {
      this.addWarning(filePath, 'Missing ui_components section');
    }
  }

  /**
   * Validate security and authentication file
   */
  validateSecurityAuth(filePath, data) {
    const criticalSections = ['authentication_architecture', 'session_management', 'password_security'];
    criticalSections.forEach(section => {
      if (!data[section]) {
        this.addError(filePath, `Missing critical security section: ${section}`);
      }
    });
  }

  /**
   * Validate integrations file
   */
  validateIntegrations(filePath, data) {
    const integrations = ['slack_integration', 'teams_integration', 'github_integration'];
    integrations.forEach(integration => {
      if (!data[integration]) {
        this.addWarning(filePath, `Missing integration section: ${integration}`);
      }
    });
  }

  /**
   * Validate business domains file
   */
  validateBusinessDomains(filePath, data) {
    if (!data.core_business_domains) {
      this.addError(filePath, 'Missing core_business_domains section');
    }
  }

  /**
   * Validate cross-file consistency
   */
  validateCrossFileConsistency() {
    console.log('🔗 Validating cross-file consistency...');

    // Load all YAML files for cross-referencing
    const documents = {};
    const yamlFiles = this.findYamlFiles();

    for (const file of yamlFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const data = yaml.parse(content);
        const filename = path.basename(file);
        documents[filename] = data;
      } catch (error) {
        // Skip files that couldn't be parsed
        continue;
      }
    }

    this.validateVersionConsistency(documents);
    this.validateTechnologyStackConsistency(documents);
    this.validateArchitecturalConsistency(documents);
  }

  /**
   * Validate version consistency across files
   */
  validateVersionConsistency(documents) {
    const versions = {};

    Object.entries(documents).forEach(([filename, data]) => {
      if (data.metadata && data.metadata.version) {
        versions[filename] = data.metadata.version;
      }
    });

    const uniqueVersions = [...new Set(Object.values(versions))];

    if (uniqueVersions.length > 1) {
      this.addWarning('Cross-file', `Version inconsistency detected. Versions found: ${uniqueVersions.join(', ')}`);

      Object.entries(versions).forEach(([filename, version]) => {
        console.log(`  ${filename}: ${version}`);
      });
    }
  }

  /**
   * Validate technology stack consistency
   */
  validateTechnologyStackConsistency(documents) {
    const systemArch = documents['system-architecture.yaml'];
    const frontendComp = documents['frontend-components.yaml'];

    if (systemArch && frontendComp) {
      // Check React version consistency
      const archReactVersion = systemArch.technology_stack?.frontend?.version;
      const compReactVersion = frontendComp.metadata?.react_version;

      if (archReactVersion && compReactVersion && archReactVersion !== compReactVersion) {
        this.addWarning('Cross-file', `React version mismatch: system-architecture.yaml (${archReactVersion}) vs frontend-components.yaml (${compReactVersion})`);
      }
    }
  }

  /**
   * Validate architectural consistency
   */
  validateArchitecturalConsistency(documents) {
    const systemArch = documents['system-architecture.yaml'];
    const businessDomains = documents['business-domains.yaml'];

    if (systemArch && businessDomains) {
      // Validate domain count consistency
      const archDomainCount = systemArch.business_domains ? Object.keys(systemArch.business_domains).length : 0;
      const domainsDomainCount = businessDomains.domain_architecture?.domain_count;

      if (domainsDomainCount && archDomainCount !== domainsDomainCount) {
        this.addWarning('Cross-file', `Domain count mismatch between system-architecture.yaml and business-domains.yaml`);
      }
    }
  }

  /**
   * Check if version follows semantic versioning
   */
  isValidVersion(version) {
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semverRegex.test(version);
  }

  /**
   * Add error to collection
   */
  addError(file, message) {
    this.errors.push({ file, message });
    this.stats.errorsFound++;
  }

  /**
   * Add warning to collection
   */
  addWarning(file, message) {
    this.warnings.push({ file, message });
    this.stats.warningsFound++;
  }

  /**
   * Print validation results
   */
  printResults() {
    console.log('\n📊 Validation Results:');
    console.log(`Files checked: ${this.stats.filesChecked}`);
    console.log(`Errors found: ${this.stats.errorsFound}`);
    console.log(`Warnings found: ${this.stats.warningsFound}`);

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => {
        console.log(`  ${error.file}: ${error.message}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => {
        console.log(`  ${warning.file}: ${warning.message}`);
      });
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n🎉 All YAML DSL files are valid and consistent!');
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    fix: args.includes('--fix'),
    verbose: args.includes('--verbose')
  };

  const validator = new YamlValidator(options);

  validator.validate().then(isValid => {
    process.exit(isValid ? 0 : 1);
  }).catch(error => {
    console.error('Validation script error:', error);
    process.exit(1);
  });
}

module.exports = YamlValidator;