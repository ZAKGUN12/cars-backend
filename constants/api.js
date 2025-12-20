export const API_CONFIG = {
  RATE_LIMIT: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 100
  },
  CACHE: {
    TTL_MS: 60000, // 1 minute
  },
  VALIDATION: {
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 20,
    USERNAME_PATTERN: /^[a-zA-Z0-9_]+$/,
    MAX_SCORE_PER_VEHICLE: 210,
    MAX_SCORE_PER_GAME: 1050,
    MIN_TIME_PER_ROUND: 3
  },
  CHALLENGE: {
    EXPIRY_HOURS: 24,
    MAX_AGE_MINUTES: 5
  }
} as const;

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  GONE: 410,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} as const;

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
} as const;