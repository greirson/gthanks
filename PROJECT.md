# gthanks - Implementation Roadmap & Missing Features

**Last Updated**: 2025-11-17
**Status**: Production-ready MVP with identified gaps and improvements needed

---

## 🔴 CRITICAL PRIORITY - Security & Foundation

### 1. **Rate Limiting - Distributed Implementation**
   - **Status**: ⚠️ In-memory only (single-instance)
   - **Issue**: Current rate limiting won't scale across multiple serverless instances
   - **Action Required**:
     - Migrate to Redis/Upstash for distributed rate limiting
     - Add connection pooling for Redis
     - Update middleware to use distributed storage
     - Test with multiple Vercel instances
   - **Impact**: Security risk under load, DoS vulnerability in multi-instance deployments

### 2. **CSRF Protection**
   - **Status**: ❌ Not documented/verified
   - **Issue**: No explicit CSRF token validation mentioned in API routes or middleware
   - **Action Required**:
     - Verify NextAuth CSRF protection is enabled
     - Add CSRF tokens to state-changing forms
     - Document CSRF strategy in security guide
     - Test CSRF attack scenarios
   - **Impact**: Critical security vulnerability for authenticated actions

### 3. **Input Sanitization & XSS Prevention**
   - **Status**: ⚠️ Zod validation exists but sanitization unclear
   - **Issue**: No explicit HTML sanitization strategy documented
   - **Action Required**:
     - Audit all user-generated content fields (wish notes, list descriptions, group names)
     - Implement DOMPurify or similar sanitization
     - Add CSP headers to middleware
     - Test XSS attack vectors (stored, reflected, DOM-based)
   - **Impact**: High-severity XSS vulnerability potential

### 4. **Database Connection Pooling (Production)**
   - **Status**: ⚠️ Not configured for PostgreSQL production
   - **Issue**: No explicit connection pool limits or PgBouncer setup documented
   - **Action Required**:
     - Configure Prisma connection pooling (`connection_limit` parameter)
     - Document PgBouncer setup for high-traffic deployments
     - Add connection pool monitoring
     - Test under load with connection exhaustion scenarios
   - **Impact**: Database connection exhaustion under moderate load

### 5. **Session Security Hardening**
   - **Status**: ⚠️ Session regeneration implemented but needs audit
   - **Issue**: Need comprehensive session security audit
   - **Action Required**:
     - Verify session fixation prevention (regenerateSession implemented)
     - Add session timeout enforcement (idle timeout)
     - Implement concurrent session limits
     - Add session hijacking detection (IP/User-Agent checks)
     - Document session security strategy
   - **Impact**: Session hijacking and fixation attacks possible

### 6. **SQL Injection Prevention Audit**
   - **Status**: ✅ Likely safe (Prisma ORM) but unverified
   - **Issue**: No explicit audit of raw SQL usage
   - **Action Required**:
     - Search codebase for `$queryRaw` and `$executeRaw`
     - Verify all raw queries use parameterized statements
     - Document SQL injection prevention strategy
     - Add ESLint rule to prevent unsafe raw SQL
   - **Impact**: SQL injection vulnerability if raw queries used incorrectly

---

## 🟠 HIGH PRIORITY - Infrastructure & Performance

### 7. **File Upload Security**
   - **Status**: ⚠️ Image uploads exist but need security review
   - **Issue**: File upload limits, MIME type validation, and virus scanning unclear
   - **Action Required**:
     - Verify file size limits (currently 5MB documented)
     - Audit MIME type validation (image-only enforcement)
     - Add virus scanning for production (ClamAV or cloud service)
     - Implement upload rate limiting (separate from global rate limit)
     - Test malicious file upload scenarios
   - **Impact**: Malicious file uploads, server storage exhaustion

### 8. **Image Storage Migration (S3/Cloudinary)**
   - **Status**: ❌ Local filesystem storage only
   - **Issue**: Not scalable for multi-instance deployments (Vercel/serverless)
   - **Action Required**:
     - Implement S3-compatible storage adapter (AWS S3, Cloudflare R2, Backblaze B2)
     - Add environment variable for storage backend selection
     - Migrate existing uploads to cloud storage
     - Update image serving to use CDN URLs
     - Document migration process
   - **Impact**: Images lost between deployments on ephemeral filesystems

