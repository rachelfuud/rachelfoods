# Contributing to RachelFoods

Thank you for your interest in contributing to RachelFoods! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 16.x
- npm or yarn
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/rachelfoods.git
   cd rachelfoods
   ```
3. Install dependencies:

   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

4. Set up environment variables (see `.env.example` files)
5. Run database migrations:
   ```bash
   cd backend
   npx prisma migrate dev
   ```

## Development Workflow

### Branch Naming

- Feature: `feature/descriptive-name`
- Bug fix: `fix/descriptive-name`
- Hotfix: `hotfix/descriptive-name`
- Documentation: `docs/descriptive-name`

### Development Process

1. Create a new branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Write/update tests
4. Run tests locally:

   ```bash
   # Backend
   cd backend
   npm test
   npm run lint

   # Frontend
   cd frontend
   npm test
   npm run build
   ```

5. Commit your changes (see [Commit Messages](#commit-messages))
6. Push to your fork
7. Open a Pull Request

## Coding Standards

### Backend (NestJS)

- Follow NestJS best practices
- Use dependency injection
- Write unit tests for services
- Use DTOs for validation
- Document complex business logic
- Use Prisma for database operations

### Frontend (Next.js)

- Use TypeScript strictly
- Follow React best practices
- Use semantic HTML
- Implement responsive design
- Use Tailwind CSS for styling
- Avoid inline styles
- Write accessible components (ARIA labels, keyboard navigation)

### General

- Use meaningful variable and function names
- Keep functions small and focused
- Comment complex logic
- Remove console.logs before committing
- No hardcoded credentials or secrets

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(catalog): add product search functionality

Implement search bar with autocomplete dropdown that searches
product names, descriptions, and categories.

Closes #123
```

```
fix(auth): resolve JWT token expiration issue

Update token refresh logic to handle edge case where token
expires during request processing.
```

## Pull Request Process

1. **Before Opening PR:**
   - Ensure all tests pass
   - Update documentation if needed
   - Rebase on latest `develop` branch
   - Squash commits if necessary

2. **PR Description:**
   - Use the PR template
   - Describe what changes were made
   - Reference related issues
   - Include screenshots for UI changes
   - Document breaking changes

3. **Review Process:**
   - Address reviewer feedback
   - Keep PR scope focused
   - Be responsive to comments
   - Update PR description if scope changes

4. **Merging:**
   - PRs require at least one approval
   - All CI checks must pass
   - Merge conflicts must be resolved
   - Squash and merge for clean history

## Testing

### Backend Tests

```bash
cd backend
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:cov        # Coverage report
```

### Frontend Tests

```bash
cd frontend
npm test                # Run all tests
npm run test:watch     # Watch mode
```

### E2E Tests

```bash
cd backend
npm run test:e2e       # End-to-end tests
```

### Test Coverage

- Maintain >80% code coverage
- Write tests for new features
- Update tests for bug fixes
- Test edge cases and error handling

## Critical Areas (Require Extra Scrutiny)

These modules handle financial transactions and require rigorous review:

### Payment Processing (`backend/src/payments`)

- **Real money operations**: All changes must prevent double-charging, lost payments
- **Webhook security**: NEVER skip Stripe signature verification
- **Idempotency**: Check for existing PaymentIntents before creating new ones
- **Error handling**: Payment failures must be logged and user-friendly

### Wallet System (`backend/src/wallet`)

- **Balance integrity**: All operations wrapped in database transactions (`prisma.$transaction()`)
- **Audit trails**: Every credit/debit must create a wallet_transaction record
- **Negative balance prevention**: Use database-level checks and row locking
- **Immutability**: Never delete wallet transaction records

### Inventory Management (`backend/src/kitchen-refill`)

- **Oversell prevention**: Use `SELECT ... FOR UPDATE` for stock checks
- **Reservation system**: Lock inventory during order creation, release on failure
- **Atomic operations**: Wrap inventory updates in transactions
- **Stock consistency**: Validate stock levels before payment processing

### Refunds (`backend/src/refunds`)

- **Duplicate prevention**: Check for existing refunds before processing
- **Wallet credit**: Must be atomic with refund record creation
- **Order status sync**: Update order payment status when refund completes
- **Stripe reconciliation**: Handle webhook events for refund completion

## Non-Negotiable Rules

❌ **NEVER**:

- Modify wallet balance without creating a transaction record
- Skip webhook signature verification for Stripe events
- Use `any` type for payment, wallet, or financial data structures
- Deploy database migrations without testing rollback procedures
- Expose stack traces, database errors, or sensitive data in API responses
- Allow concurrent payment attempts for the same order (use idempotency keys)
- Delete audit trail records (wallet transactions, payment logs, refund history)
- Bypass authentication or authorization guards for convenience

✅ **ALWAYS**:

- Wrap multi-step financial operations in `prisma.$transaction()`
- Validate all DTOs with `class-validator` decorators
- Log all financial operations with structured logging (Winston)
- Check for existing records before creating duplicates (payments, refunds)
- Use row-level database locking for inventory updates
- Include correlation IDs in logs for request tracing
- Test payment flows with Stripe test cards before deploying
- Document breaking changes in migration notes

## Database Migrations

When making schema changes:

1. Create migration:

   ```bash
   cd backend
   npx prisma migrate dev --name descriptive_migration_name
   ```

2. Document migration in PR
3. Test migration on clean database
4. Include rollback instructions if complex

## Questions?

If you have questions:

- Check existing issues and discussions
- Review documentation in `/docs`
- Ask in PR comments
- Contact maintainers

Thank you for contributing to RachelFoods! 🎉
