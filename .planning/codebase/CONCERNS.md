# Codebase Concerns

**Analysis Date:** 2026-01-21

## Tech Debt

**Missing Email Verification & Password Reset Features:**
- Issue: Three TODOs in `auth.service.ts` for unimplemented critical authentication features
- Files: `server/src/services/auth.service.ts` (lines 195-209)
- Impact: Users cannot verify email addresses or reset forgotten passwords. These endpoints return 501 errors instead of functioning.
- Fix approach: Implement email verification token generation/validation logic and password reset flow with secure token handling and expiration.

**Missing Database Migrations:**
- Issue: No `migrations` folder exists in `server/prisma/`
- Files: `server/prisma/` (missing directory)
- Impact: Database schema cannot be versioned or safely deployed to production. Fresh deployments cannot apply incremental migrations.
- Fix approach: Create migration infrastructure with `npx prisma migrate dev` and commit migrations to version control for reproducible deployments.

**Weak Input Validation:**
- Issue: Controllers accept raw query parameters without validation or sanitization
- Files: `server/src/controllers/deal.controller.ts` (lines 8-60, 87-89)
- Impact: SQL injection (indirectly through Prisma, but unsanitized strings passed to search), XSS in JSON parsing errors, and invalid type coercion (e.g., `req.query.sortBy as any`)
- Fix approach: Use `express-validator` or `zod` to validate all input parameters before processing. Validate sortBy/sortOrder against whitelist of allowed values.

**Silent JSON Parse Failures:**
- Issue: JSON parsing in controllers silently swallows errors with bare `catch` blocks
- Files: `server/src/controllers/deal.controller.ts` (line 22)
- Impact: Malformed filter JSON is silently ignored, leading to inconsistent query behavior that's hard to debug
- Fix approach: Log parse failures and return validation errors instead of silently proceeding

**Overly Permissive Type Casting:**
- Issue: Multiple `as any` and `as string` casts bypass TypeScript safety
- Files: `server/src/controllers/deal.controller.ts` (lines 53-54, 76, 106, 123)
- Impact: Runtime errors not caught at compile time; invalid enum values could be passed to database queries
- Fix approach: Define strict types and enums for sortBy, sortOrder, and other constrained values; validate at route level

**Missing Database Connection Pool Configuration:**
- Issue: PrismaClient created with default pool settings
- Files: `server/src/config/database.ts` (line 4)
- Impact: Under high load, connection pool exhaustion causes request failures. No visible configuration for tuning pool size or timeouts.
- Fix approach: Add explicit pool configuration with appropriate limits based on deployment environment

**Implicit Error Recovery in External API Calls:**
- Issue: eBay API calls will throw unhandled errors if credentials are missing at runtime
- Files: `server/src/services/ebay.service.ts` (lines 15-44)
- Impact: Missing env vars cause runtime crashes instead of startup validation; no circuit breaker or retry logic
- Fix approach: Validate API credentials at service initialization; add retry logic with exponential backoff for transient failures

**AI Service API Key Validation Gap:**
- Issue: Gemini API key silently defaults to empty string if env var missing
- Files: `server/src/services/ai.service.ts` (line 5)
- Impact: API calls will fail at runtime with cryptic Google auth errors instead of clear startup validation
- Fix approach: Validate GEMINI_API_KEY required in env.ts and throw at startup if missing

---

## Known Bugs

**Potential Race Condition in Refresh Token Generation:**
- Symptoms: Under concurrent requests, duplicate refresh tokens could be created for the same user
- Files: `server/src/services/auth.service.ts` (lines 133-139)
- Trigger: Multiple simultaneous refresh token requests from same user; token is deleted then new one created, but creation is not atomic
- Workaround: Implement database-level unique constraint on (userId, expiresAt) or use transaction with unique violation handling

**Filter Pattern Matching Too Broad:**
- Symptoms: Legitimate listings with "parts" in description filtered out (e.g., "spare parts included")
- Files: `server/src/services/tmv-engine.ts` (lines 122-133, 156-163)
- Trigger: Any listing title containing "parts only", "for parts", "bundle", etc. is marked suspect
- Workaround: Use stricter patterns like "^for parts" or "for parts only$" instead of substring matching

**Market Data Freshness Not Enforced:**
- Symptoms: TMV calculations with 6+ month old data treated same as recent data
- Files: `server/src/services/tmv-engine.ts` (lines 261-277)
- Trigger: No minimum freshness requirement; recencyDistribution warns but doesn't block calculation
- Workaround: Add maxAgeDays default parameter (e.g., 90 days) and reject calculations with insufficient recent data

