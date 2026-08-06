# Sentinel Security Journal

This journal documents critical security learnings, findings, and patterns discovered across the SIPS Mobile Web application.

## 2026-06-12 - [Undocumented/Missing Password Complexity and Rate Limiting on Change-Password]
**Vulnerability:** Weak Password Requirements (CWE-521) and Missing Rate Limiting on Sensitive Endpoint (CWE-307) on the `/api/auth/change-password` route. While `SECURITY.md` claimed uppercase, numeric, and special character checks, plus a 3-attempts limit, were fully implemented, the actual route used a basic `zod` schema check of only 8 characters length and lacked any specific rate limiter invocation.
**Learning:** Documentation can drift from implementation. Security specs/compliance docs may claim a control is fully active when it was either omitted, commented out, or partially implemented during fast-paced feature development.
**Prevention:**
1. Use automated static analysis or dynamic test cases to assert password complexity rejection at the API boundaries.
2. Ensure every authentication or state-altering user credentials endpoint is explicitly rate-limited by integrating a designated limiter (e.g. `changePasswordRateLimiter`) instead of solely relying on loose, general API rate limiters.
3. Validate and enforce that all security controls described in compliance profiles/checklists are backed by actively executed unit tests.
