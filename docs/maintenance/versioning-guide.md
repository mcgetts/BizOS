# YAML DSL Versioning Guide

This guide establishes the versioning strategy for all YAML DSL documentation files to ensure consistency, traceability, and proper maintenance workflows.

## 🏷️ Versioning Strategy

### Semantic Versioning (SemVer)
All YAML DSL files follow **Semantic Versioning 2.0.0** (https://semver.org/):

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes to structure, removal of sections, or fundamental architectural changes
- **MINOR**: New features, additional sections, or non-breaking enhancements
- **PATCH**: Bug fixes, clarifications, typos, or minor corrections

### Current Version
**All files are currently at version: `4.0.0`** (Production Ready)

## 📋 Version Management Rules

### 1. Synchronized Versioning
**All YAML DSL files must maintain the same version number** to ensure consistency across the documentation system.

**Exception**: Patch-level updates may be applied to individual files if the change is file-specific and doesn't affect other documentation.

### 2. Version Update Triggers

#### MAJOR Version (X.0.0)
- Complete system architecture overhaul
- Database schema breaking changes (table renames, major structure changes)
- API breaking changes (endpoint removal, authentication changes)
- Technology stack major upgrades
- Business domain restructuring

#### MINOR Version (X.Y.0)
- New business features or capabilities
- Additional database tables or columns
- New API endpoints
- New integrations or services
- Enhanced security features
- New UI components or pages

#### PATCH Version (X.Y.Z)
- Documentation clarifications
- Typo corrections
- Minor configuration updates
- Non-breaking field additions
- Performance optimizations
- Bug fix documentation

### 3. Version Update Process

#### Step 1: Determine Version Impact
1. **Assess the Change**: What type of change is being made?
2. **Check Dependencies**: Does this affect other YAML files?
3. **Evaluate Breaking Changes**: Will existing implementations break?
4. **Determine Version Type**: MAJOR, MINOR, or PATCH?

#### Step 2: Update Metadata
Update the `metadata` section in all affected files:

```yaml
metadata:
  name: "File Name"
  version: "4.1.0"  # New version
  description: "Description of changes"
  last_updated: "2025-09-25"  # Current date
  change_reason: "Brief description of why version was updated"
```

#### Step 3: Update Change Log
Add entry to each file's change history (if maintained):

```yaml
version_history:
  - version: "4.1.0"
    date: "2025-09-25"
    changes:
      - "Added new integration support"
      - "Enhanced security specifications"
    breaking_changes: []
```

#### Step 4: Validate Consistency
Run validation scripts to ensure version consistency:

```bash
cd docs/maintenance/validation-scripts
npm run validate
npm run sync-check
```

#### Step 5: Update Documentation
Update relevant README files and documentation references.

## 🔍 Version Tracking

### Git Tagging Strategy
Tag releases with documentation versions:

```bash
# Tag major releases
git tag -a v4.0.0 -m "Business Platform v4.0.0 - Production Ready"

# Tag minor releases
git tag -a v4.1.0 -m "Business Platform v4.1.0 - Enhanced Integrations"

# Tag patch releases
git tag -a v4.0.1 -m "Business Platform v4.0.1 - Documentation Updates"
```

### Version History Maintenance
Maintain a changelog for significant versions:

#### Version 4.0.0 (Current - Production Ready)
- ✅ Complete 4-phase implementation
- ✅ Mobile-first responsive design
- ✅ AI-powered analytics
- ✅ Comprehensive integrations (Slack, Teams, GitHub)
- ✅ Enterprise-grade security
- ✅ Multi-method authentication

#### Version 3.0.0 (Previous)
- Advanced Analytics & Business Intelligence
- Predictive analytics and ML insights
- Executive KPI tracking

#### Version 2.0.0 (Previous)
- Resource & Time Management
- Budget management and variance reporting
- Advanced time tracking integration

#### Version 1.0.0 (Previous)
- Core workflow improvements
- Project templates and task management
- Real-time notifications

## 🛠️ Tools and Automation

### Validation Scripts
Use provided validation scripts for version management:

```bash
# Check version consistency across files
node docs/maintenance/validation-scripts/validate-yaml.js

# Check documentation sync with source code
node docs/maintenance/validation-scripts/sync-check.js
```

### Automated Version Updates
Consider implementing automated version updates in CI/CD:

```bash
# Example update script (to be implemented)
node docs/maintenance/scripts/update-versions.js --version 4.1.0 --type minor
```

### Version Validation
Implement git hooks to validate version consistency:

```bash
#!/bin/sh
# Pre-commit hook to validate YAML versions
cd docs/maintenance/validation-scripts
npm run validate || exit 1
```

## 📅 Release Planning

### Version Release Calendar
- **MAJOR Releases**: Quarterly (major feature releases)
- **MINOR Releases**: Monthly (new features, enhancements)
- **PATCH Releases**: As needed (bug fixes, clarifications)

### Pre-Release Checklist
Before updating versions:

- [ ] **Impact Assessment**: Determine version type and scope
- [ ] **Dependency Check**: Verify impact on other files
- [ ] **Validation**: Run all validation scripts
- [ ] **Testing**: Validate against source code
- [ ] **Documentation**: Update README files and guides
- [ ] **Git Tagging**: Tag the release appropriately

## 🎯 Best Practices

### 1. Consistent Updating
- **Update all related files together** when making cross-cutting changes
- **Don't leave files with inconsistent versions** after updates
- **Always validate after version updates**

### 2. Clear Change Documentation
- **Document why the version was updated** in commit messages
- **Maintain clear change descriptions** in metadata
- **Reference related code changes** when applicable

### 3. Backward Compatibility
- **Consider backward compatibility** when making changes
- **Document breaking changes clearly** in MAJOR version updates
- **Provide migration guides** for breaking changes

### 4. Regular Maintenance
- **Monthly version consistency audits**
- **Quarterly documentation sync reviews**
- **Annual major version planning**

## 🚨 Common Pitfalls to Avoid

### ❌ Don't Do This:
- Update versions inconsistently across files
- Skip validation after version updates
- Forget to update documentation after code changes
- Use arbitrary version numbers without following SemVer
- Make breaking changes in MINOR or PATCH updates

### ✅ Do This:
- Always run validation scripts after updates
- Follow semantic versioning strictly
- Document changes clearly
- Keep versions synchronized across files
- Plan version updates as part of development workflow

## 🔄 Migration Between Versions

### Upgrading from Previous Versions
When upgrading YAML DSL files:

1. **Check Breaking Changes**: Review what's changed
2. **Update References**: Update any automated tools or scripts
3. **Validate Compatibility**: Ensure source code alignment
4. **Test Integration**: Verify all validation scripts pass

### Rollback Procedures
If version updates cause issues:

1. **Identify the Issue**: What broke after the version update?
2. **Revert Changes**: Use git to revert to previous version
3. **Fix the Problem**: Address the underlying issue
4. **Re-attempt Update**: Try the version update again

---

*This versioning guide ensures that YAML DSL documentation remains consistent, traceable, and maintainable as the business platform evolves.*