### 9. **Cache Strategy Implementation**
   - **Status**: ❌ No caching layer documented
   - **Issue**: No caching for expensive queries or metadata extraction
   - **Action Required**:
     - Implement Redis/Upstash cache for:
       - Product metadata (Amazon/Lego scraping results)
       - User profile lookups
       - Public list views
       - Group member queries
     - Add cache invalidation strategy
     - Document cache TTLs per data type
   - **Impact**: Poor performance under load, excessive database queries

### 10. **Database Indexing Audit**
   - **Status**: ✅ Basic indexes exist but need optimization
   - **Issue**: Need performance testing to identify missing indexes
   - **Action Required**:
     - Run query performance profiling (Prisma Studio, PostgreSQL logs)
     - Identify slow queries (>100ms)
     - Add composite indexes for common query patterns
     - Document indexing strategy
     - Add monitoring for slow queries (Sentry)
   - **Impact**: Slow page loads, database performance degradation

### 11. **Background Job Queue**
   - **Status**: ❌ No job queue system implemented
   - **Issue**: Long-running tasks (image processing, email sending) block HTTP requests
   - **Action Required**:
     - Implement job queue (BullMQ, Inngest, Quirrel)
     - Move async tasks to background:
       - Image processing/optimization
       - Product metadata scraping
       - Bulk email sending
       - Invitation cleanup
     - Add job monitoring/retry logic
     - Document job queue architecture
   - **Impact**: Request timeouts, poor user experience, serverless function limits

### 12. **Monitoring & Alerting Enhancement**
   - **Status**: ⚠️ Sentry configured but incomplete
   - **Issue**: Need comprehensive monitoring strategy
   - **Action Required**:
     - Add custom Sentry metrics:
       - Rate limit hit rate
       - Failed reservation attempts
       - Image processing failures
       - Metadata scraping errors
     - Configure alerting thresholds
     - Add uptime monitoring (UptimeRobot, Better Uptime)
     - Implement health check endpoint monitoring
     - Document alerting runbook
   - **Impact**: Undetected production issues, slow incident response

---

## 🟡 MEDIUM PRIORITY - User Experience & Features

