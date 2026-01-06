# Commit Message Conventions

## Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

## Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes

## Examples

### Feature Development
```
feat(frontend): add video upload component with drag-and-drop
feat(backend): implement YouTube transcript extraction
feat(auth): add JWT-based authentication system
```

### Bug Fixes
```
fix(server): resolve EADDRINUSE port conflict on restart
fix(frontend): handle API errors gracefully in UrlInput component
fix(security): patch XSS vulnerability in user input sanitization
```

### Technical Debt
```
refactor(services): extract LLM service into provider-agnostic wrapper
refactor(middleware): consolidate validation logic into reusable functions
refactor(tests): improve test coverage for video processing workflow
```

### Documentation
```
docs(readme): add deployment instructions for AWS
docs(api): document new video processing endpoints
docs(dev): update development setup guide
```

### Infrastructure
```
chore(deps): upgrade Express to 4.18.2 for stability
chore(ci): add automated security scanning
chore(env): add environment variable validation
```

## Good vs Bad Examples

### ✅ Good
```
feat(video): implement async video processing with progress tracking

- Add background job queue for video processing
- Implement progress updates via WebSocket
- Add retry logic for failed transcript extraction
- Update frontend to show real-time progress

Closes #123
```

### ❌ Bad
```
fixed stuff
updated things
wip
```

## Branch Naming
- `feature/video-processing`
- `fix/port-conflict`
- `refactor/auth-system`
- `docs/api-documentation`

## Pull Request Titles
Follow the same convention as commits:
```
feat(video): implement async video processing with progress tracking
fix(security): resolve XSS vulnerability in user input
refactor(services): extract LLM service into provider-agnostic wrapper
```
