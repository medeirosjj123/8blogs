# 🧪 Tatame Testing Suite

## Overview
This is a comprehensive, beginner-friendly testing suite for the Tatame platform. It includes unit tests, integration tests, and end-to-end tests designed to ensure the reliability and quality of the application.

## 📁 Structure

```
/tests/
├── unit/              # Pure function tests (no external dependencies)
├── integration/       # API and service integration tests
├── e2e/              # End-to-end user journey tests
├── helpers/          # Test utilities and setup
├── fixtures/         # Static test data
└── config/           # Test configuration
```

## 🚀 Quick Start

### Running Tests

```bash
# Run all tests in watch mode (for development)
npm test

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:api          # API tests only
npm run test:e2e          # E2E tests only

# Run all tests once (CI mode)
npm run test:all

# Run tests with coverage
npm run test:coverage

# Open test reports
npm run test:report
```

### E2E Testing

```bash
# Run E2E tests headless
npm run test:e2e

# Run E2E tests with browser visible
npm run test:e2e:headed

# Open Playwright UI for debugging
npm run test:e2e:ui

# Debug specific test
npm run test:e2e:debug

# Test mobile views
npm run test:e2e:mobile
```

## 📝 Writing Tests

### 1. Unit Tests
Test pure functions without external dependencies:

```typescript
// tests/unit/utils/myfunction.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/utils/myFunction';

describe('myFunction', () => {
  it('should return expected result', () => {
    expect(myFunction('input')).toBe('expected output');
  });
});
```

### 2. Integration Tests
Test API endpoints and service interactions:

```typescript
// tests/integration/api/endpoint.test.ts
import request from 'supertest';
import app from '../../../apps/api/src/app';

describe('GET /api/endpoint', () => {
  it('should return data', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
  });
});
```

### 3. E2E Tests
Test complete user journeys:

```typescript
// tests/e2e/journey.spec.ts
import { test, expect } from '@playwright/test';

test('user can complete task', async ({ page }) => {
  await page.goto('/');
  await page.click('button');
  await expect(page).toHaveURL('/success');
});
```

## 🛠️ Test Helpers

### Data Factories
Generate test data easily:

```typescript
import { createUser, createMessage } from '../helpers/factories';

const testUser = createUser();
const testMessage = createMessage({ content: 'Hello' });
```

### Authentication Helpers
Simplify auth in tests:

```typescript
import { loginAsStudent, loginAsAdmin } from '../helpers/auth-helper';

const { token } = await loginAsStudent(app);
```

### Database Setup
Manage test database:

```typescript
import { setupIntegrationTest, cleanupIntegrationTest } from '../helpers/setup';

beforeAll(async () => {
  await setupIntegrationTest();
});

afterAll(async () => {
  await cleanupIntegrationTest();
});
```

## 📊 Test Coverage

We aim for:
- **Unit Tests**: 80% coverage
- **Integration Tests**: Critical paths 100%
- **E2E Tests**: Main user journeys 100%

Check current coverage:
```bash
npm run test:coverage
```

## 🎯 What to Test

### Priority 1 (Critical)
- ✅ Authentication (login, signup, logout)
- ✅ Payment webhooks (Kiwify integration)
- ✅ Course access and progress
- ✅ Chat messaging

### Priority 2 (Important)
- ✅ User profile management
- ✅ Site installer
- ✅ File uploads
- ✅ Search functionality

### Priority 3 (Nice to have)
- Quiz functionality
- Email notifications
- Analytics tracking
- Performance metrics

## 🐛 Debugging Tests

### Unit/Integration Tests
```bash
# Run specific test file
npm test tests/unit/utils/auth.test.ts

# Run tests matching pattern
npm test -- --grep "should validate email"

# Run with debugging
node --inspect-brk ./node_modules/.bin/vitest
```

### E2E Tests
```bash
# Debug mode with Playwright Inspector
npm run test:e2e:debug

# Generate trace for failed tests
npm run test:e2e -- --trace on

# Run specific test file
npm run test:e2e tests/e2e/critical-paths.spec.ts

# Run tests with specific tag
npm run test:e2e -- --grep @smoke
```

## 🔧 Configuration

### Environment Variables
Create `.env.test` for test-specific config:

```env
TEST_API_URL=http://localhost:3001
TEST_FRONTEND_URL=http://localhost:5173
TEST_MONGODB_URI=mongodb://localhost:27017/tatame_test
```

### Test Users
Default test users are configured in `tests/config/test-env.ts`:
- Admin: `admin@test.tatame.com`
- Student: `student@test.tatame.com`
- Mentor: `mentor@test.tatame.com`

## 📈 CI/CD Integration

Tests run automatically on:
- **Pre-commit**: Linting and unit tests
- **Pull Request**: Full test suite
- **Main branch**: All tests + coverage report
- **Pre-deploy**: Smoke tests

GitHub Actions workflow example:
```yaml
- name: Run Tests
  run: |
    npm ci
    npm run test:ci
```

## 🚨 Common Issues

### Issue: Tests fail with "Cannot connect to database"
**Solution**: Ensure MongoDB is running and TEST_MONGODB_URI is set

### Issue: E2E tests timeout
**Solution**: Increase timeout in `playwright.config.ts` or check if dev server is running

### Issue: "Module not found" errors
**Solution**: Check path aliases in `vitest.config.ts`

### Issue: Flaky tests
**Solution**: Use `waitFor` helpers and proper assertions with timeouts

## 📚 Best Practices

1. **Keep tests simple and readable**
   - One assertion per test when possible
   - Clear test descriptions
   - Use helpers to reduce duplication

2. **Test behavior, not implementation**
   - Focus on what the code does, not how
   - Don't test private methods directly

3. **Use proper setup and teardown**
   - Clean database between tests
   - Reset mocks after each test
   - Don't depend on test order

4. **Make tests fast**
   - Mock external services
   - Use test database
   - Parallelize when possible

5. **Write tests as you code**
   - TDD when possible
   - At minimum, test before pushing

## 📖 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

## 🤝 Contributing

When adding new features:
1. Write unit tests for utilities
2. Write integration tests for APIs
3. Add E2E test for user flow
4. Ensure all tests pass: `npm run test:all`
5. Check coverage: `npm run test:coverage`

---

Happy Testing! 🎉