---

## Security Considerations

**No Input Validation on Auth Routes:**
- Risk: No email format validation, password strength validation, or rate limiting on auth endpoints
- Files: `server/src/routes/auth.routes.ts`, `server/src/controllers/auth.controller.ts` (lines 6-51)
- Current mitigation: Database unique constraint prevents duplicate emails; bcrypt prevents weak password storage
- Recommendations: Add express-validator middleware for email format, password complexity (min 8 chars, mixed case, numbers). Implement per-IP rate limiting on login/register endpoints to prevent brute force.

**Sensitive Data in Error Responses:**
- Risk: Development mode exposes full error stack traces and database query details in responses
- Files: `server/src/middleware/errorHandler.ts` (lines 29, 43-46)
- Current mitigation: Stack traces only shown in development mode
- Recommendations: Ensure NODE_ENV is never 'development' in production. Consider stripping PII from error messages even in dev.

**No CORS Validation Strictness:**
- Risk: CORS_ORIGIN config split by comma but no validation of values; invalid origins could be accepted
- Files: `server/src/config/env.ts` (line 59)
- Current mitigation: Helm/env configuration likely ensures correct values
- Recommendations: Validate each origin URL format before setting CORS; reject invalid URLs at startup.

**JWT Secret Minimum Length Not Strong Enough:**
- Risk: 32-character minimum is sufficient but no complexity requirement (could be "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
- Files: `server/src/config/env.ts` (line 12)
- Current mitigation: Operating assumption that ops team uses strong random values
- Recommendations: Validate JWT_SECRET has sufficient entropy (e.g., base64 encoded 32+ random bytes); log warning if using default/weak values.

**No Request Size Limits:**
- Risk: Express server has no maximum request body/payload size, vulnerable to memory exhaustion attacks
- Files: `server/src/app.ts` (missing body parser config)
- Current mitigation: None visible
- Recommendations: Add `express.json({ limit: '10kb' })` and `express.urlencoded({ limit: '10kb' })` middleware.

**Unencrypted Refresh Tokens in Database:**
- Risk: Refresh tokens stored as plaintext in database; SQL injection or DB breach exposes all user sessions
- Files: `server/prisma/schema.prisma` (line 39)
- Current mitigation: Tokens are JWT-signed but not hashed; database access required to compromise
- Recommendations: Hash refresh tokens with bcrypt before storage; compare hash on use. Store token hash only, never plaintext.

**No Audit Logging for Security Events:**
- Risk: Failed logins, permission changes, token refreshes not logged; impossible to detect suspicious patterns
- Files: `server/src/services/auth.service.ts`, `server/src/middleware/auth.ts`
- Current mitigation: `logger.info()` calls log successful operations but not failures
- Recommendations: Log failed login attempts with IP/email, failed auth middleware hits, refresh token usage, and any 403 errors.

---

## Performance Bottlenecks

**Redundant Database Queries in TMV Calculation:**
- Problem: Deal stats endpoint makes 4 separate Promise.all() queries for totalDeals, avgDealScore, avgProfit, topCategories
- Files: `server/src/services/deal.service.ts` (lines 148-165)
- Cause: Each metric requires separate aggregate call; could batch into single query
- Improvement path: Use Prisma raw queries or refactor to single aggregation with multiple return values

**N+1 Query Potential in Auth Middleware:**
- Problem: Every authenticated request queries database to verify user still exists
- Files: `server/src/middleware/auth.ts` (lines 37-40)
- Cause: No caching or session-based verification; JWT payload not trusted
- Improvement path: Cache user active status in Redis with 5-10 min TTL; only verify on refresh or permission checks

**Full Table Scans for Category/Marketplace Listing:**
- Problem: `getCategories()` and `getMarketplaces()` scan entire deals table to find distinct values
- Files: `server/src/services/deal.service.ts` (lines 127-145)
- Cause: No aggregation table; query must evaluate every deal row
- Improvement path: Maintain separate Category and Marketplace tables with counts; update on deal create/delete

**Median Calculation Creates Array Copies:**
- Problem: `median()` and `quantileInclusive()` sort array copies on every call; TMV engine calls these multiple times per calculation
- Files: `server/src/services/tmv-engine.ts` (lines 165-186)
- Cause: No sorting memoization; calculates q1, q3, median, timeWeightedMedian all sorting same data
- Improvement path: Sort once and pass sorted array to all percentile calculations

**Unbounded DISTINCT Queries:**
- Problem: No limit on category/marketplace queries; could return thousands of values
- Files: `server/src/services/deal.service.ts` (lines 128-134, 138-144)
- Cause: Full result set returned to client; no pagination or top-N limiting
- Improvement path: Add LIMIT and possibly categorize into "Other" bucket for very long lists

---

## Fragile Areas

**TMV Engine Statistical Calculations:**
- Files: `server/src/services/tmv-engine.ts` (entire file)
- Why fragile: Complex multi-stage filtering (validation → deduplication → condition filtering → IQR → time weighting) with multiple exit points. Changes to any filter threshold silently changes recommendation quality. No unit tests visible for edge cases (empty data, single data point, all outliers).
- Safe modification: Add comprehensive unit tests for each filter stage; test with edge cases (0 items, 1 item, 100 items, all same price, all different prices). Document assumptions about minimum sample sizes and create acceptance tests with known good data.
- Test coverage: Missing unit tests for TMVEngine class methods

**Deal Score Calculation Formula:**
- Files: `server/src/services/tmv-engine.ts` (lines 571-598)
- Why fragile: Weighted scoring formula with magic numbers (0.4, 0.3, 0.2, 0.1) and confidence threshold of 60. Changes to weights change recommendation thresholds for all deals. No A/B testing infrastructure for formula changes.
- Safe modification: Extract weights to constants with clear semantics. Add decision boundary tests. Implement feature flag for formula versioning. Add metrics collection to measure deal score performance vs actual outcomes.
- Test coverage: No unit tests for DealScorer class

**Authentication Token Management:**
- Files: `server/src/services/auth.service.ts` (lines 103-148)
- Why fragile: Refresh token rotation with manual delete before insert is not atomic; concurrent requests could fail. Token expiration hardcoded to 30 days with no way to adjust per-user or per-deployment.
- Safe modification: Wrap refresh token generation in database transaction. Add config for token expiration. Add revocation list for emergency token invalidation.
- Test coverage: Test file covers happy path but missing tests for concurrent refresh, expired token edge cases, and rate limiting

**Authorization Role Checking:**
- Files: `server/src/middleware/auth.ts` (lines 67-79)
- Why fragile: Simple string matching against `req.user.role`; no role hierarchy (admin doesn't implicitly grant user permissions). Adding new roles requires updating all authorize() calls.
- Safe modification: Implement role-based access control (RBAC) with permission matrix. Add role hierarchy. Validate role exists against enum before use.
- Test coverage: No visible tests for authorization middleware

**Prisma Query Construction in Deal Service:**
- Files: `server/src/services/deal.service.ts` (lines 25-79)
- Why fragile: No validation that sortBy values match allowed columns; `[sortBy]: sortOrder` could crash if sortBy is invalid. minDealScore/maxPrice validation missing; negative values accepted.
- Safe modification: Whitelist allowed sortBy values. Add parameter validation with min/max bounds. Use Prisma findMany validation error handling.
- Test coverage: Missing tests for invalid sort parameters and price filters

---

## Scaling Limits

**Single Database Connection Pool:**
- Current capacity: Default Prisma client pool ~10 connections
- Limit: ~10 concurrent database operations; beyond that, requests queue or fail
- Scaling path: Add explicit pool configuration with min/max sizes. Monitor connection pool metrics. Consider read replicas for read-heavy endpoints (deal listings, stats).

**In-Memory TMV Engine Recalculation:**
- Current capacity: Can calculate TMV for hundreds of listings but recalculates on every request
- Limit: High CPU under load; no caching of results or partial calculations
- Scaling path: Implement Redis caching of TMV results with 1-hour TTL. Cache keyed on (category, conditionFilter, maxAgeDays). Invalidate on new sold listings in category.

**No Job Queue for Long-Running Operations:**
- Current capacity: All operations must complete within HTTP request timeout
- Limit: Marketplace sync operations or bulk deal analysis would timeout
- Scaling path: Implement Bull or similar job queue for async tasks. Store marketplace sync jobs, deal analysis requests asynchronously with status polling.

**Marketplace API Token Management:**
- Current capacity: Single eBay API client regenerates token on each request
- Limit: API rate limit hits if token generation called excessively; no token reuse across requests
- Scaling path: Cache OAuth tokens with TTL; regenerate only on 401 response. Implement exponential backoff for API failures.

---

## Dependencies at Risk

**@google/genai Package Risk:**
- Risk: Package uses `@ts-ignore` comment; type definitions unavailable or mismatched
- Impact: AI service methods may return unexpected types; runtime errors in response parsing
- Migration plan: Upgrade to latest Google AI SDK or use official Google Generative AI client library with proper types

**express-rate-limit Version Gap:**
- Risk: Using v7.5.0; current latest is 8.x with breaking changes not evaluated
- Impact: May miss security improvements or have incompatibilities with Express 5
- Migration plan: Review breaking changes; test upgrade path; add integration tests for rate limiting

**Prisma Client Version Lock:**
- Risk: Using 5.22.0; newer 6.x available with potential breaking changes
- Impact: Missing security patches and performance improvements
- Migration plan: Review migration guide; test query compatibility; update gradually with feature branch

**bcryptjs vs bcrypt:**
- Risk: Using bcryptjs (pure JS) instead of bcrypt (native); bcryptjs is slower and may have different security characteristics
- Impact: Slower password hashing; potential security difference in edge cases
- Migration plan: Evaluate switching to native bcrypt for performance; requires build toolchain changes

---

## Missing Critical Features

**Email Verification System:**
- Problem: Users can register with any email without verification; no way to confirm ownership
- Blocks: Legitimate password reset workflows, email-based notifications, contact verification
- Implementation needed: Token generation on signup, email sending via nodemailer/SendGrid, verification endpoint, automatic deletion of unverified accounts after N days

**Password Reset Flow:**
- Problem: Users with forgotten passwords cannot regain access; no self-service recovery
- Blocks: User retention, support burden increases, security incidents without password rotation
- Implementation needed: Forgot password endpoint, secure reset token generation, reset endpoint with new password validation, token expiration handling

**Audit Trail for Admin Actions:**
- Problem: No logging of who changed what and when; compliance gaps for financial/marketplace data
- Blocks: Debugging user issues, detecting unauthorized access, compliance with data regulations
- Implementation needed: Audit log model, middleware to track mutations, API for querying audit history

**Rate Limiting Configuration:**
- Problem: Rate limits hardcoded in env; no per-endpoint customization or user-tier based limits
- Blocks: Protecting expensive endpoints (AI analysis, marketplace sync), preventing abuse
- Implementation needed: Configurable rate limits per endpoint, user tier-based limits, sliding window implementation

---

## Test Coverage Gaps

**TMV Engine Statistical Methods:**
- What's not tested: `iqrFilter()`, `timeWeightedMedian()`, `calculateConfidence()`, `calculateVelocity()`, `calculateTrendWindowed()`, `normalizeCondition()`
- Files: `server/src/services/tmv-engine.ts` (entire class)
- Risk: Changes to statistical calculations silently break deal scoring with no coverage to catch it
- Priority: High - Core business logic for deal recommendations

**Deal Service Query Logic:**
- What's not tested: Filter combinations, sort order validation, pagination edge cases (page 0, negative limit), count accuracy
- Files: `server/src/services/deal.service.ts` (lines 25-79)
- Risk: Invalid queries could return wrong data or crash with bad parameters
- Priority: High - Data retrieval is critical path

**Error Conditions and Edge Cases:**
- What's not tested: Network failures in eBay/AI calls, missing env vars, database connection loss, malformed API responses
- Files: `server/src/services/ebay.service.ts`, `server/src/services/ai.service.ts`
- Risk: Unknown failure modes in production; error recovery paths untested
- Priority: High - Reliability depends on proper error handling

**Authorization Middleware:**
- What's not tested: Role-based access control, missing user context, invalid token formats
- Files: `server/src/middleware/auth.ts`
- Risk: Security vulnerability; unauthorized users could access protected resources
- Priority: Critical - Security-critical code

**Input Validation:**
- What's not tested: SQL injection vectors, XSS payloads in text fields, oversized payloads, type coercion attacks
- Files: `server/src/controllers/` (all files)
- Risk: Injection attacks, server crashes from malformed input
- Priority: High - First line of defense against attacks

**Concurrent Operations:**
- What's not tested: Simultaneous token refreshes, duplicate deal creation with same marketplace ID, race conditions on watch list updates
- Files: `server/src/services/auth.service.ts`, `server/src/services/deal.service.ts`
- Risk: Data corruption, lost updates, duplicate tokens
- Priority: Medium - Affects reliability under load

---

*Concerns audit: 2026-01-21*
