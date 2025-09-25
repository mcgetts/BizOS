# YAML DSL Update Procedures

This document outlines the standardized procedures for updating YAML DSL documentation files to ensure consistency, accuracy, and maintainability.

## 🔄 Update Workflow Overview

### Code-First Documentation Strategy
**Rule**: Source code changes trigger documentation updates, not the reverse.

1. **Code Changes** → 2. **Documentation Updates** → 3. **Validation** → 4. **Commit Together**

## 📋 Update Procedures by Change Type

### 1. Database Schema Changes

#### When to Update: `database-schema.yaml`
- New tables or columns added
- Table relationships modified
- Constraints or indexes changed
- Performance optimizations implemented

#### Procedure:
```bash
# 1. Make source code changes in shared/schema.ts
# 2. Update database-schema.yaml
# 3. Validate changes
cd docs/maintenance/validation-scripts
npm run validate
npm run sync-check

# 4. Update version if needed (follow versioning guide)
# 5. Commit both source and documentation together
git add shared/schema.ts docs/technical/database-schema.yaml
git commit -m "feat: add user skills table with documentation update

- Add userSkills table for competency tracking
- Update database-schema.yaml with new table definition
- Version: 4.0.0 (no breaking changes)"
```

#### Template for Database Updates:
```yaml
# Add to appropriate section in database-schema.yaml
new_table_name:
  description: "Brief description of table purpose"
  columns:
    id:
      type: "varchar"
      primary_key: true
      default: "gen_random_uuid()"
    # ... other columns
  indexes:
    - name: "idx_table_name_field"
      columns: ["field_name"]
```

### 2. API Endpoint Changes

#### When to Update: `api-endpoints.yaml`
- New endpoints added
- Endpoint parameters modified
- Authentication requirements changed
- Response format updates

#### Procedure:
```bash
# 1. Implement endpoint in server/routes.ts
# 2. Update api-endpoints.yaml
# 3. Test endpoint functionality
# 4. Validate documentation

cd docs/maintenance/validation-scripts
npm run validate
npm run sync-check

# 5. Commit changes
git add server/routes.ts docs/technical/api-endpoints.yaml
git commit -m "feat: add user skills API endpoints with documentation

- Add GET/POST /api/users/:id/skills endpoints
- Update api-endpoints.yaml with new endpoint specifications
- Include authentication and validation requirements"
```

#### Template for API Updates:
```yaml
# Add to appropriate section in api-endpoints.yaml
endpoint_name:
  path: "/api/resource/:id/action"
  method: "POST"
  description: "Brief description of endpoint purpose"
  authentication_required: true
  request_schema:
    required_fields:
      - "field_name"
    optional_fields:
      - "optional_field"
  response:
    success: "200 - Success description"
    error: "400 - Error conditions"
```

### 3. Frontend Component Changes

#### When to Update: `frontend-components.yaml`
- New components created
- Component architecture modified
- State management changes
- UI framework updates

#### Procedure:
```bash
# 1. Create/modify components in client/src/components/
# 2. Update frontend-components.yaml
# 3. Validate component documentation

cd docs/maintenance/validation-scripts
npm run validate
npm run sync-check

# 4. Commit changes
git add client/src/components/ docs/technical/frontend-components.yaml
git commit -m "feat: add skill management components with documentation

- Add UserSkillsEditor and SkillBadge components
- Update frontend-components.yaml with new component specifications
- Include props, state management, and usage patterns"
```

### 4. Integration Changes

#### When to Update: `integrations.yaml`
- New integrations added
- Integration features modified
- Webhook configurations changed
- Security updates

#### Procedure:
```bash
# 1. Implement integration in server/integrations/
# 2. Update integrations.yaml
# 3. Test integration functionality
# 4. Validate documentation

cd docs/maintenance/validation-scripts
npm run validate

# 5. Commit changes
git add server/integrations/ docs/integrations/integrations.yaml
git commit -m "feat: add Discord integration with documentation

- Add Discord integration for team notifications
- Update integrations.yaml with Discord configuration
- Include webhook setup and message formatting"
```

### 5. Security and Authentication Changes

#### When to Update: `security-auth.yaml`
- Authentication methods modified
- Security policies updated
- New authorization rules
- Compliance requirements added

#### Procedure:
```bash
# 1. Implement security changes in server/utils/authUtils.ts or server/replitAuth.ts
# 2. Update security-auth.yaml
# 3. Test security implementation
# 4. Validate documentation

cd docs/maintenance/validation-scripts
npm run validate

# 5. Commit changes
git add server/utils/ docs/technical/security-auth.yaml
git commit -m "feat: add MFA support with security documentation update

- Implement TOTP-based multi-factor authentication
- Update security-auth.yaml with MFA specifications
- Include setup procedures and security considerations"
```

### 6. System Architecture Changes

#### When to Update: `system-architecture.yaml` and/or `business-domains.yaml`
- Technology stack updates
- Deployment model changes
- Business domain modifications
- Performance target updates

