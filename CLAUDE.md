# CleanDay CRM - Development Guidelines

## Security Rules (OWASP Top 10)

All code changes must adhere to these security principles:

### 1. Broken Access Control
- Always verify user permissions before allowing access to resources
- Deny by default - explicitly grant access rather than deny
- Check `user.role` and `user.companyId` on every API endpoint
- Never expose internal IDs in URLs without authorization checks

### 2. Security Misconfiguration
- Never commit secrets or credentials to the repository
- Use environment variables for all sensitive configuration
- Minimize exposed endpoints and features
- Keep dependencies updated and patched

### 3. Software Supply Chain Security
- Vet all new dependencies before adding
- Monitor for vulnerabilities with `npm audit`
- Pin dependency versions in package.json
- Review dependency updates before merging

### 4. Cryptographic Failures
- Use bcrypt for password hashing (already implemented)
- Use strong algorithms (AES-256, RSA-2048+)
- Classify data sensitivity and encrypt appropriately
- Never store API keys or tokens in plain text in the database
- Mask sensitive data in API responses (e.g., `••••••••` + last 4 chars)

### 5. Injection Prevention
- Use Prisma ORM for all database queries (parameterized by default)
- Validate all input with Zod schemas
- Sanitize user input before display
- Never use string concatenation for queries

### 6. Insecure Design
- Threat model new features before implementation
- Use secure design patterns
- Implement rate limiting on authentication endpoints
- Follow principle of least privilege

### 7. Authentication Failures
- Enforce strong password requirements
- Implement secure session management with NextAuth
- Use HTTP-only cookies for session tokens
- Implement account lockout after failed attempts
- Support MFA for sensitive operations (future)

### 8. Software/Data Integrity Failures
- Verify all updates and patches
- Secure CI/CD pipeline
- Sign commits when possible
- Validate data integrity on import/export

### 9. Security Logging
- Log all authentication events (login, logout, failures)
- Log access to sensitive data
- Log all admin actions
- Monitor for suspicious activity
- Never log sensitive data (passwords, tokens, full API keys)

### 10. Exception Handling
- Use global error handlers
- Return generic error messages to users
- Log detailed errors server-side only
- Never expose stack traces in production
- Handle all async errors properly

## Code Standards

### API Endpoints
```typescript
// Always check authentication
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

// Always check authorization
if (user.role !== 'OWNER') {
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}

// Always validate input
const validatedData = schema.parse(body);

// Always check resource ownership
if (resource.companyId !== user.companyId) {
  return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
}
```

### Sensitive Data
- API keys: Mask in responses, check for masked values before updating
- Passwords: Never return, use bcrypt
- Personal data: Only return what's necessary

## Timezone Handling
- All times are stored in UTC in the database
- All times are displayed in PST/PDT (America/Los_Angeles)
- Use `parseDateInCompanyTZ()` for input parsing
- Use `formatDateTime()` for display
