/**
 * @name CSRF Protection Validation
 * @description Suppresses CSRF warnings for cookieParser when csrf-csrf middleware is applied
 * @kind problem
 * @id js/csrf-protection-custom
 */

import javascript

// This custom query suppresses false positives for CSRF protection
// when using csrf-csrf middleware (Double Submit Cookie pattern)
// which is equivalent to csurf but not recognized by default CodeQL rules