### 13. **Wish Reservation Notifications**
   - **Status**: ❌ Not implemented
   - **Issue**: Users don't know when gifts are reserved on their lists
   - **Action Required**:
     - Implement email notification when wish is reserved
     - Add notification preferences to user settings
     - Create reservation summary email (weekly digest option)
     - Respect privacy (don't reveal WHO reserved)
   - **Impact**: Users miss gift activity, poor coordination

### 14. **List Collaboration Features**
   - **Status**: ⚠️ Co-admin exists but limited
   - **Issue**: Co-admins can't manage reservations or see full list activity
   - **Action Required**:
     - Add activity log for list changes
     - Allow co-admins to view reservation status (not reserver identity)
     - Add comment/note feature for co-admin communication
     - Implement list version history
   - **Impact**: Limited collaboration, confusion among co-managers

### 15. **Mobile App (PWA) Implementation**
   - **Status**: ❌ Not implemented (mobile-responsive web only)
   - **Issue**: No offline support, no native app features
   - **Action Required**:
     - Add Progressive Web App (PWA) manifest
     - Implement service worker for offline caching
     - Add "Add to Home Screen" prompt
     - Enable push notifications (reservation alerts)
     - Test iOS and Android PWA installation
   - **Impact**: Suboptimal mobile experience, no offline access

### 16. **Advanced Filtering & Search**
   - **Status**: ⚠️ Basic filtering exists but limited
   - **Issue**: No full-text search, limited sort options
   - **Action Required**:
     - Implement full-text search for wishes (title, notes, URL)
     - Add autocomplete for wish/list search
     - Enhance filtering:
       - Reserved vs unreserved wishes
       - Price range search
       - Multiple wish level selection
       - Date range filters
     - Add saved filter presets
   - **Impact**: Hard to find specific wishes in large lists

### 17. **Bulk Import/Export**
   - **Status**: ❌ Not implemented
   - **Issue**: No way to import wishlists from other platforms or export for backup
   - **Action Required**:
     - Add CSV/JSON export for wishes and lists
     - Implement import from:
       - Amazon wishlists
       - Google Sheets
       - CSV upload
     - Add data portability page (GDPR compliance)
   - **Impact**: Lock-in, hard to migrate from other platforms

### 18. **Wish Templates & Quick Add**
   - **Status**: ⚠️ Quick add exists but limited
   - **Issue**: No wish templates for common items
   - **Action Required**:
     - Create wish templates (books, electronics, clothing, etc.)
     - Add quick-add from URL (browser extension optional)
     - Implement duplicate wish detection
     - Add "Add to wishlist" browser bookmarklet
   - **Impact**: Slow wish creation process

### 19. **Gift Recommendations**
   - **Status**: ❌ Not implemented
   - **Issue**: No AI/ML suggestions for gift ideas
   - **Action Required**:
     - Integrate OpenAI API for gift suggestions based on:
       - User profile (age, interests)
       - Past wishes
       - Budget constraints
     - Add "Surprise me" feature for gift discovery
     - Implement trending wishes across users (privacy-aware)
   - **Impact**: Missed opportunity for discovery and engagement

### 20. **Multi-Language Support (i18n)**
   - **Status**: ❌ English only
   - **Issue**: Not accessible to non-English speakers
   - **Action Required**:
     - Implement next-intl or next-i18next
     - Translate UI to major languages (Spanish, French, German, Japanese)
     - Add language selector to settings
     - Support RTL languages (Arabic, Hebrew)
     - Document translation contribution process
   - **Impact**: Limited audience, excludes non-English users

---

## 🟢 LOW PRIORITY - Developer Experience & Optimization

### 21. **API Documentation (OpenAPI/Swagger)**
   - **Status**: ❌ JSDoc comments exist but no formal API docs
   - **Issue**: No interactive API documentation for developers
   - **Action Required**:
     - Generate OpenAPI 3.0 spec from API routes
     - Set up Swagger UI at `/api/docs`
     - Add request/response examples for all endpoints
     - Document authentication flow
     - Add Postman collection export
   - **Impact**: Hard for external developers to integrate

### 22. **Storybook Component Library**
   - **Status**: ❌ Not implemented
   - **Issue**: No isolated component development/documentation
   - **Action Required**:
     - Set up Storybook for component library
     - Document all UI components with examples
     - Add accessibility tests (axe-core)
     - Generate component usage documentation
   - **Impact**: Inconsistent component usage, slow UI development

### 23. **End-to-End Testing Coverage**
   - **Status**: ⚠️ E2E tests exist but incomplete (see `/test-e2e` slash command)
   - **Issue**: Need comprehensive E2E test coverage
   - **Action Required**:
     - Add E2E tests for:
       - OAuth login flows (Google, Facebook, Apple)
       - Magic link authentication
       - Group invitation acceptance
       - Public list password protection
       - Reservation privacy rules
       - Co-admin permissions
     - Set up CI pipeline for E2E tests
     - Add visual regression testing (Percy, Chromatic)
   - **Impact**: Regressions in critical user flows

### 24. **Performance Budget Enforcement**
   - **Status**: ❌ No performance budgets configured
   - **Issue**: No automated performance regression detection
   - **Action Required**:
     - Set Lighthouse CI performance budgets:
       - First Contentful Paint < 1.5s
       - Time to Interactive < 3s
       - Bundle size < 200KB (gzipped)
     - Add bundle size tracking (bundlesize.io)
     - Configure GitHub Actions to fail on budget violations
   - **Impact**: Performance regressions go undetected

### 25. **Code Splitting Optimization**
   - **Status**: ⚠️ Basic Next.js code splitting but needs audit
   - **Issue**: Large bundle sizes possible with Radix UI and dependencies
   - **Action Required**:
     - Audit bundle with `@next/bundle-analyzer`
     - Implement dynamic imports for:
       - Admin pages
       - Group management modals
       - Image editing components
     - Optimize third-party imports (Radix UI tree-shaking)
     - Add route-based code splitting monitoring
   - **Impact**: Slow initial page loads, poor Core Web Vitals

### 26. **Environment-Specific Config Management**
   - **Status**: ⚠️ `.env` files used but no formal config system
   - **Issue**: Environment variables scattered, no validation
   - **Action Required**:
     - Implement typed environment config system (t3-env, zod-env)
     - Validate all required env vars at startup
     - Add environment-specific config files (dev, staging, prod)
     - Document all environment variables in `.env.example`
   - **Impact**: Runtime errors from missing/invalid env vars

### 27. **Git Hooks & Pre-Commit Checks**
   - **Status**: ❌ No pre-commit hooks configured
   - **Issue**: Code quality issues committed to repo
   - **Action Required**:
     - Set up Husky for git hooks
     - Add pre-commit hooks:
       - ESLint checks
       - TypeScript type checking
       - Prettier formatting
       - Unit test run
       - No console.log checks
     - Add commit message linting (Conventional Commits)
   - **Impact**: Inconsistent code quality, broken builds

### 28. **Dependency Update Strategy**
   - **Status**: ⚠️ No automated dependency updates
   - **Issue**: Security vulnerabilities and outdated dependencies
   - **Action Required**:
     - Set up Dependabot or Renovate
     - Configure automatic PR creation for dependency updates
     - Add dependency update review process
     - Document major version upgrade strategy
     - Set up security advisory monitoring
   - **Impact**: Security vulnerabilities, missing bug fixes

---

## 📊 UNDOCUMENTED FEATURES (Audit Needed)

### 29. **Email Verification System**
   - **Status**: ✅ Implemented (found in codebase)
   - **Documentation Gap**: Not covered in CLAUDE.md
   - **Audit Required**:
     - `/api/user/emails/add` - Add email
     - `/api/user/emails/verify` - Verify email with token
     - `/api/user/emails/[id]/resend` - Resend verification
     - `/api/user/emails/set-primary` - Set primary email
     - Document multi-email workflow in user guide
   - **Impact**: Users may not know about multi-email support

### 30. **Avatar Management System**
   - **Status**: ✅ Implemented (found in codebase)
   - **Documentation Gap**: Not covered in CLAUDE.md
   - **Audit Required**:
     - `/api/user/avatar` - Upload user avatar
     - `/api/groups/[id]/avatar` - Upload group avatar
     - Avatar fallback system (initials generation)
     - Image cropping in onboarding flow
     - Document avatar specs (size limits, formats)
   - **Impact**: Avatar upload failures, unclear requirements

### 31. **Vanity URL System**
   - **Status**: ✅ Implemented (found in codebase)
   - **Documentation Gap**: Partially documented but incomplete
   - **Audit Required**:
     - `/api/user/username` - Set username (one-time only restriction)
     - Reserved words system (`reserved-words.ts`)
     - Slug validation (`vanity-url.ts`)
     - Public profile routes (`/[username]`, `/[username]/[slug]`)
     - Document username change policy (cannot change after set)
   - **Impact**: Confused users trying to change usernames

### 32. **Invitation System (Lists & Groups)**
   - **Status**: ✅ Implemented (found in codebase)
   - **Documentation Gap**: Not fully documented
   - **Audit Required**:
     - List invitations:
       - `/api/lists/[listId]/invitations` - Create/list invitations
       - `/api/invitations/list/[token]` - Accept list invitation
     - Group invitations:
       - `/api/groups/[id]/invitations` - Create/list invitations
       - `/api/groups/[id]/invitations/[invitationId]` - Accept/decline
     - Expiration handling (7 days default)
     - Email notification system
     - Document invitation flow and token security
   - **Impact**: Users confused by invitation process

### 33. **Onboarding Flow**
   - **Status**: ✅ Implemented (found in codebase)
   - **Documentation Gap**: Mentioned but not detailed
   - **Audit Required**:
     - `/api/user/onboarding` - Initialize onboarding
     - `/api/user/profile/complete` - Complete profile setup
     - `/(auth)/onboarding/page.tsx` - Onboarding UI
     - Avatar crop component
     - Username selection (one-time)
     - Document required vs optional steps
   - **Impact**: Poor first-time user experience

### 34. **Public List Access System**
   - **Status**: ✅ Implemented (found in codebase)
   - **Documentation Gap**: Mentioned but architecture unclear
   - **Audit Required**:
     - `/api/lists/public/[shareToken]` - Access public list
     - `/api/lists/public/[shareToken]/reservations` - Anonymous reservations
     - Password-protected lists
     - Share token generation and rotation
     - Document public sharing security model
   - **Impact**: Security concerns with public sharing

### 35. **Cron Job System**
   - **Status**: ✅ Implemented (found in codebase)
   - **Documentation Gap**: Documented in `docs/VERCEL_DEPLOYMENT.md` but not CLAUDE.md
   - **Audit Required**:
     - `/api/cron/cleanup-tokens` - Token cleanup job
     - `CRON_SECRET` authentication
     - `vercel.json` configuration
     - Scheduled task strategy
     - Document cron job deployment and monitoring
   - **Impact**: Expired tokens accumulate if cron fails

### 36. **Metadata Scraping System**
   - **Status**: ✅ Implemented (found in codebase)
   - **Documentation Gap**: Known limitations documented but architecture missing
   - **Audit Required**:
     - `/api/metadata` - URL metadata extraction
     - `/api/debug-scraper` - Debug endpoint
     - `metadata-extractor.ts` (30.4 KB) - Complex scraping logic
     - Amazon, Lego, generic URL support
     - Bot detection handling
     - Document scraping limitations and fallback strategy
   - **Impact**: Users don't understand why scraping fails

### 37. **Admin User Management**
   - **Status**: ✅ Implemented (found in codebase)
   - **Documentation Gap**: Admin features mentioned but not detailed
   - **Audit Required**:
     - 11 admin API endpoints for user management
     - User suspension/reactivation
     - Bulk operations
     - Email management for users
     - Vanity access control
     - Document admin permissions and audit logging
   - **Impact**: Admins don't know full capabilities

---

## 🔍 DISCOVERED GAPS IN DOCUMENTATION

### 38. **Service Layer Documentation**
   - **Status**: ⚠️ Architecture documented but individual services not detailed
   - **Gap**: Need comprehensive service API documentation
   - **Action Required**:
     - Document each service file in `.claude/guides/services/`:
       - `wish-service.md`
       - `list-service.md`
       - `group-service.md`
       - `reservation-service.md`
       - `permission-service.md`
       - `admin-service.md`
     - Add method signatures and examples
     - Document business rules per service
   - **Impact**: Developers unfamiliar with service contracts

### 39. **Component Architecture Guide**
   - **Status**: ⚠️ Components listed but usage patterns unclear
   - **Gap**: Need component usage guidelines and examples
   - **Action Required**:
     - Create `.claude/guides/components/` directory
     - Document major component patterns:
       - Filter panels (wishes, lists, groups)
       - Card components (unified vs compact)
       - Dialog management patterns
       - Form components with validation
     - Add Storybook or example usage
   - **Impact**: Inconsistent component usage

### 40. **API Route Conventions**
   - **Status**: ✅ Documented in `.claude/guides/api.md`
   - **Gap**: Need comprehensive API endpoint catalog
   - **Action Required**:
     - Create `.claude/guides/api-endpoints.md` with all 70 endpoints
     - Document request/response schemas per endpoint
     - Add authentication/permission requirements
     - Include rate limiting details
   - **Impact**: Developers unaware of available endpoints

### 41. **Database Schema Documentation**
   - **Status**: ⚠️ High-level schema in architecture guide
   - **Gap**: Need detailed field documentation
   - **Action Required**:
     - Generate Prisma schema documentation
     - Document each model's purpose and relationships
     - Add field-level documentation with constraints
     - Create ER diagram
     - Document indexes and performance considerations
   - **Impact**: Unclear database design decisions

### 42. **Testing Strategy Documentation**
   - **Status**: ✅ Testing guide exists (`.claude/guides/testing.md`)
   - **Gap**: Need test coverage reports and gaps identified
   - **Action Required**:
     - Run coverage report and document current coverage
     - Identify untested critical paths
     - Add missing test examples
     - Document mocking strategies
     - Create testing decision tree (unit vs integration vs E2E)
   - **Impact**: Gaps in test coverage

### 43. **Deployment Guides Enhancement**
   - **Status**: ✅ Docker and Vercel guides exist
   - **Gap**: Need additional deployment scenarios
   - **Action Required**:
     - Add guides for:
       - AWS ECS deployment
       - Railway deployment
       - DigitalOcean App Platform
       - Cloudflare Pages
     - Document environment variable requirements per platform
     - Add troubleshooting sections
   - **Impact**: Limited deployment flexibility

---

## 📋 AUDIT CHECKLIST - Items to Verify

### Security Audit
- [ ] CSRF protection verified in all state-changing endpoints
- [ ] XSS prevention tested (stored, reflected, DOM-based)
- [ ] SQL injection prevention audit complete
- [ ] File upload security reviewed (MIME validation, virus scanning)
- [ ] Session security hardened (fixation, hijacking, timeout)
- [ ] Rate limiting tested under load
- [ ] Input sanitization implemented for all user content
- [ ] CSP headers configured in middleware
- [ ] SSRF protection verified in metadata scraper
- [ ] Admin endpoints properly secured (role checks)

### Performance Audit
- [ ] Database query performance profiled
- [ ] Missing indexes identified and added
- [ ] N+1 query issues resolved
- [ ] Bundle size optimized (code splitting)
- [ ] Image optimization verified
- [ ] Lighthouse score > 90 for key pages
- [ ] Core Web Vitals meet thresholds
- [ ] Cache strategy implemented for expensive operations
- [ ] Background job queue for long-running tasks

### Feature Audit
- [ ] Email verification flow documented and tested
- [ ] Avatar upload workflow documented
- [ ] Vanity URL system tested (one-time change restriction)
- [ ] Invitation system fully documented
- [ ] Onboarding flow tested on mobile
- [ ] Public list access security reviewed
- [ ] Cron job monitoring implemented
- [ ] Metadata scraping fallback tested
- [ ] Admin features documented

### Documentation Audit
- [ ] All 70 API endpoints documented
- [ ] Service layer API reference created
- [ ] Component usage guide written
- [ ] Database schema fully documented
- [ ] Test coverage report generated
- [ ] Deployment guides for all major platforms
- [ ] Environment variable reference complete
- [ ] Security best practices documented

---

## 🎯 PRIORITIZATION MATRIX

### Priority 1 (Do First - Security & Foundation)
1. CSRF Protection (#2)
2. Input Sanitization & XSS Prevention (#3)
3. SQL Injection Audit (#6)
4. Session Security Hardening (#5)
5. File Upload Security (#7)

### Priority 2 (Do Next - Scalability)
1. Rate Limiting - Distributed (#1)
2. Database Connection Pooling (#4)
3. Image Storage Migration (#8)
4. Cache Strategy Implementation (#9)
5. Background Job Queue (#11)

### Priority 3 (Do Soon - User Experience)
1. Wish Reservation Notifications (#13)
2. Mobile PWA Implementation (#15)
3. Advanced Filtering & Search (#16)
4. Undocumented Features Audit (#29-37)

### Priority 4 (Do Later - Enhancements)
1. List Collaboration Features (#14)
2. Bulk Import/Export (#17)
3. Wish Templates & Quick Add (#18)
4. Gift Recommendations (#19)

### Priority 5 (Nice to Have)
1. Multi-Language Support (#20)
2. API Documentation (#21)
3. Storybook Component Library (#22)
4. E2E Testing Coverage (#23)

---

## 📈 ESTIMATED EFFORT (T-Shirt Sizing)

| Priority Level | Total Items | Estimated Effort |
|---------------|-------------|------------------|
| Priority 1 (Security) | 5 items | 40 hours (1 week) |
| Priority 2 (Scalability) | 5 items | 80 hours (2 weeks) |
| Priority 3 (UX) | 4 items | 60 hours (1.5 weeks) |
| Priority 4 (Enhancements) | 4 items | 80 hours (2 weeks) |
| Priority 5 (Nice to Have) | 4 items | 120 hours (3 weeks) |
| Documentation Gaps | 6 items | 40 hours (1 week) |
| **TOTAL** | **43 items** | **420 hours (10.5 weeks)** |

---

## 🚀 NEXT STEPS

1. **Immediate Actions (This Week)**:
   - Run security audit (#2, #3, #6)
   - Review session security implementation (#5)
   - Audit file upload security (#7)

2. **Short-Term (Next 2 Weeks)**:
   - Implement distributed rate limiting (#1)
   - Configure database connection pooling (#4)
   - Document undocumented features (#29-37)

3. **Medium-Term (Next Month)**:
   - Migrate image storage to S3 (#8)
   - Implement cache layer (#9)
   - Add background job queue (#11)
   - Enhance monitoring/alerting (#12)

4. **Long-Term (Next Quarter)**:
   - Complete all security hardening
   - Implement major UX features (#13-19)
   - Achieve 80%+ test coverage
   - Full API documentation

---

**Document Owner**: Development Team
**Review Frequency**: Weekly during Priority 1-2, Monthly thereafter
**Last Audit**: 2025-11-17
