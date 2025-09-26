# Contributing to Business Platform System

Thank you for your interest in contributing to our enterprise business platform! This document provides guidelines and information for contributors.

## 🚀 **Getting Started**

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Git knowledge
- Understanding of TypeScript, React, and Express

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/business-platform.git
   cd business-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Configure your local environment
   ```

4. **Initialize database**
   ```bash
   npm run db:push
   ```

5. **Run development server**
   ```bash
   npm run dev:safe
   ```

## 🏗️ **Development Workflow**

### Branch Strategy
- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`feature/*`**: New features (`feature/add-user-roles`)
- **`bugfix/*`**: Bug fixes (`bugfix/fix-auth-redirect`)
- **`hotfix/*`**: Critical production fixes (`hotfix/security-patch`)

### Commit Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

**Examples:**
```bash
feat(auth): add OAuth integration for Microsoft Teams
fix(gantt): resolve dependency visualization overlap
docs(api): update endpoint documentation for budget management
```

## 📝 **Coding Standards**

### TypeScript Guidelines
- **Type Safety**: Use strict TypeScript configuration
- **Interfaces**: Define clear interfaces for all data structures
- **Type Guards**: Implement proper type checking
- **Generics**: Use generics for reusable components

```typescript
// Good
interface ProjectData {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: Date;
}

// Avoid
const project: any = { /* ... */ };
```

### React Component Standards
- **Functional Components**: Use function components with hooks
- **TypeScript Props**: Define explicit prop interfaces
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Error Boundaries**: Handle errors gracefully

```typescript
interface ProjectCardProps {
  project: Project;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  // Component implementation
}
```

### Backend API Standards
- **RESTful Design**: Follow REST principles
- **Input Validation**: Use Zod schemas for validation
- **Error Handling**: Consistent error responses
- **Authentication**: Secure all endpoints appropriately

```typescript
// Route handler example
export async function createProject(req: Request, res: Response) {
  try {
    const projectData = insertProjectSchema.parse(req.body);
    const project = await db.insert(projects).values(projectData);
    res.status(201).json(project);
  } catch (error) {
    handleApiError(error, res);
  }
}
```

## 🧪 **Testing Requirements**

### Test Coverage
- **Unit Tests**: All utility functions and business logic
- **Integration Tests**: API endpoints and database operations
- **Component Tests**: React components with user interactions
- **E2E Tests**: Critical user workflows

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run frontend tests only
npm run test:frontend

# Run E2E tests
npm run test:e2e
```

### Writing Tests
```typescript
// Unit test example
describe('calculateProjectProgress', () => {
  it('should calculate progress correctly', () => {
    const tasks = [
      { status: 'completed', weight: 1 },
      { status: 'in_progress', weight: 1 },
      { status: 'pending', weight: 1 }
    ];

    const progress = calculateProjectProgress(tasks);
    expect(progress).toBe(33.33);
  });
});

// Component test example
test('ProjectCard displays project information', async () => {
  const mockProject = { id: '1', name: 'Test Project', status: 'active' };

  render(<ProjectCard project={mockProject} onEdit={vi.fn()} onDelete={vi.fn()} />);

  expect(screen.getByText('Test Project')).toBeInTheDocument();
  expect(screen.getByText('active')).toBeInTheDocument();
});
```

## 📊 **Database Guidelines**

### Schema Changes
- **Migrations**: Always create migration scripts for schema changes
- **Backwards Compatibility**: Ensure migrations don't break existing data
- **Validation**: Test migrations on sample data

### Database Operations
- **Type Safety**: Use Drizzle ORM with TypeScript
- **Transactions**: Use transactions for related operations
- **Indexing**: Consider performance implications

```typescript
// Good database operation
export async function createProjectWithTasks(projectData: InsertProject, tasks: InsertTask[]) {
  return await db.transaction(async (tx) => {
    const [project] = await tx.insert(projects).values(projectData).returning();

    const projectTasks = tasks.map(task => ({
      ...task,
      projectId: project.id
    }));

    await tx.insert(tasks).values(projectTasks);
    return project;
  });
}
```

## 🔐 **Security Guidelines**

### Authentication & Authorization
- **Never commit secrets**: Use environment variables
- **Validate all inputs**: Use Zod schemas
- **Rate limiting**: Implement appropriate rate limits
- **CORS**: Configure CORS properly