#### Procedure:
```bash
# 1. Make system-level changes (package.json, configuration files)
# 2. Update appropriate architecture files
# 3. Validate all documentation consistency

cd docs/maintenance/validation-scripts
npm run validate
npm run sync-check

# 4. Update version numbers if breaking changes
# 5. Commit changes
git add package.json docs/architecture/
git commit -m "feat: upgrade to React 19 with architecture documentation update

- Upgrade React to version 19.x
- Update system-architecture.yaml with new framework version
- Update frontend-components.yaml with React 19 features
- Version bump to 4.1.0 for minor update"
```

## 🎯 Update Templates and Checklists

### Pre-Update Checklist
Before making any documentation changes:

- [ ] **Identify all affected YAML files**
- [ ] **Review current version numbers**
- [ ] **Check for cross-file dependencies**
- [ ] **Backup current documentation state**

### Standard Update Template
Use this template for commit messages:

```
<type>: <brief description> with documentation update

- <specific change 1>
- <specific change 2>
- Update <yaml-file> with <change description>
- Version: <version-number> (<version-type>)
```

**Types**: feat, fix, docs, refactor, perf, test, chore

### Post-Update Checklist
After making documentation changes:

- [ ] **Run validation scripts**
- [ ] **Check version consistency**
- [ ] **Verify cross-file references**
- [ ] **Test related functionality**
- [ ] **Update README files if needed**
- [ ] **Commit source code and documentation together**

## 🛠️ Automated Update Tools

### Validation Scripts
Always run these after updates:

```bash
cd docs/maintenance/validation-scripts

# Install dependencies (first time only)
npm install

# Validate YAML syntax and consistency
npm run validate

# Check documentation sync with source code
npm run sync-check

# Run both checks
npm run full-check
```

### Git Hooks Integration
Set up git hooks to enforce documentation updates:

```bash
# Pre-commit hook example
#!/bin/sh
echo "Validating YAML documentation..."
cd docs/maintenance/validation-scripts
npm run validate || {
  echo "❌ YAML validation failed. Please fix documentation before committing."
  exit 1
}

echo "Checking documentation sync..."
npm run sync-check || {
  echo "⚠️  Documentation may be out of sync with source code."
  echo "Consider updating YAML files before committing."
  # Don't fail commit, just warn
}
```

## 📊 Change Impact Assessment

### Impact Categories

#### 🔴 High Impact (Requires MAJOR version update)
- Database schema breaking changes
- API endpoint removal or breaking changes
- Authentication system overhaul
- Technology stack major upgrades

#### 🟡 Medium Impact (Requires MINOR version update)
- New features or capabilities
- New API endpoints
- Additional database tables
- New integrations

#### 🟢 Low Impact (Requires PATCH version update)
- Bug fixes and clarifications
- Performance optimizations
- Documentation improvements
- Minor configuration updates

### Cross-File Impact Matrix

| Change Type | system-arch | database | api-endpoints | frontend | security | integrations | business |
|-------------|-------------|----------|---------------|----------|----------|--------------|----------|
| New Feature | Maybe | Maybe | Likely | Likely | Maybe | Maybe | Maybe |
| DB Changes | Maybe | Always | Maybe | Unlikely | Unlikely | Unlikely | Maybe |
| API Changes | Unlikely | Unlikely | Always | Maybe | Maybe | Maybe | Unlikely |
| UI Changes | Unlikely | Unlikely | Unlikely | Always | Unlikely | Unlikely | Unlikely |
| Security | Maybe | Maybe | Maybe | Maybe | Always | Maybe | Unlikely |
| Integration | Maybe | Unlikely | Maybe | Maybe | Unlikely | Always | Unlikely |

## 🚨 Emergency Update Procedures

### Critical Security Updates
For urgent security fixes:

1. **Implement fix immediately**
2. **Update security-auth.yaml**
3. **Skip normal validation** (if necessary)
4. **Deploy fix**
5. **Complete documentation validation post-deployment**

### Hotfix Procedures
For production hotfixes:

1. **Create hotfix branch**
2. **Implement minimal fix**
3. **Update relevant YAML files**
4. **Quick validation**
5. **Deploy hotfix**
6. **Merge back to main with full validation**

## 🎯 Quality Assurance

### Documentation Quality Standards
- **Accuracy**: Documentation must match implementation
- **Completeness**: All features must be documented
- **Consistency**: Formatting and structure must be uniform
- **Clarity**: Documentation must be understandable
- **Maintainability**: Updates must be easy to make

### Review Process
1. **Self-Review**: Check your own updates
2. **Automated Validation**: Run all validation scripts
3. **Peer Review**: Have another developer review changes
4. **Integration Testing**: Verify functionality matches documentation

### Rollback Procedures
If updates cause issues:

1. **Identify the problem**
2. **Revert documentation changes**
3. **Fix the underlying issue**
4. **Re-attempt update with fixes**

---

*These update procedures ensure that YAML DSL documentation remains accurate, consistent, and synchronized with the evolving business platform codebase.*