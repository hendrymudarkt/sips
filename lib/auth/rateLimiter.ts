/**
 * Rate Limiter Configuration
 * Mencegah Brute Force Attack pada endpoint autentikasi
 *
 * @see https://github.com/animir/node-rate-limiter-flexible
 */

import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiter untuk login attempts
// 5 percobaan per IP dalam 60 detik
const loginRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

// Rate limiter untuk change-password
// 3 percobaan per IP dalam 60 detik
const changePasswordRateLimiter = new RateLimiterMemory({
  points: 3,
  duration: 60,
});

// Rate limiter untuk forgot/reset password
// 3 percobaan per IP dalam 60 detik
const passwordResetRateLimiter = new RateLimiterMemory({
  points: 3,
  duration: 60,
});

// Rate limiter untuk API umumnya
// 100 request per IP dalam 15 menit
const apiRateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 15 * 60,
});

export {
  loginRateLimiter,
  changePasswordRateLimiter,
  passwordResetRateLimiter,
  apiRateLimiter,
};