### Data Security
- **SQL Injection**: Use parameterized queries
- **XSS Prevention**: Sanitize user inputs
- **CSRF Protection**: Implement CSRF tokens
- **Password Security**: Use bcrypt for password hashing

## 🎨 **UI/UX Guidelines**

### Design System
- **Consistent Components**: Use Radix UI primitives
- **Responsive Design**: Mobile-first approach
- **Accessibility**: Follow WCAG 2.1 guidelines
- **Color Scheme**: Maintain consistent brand colors

### Mobile Considerations
- **Touch Targets**: Minimum 44px touch targets
- **Gesture Support**: Implement appropriate gestures
- **Performance**: Optimize for mobile devices
- **Offline Support**: Consider offline scenarios

## 🔗 **Integration Guidelines**

### Third-Party Services
- **Error Handling**: Graceful degradation when services are unavailable
- **Rate Limits**: Respect API rate limits
- **Webhook Security**: Verify webhook signatures
- **Configuration**: Make integrations configurable

### API Design
- **Versioning**: Plan for API versioning
- **Documentation**: Document all endpoints
- **Status Codes**: Use appropriate HTTP status codes
- **Error Messages**: Provide helpful error messages

## 📋 **Pull Request Process**

### Before Submitting
1. **Sync with main**: Rebase your branch on latest main
2. **Run tests**: Ensure all tests pass
3. **Type checking**: Fix all TypeScript errors
4. **Linting**: Follow code style guidelines
5. **Documentation**: Update relevant documentation

### PR Checklist
- [ ] Code follows project standards
- [ ] Tests added/updated for changes
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Database migrations tested
- [ ] Security considerations addressed

### Review Process
1. **Automated Checks**: CI pipeline must pass
2. **Code Review**: At least one team member review
3. **Testing**: Manual testing for UI changes
4. **Approval**: Required before merging

## 🐛 **Bug Reports**

### Reporting Bugs
Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:
- Clear reproduction steps
- Expected vs actual behavior
- Screenshots if applicable
- Environment details
- Browser/device information

### Bug Severity
- **Critical**: System unusable, data loss
- **High**: Major functionality broken
- **Medium**: Some functionality impacted
- **Low**: Minor issue, workaround available

## 💡 **Feature Requests**

### Proposing Features
Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) and include:
- Business problem description
- Proposed solution
- User stories
- Acceptance criteria
- Technical considerations

### Feature Development
1. **Discussion**: Discuss approach in GitHub issue
2. **Design**: Create technical design document
3. **Implementation**: Follow development workflow
4. **Testing**: Comprehensive test coverage
5. **Documentation**: Update user and technical docs

## 🔄 **Release Process**

### Version Management
- **Semantic Versioning**: MAJOR.MINOR.PATCH
- **Release Notes**: Automated generation from commits
- **Tagging**: Git tags for releases
- **Changelog**: Maintain CHANGELOG.md

### Deployment Pipeline
1. **Development**: Feature branches
2. **Staging**: Integration testing
3. **Production**: Stable releases
4. **Monitoring**: Post-deployment verification

## 📚 **Documentation Standards**

### Code Documentation
- **TSDoc Comments**: For complex functions
- **README Files**: For each major module
- **API Documentation**: OpenAPI specifications
- **Architecture Decisions**: ADR documents

### User Documentation
- **Feature Guides**: Step-by-step instructions
- **Screenshots**: Visual aids for complex features
- **Video Tutorials**: For workflow demonstrations
- **FAQ**: Common questions and answers

## 🤝 **Community Guidelines**

### Code of Conduct
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Provide constructive feedback
- Focus on the code, not the person

### Communication
- **GitHub Issues**: For bugs and feature requests
- **Pull Requests**: For code discussions
- **Discussions**: For general questions
- **Email**: For security vulnerabilities

## 📞 **Getting Help**

### Resources
- **Documentation**: Check `/docs` directory
- **Examples**: Look at existing code patterns
- **Tests**: Reference test files for usage examples
- **Issues**: Search existing issues for solutions

### Support Channels
- **GitHub Discussions**: General questions
- **Issue Tracker**: Bug reports and feature requests
- **Code Reviews**: PR feedback and guidance
- **Documentation**: Comprehensive guides and references

---

Thank you for contributing to our business platform! Your efforts help make this system better for everyone. 🚀