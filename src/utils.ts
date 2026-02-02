import { APIResponse } from './types';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://dw78cwmd7ajty.cloudfront.net',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

export const successResponse = (data: any): APIResponse => ({
  statusCode: 200,
  headers: CORS_HEADERS,
  body: JSON.stringify(data)
});

export const errorResponse = (message: string, statusCode = 500): APIResponse => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify({ error: message })
});

export const parseJSON = <T>(body: string | null, defaultValue: T): T => {
  if (!body) return defaultValue;
  try {
    return JSON.parse(body) as T;
  } catch {
    return defaultValue;
  }
};

export const validateRequired = <T>(value: T | undefined | null, fieldName: string): T => {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required`);
  }
  return value;
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error('Max retries exceeded');
};

export const generateSecureId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

export const validateStats = (stats: any): void => {
  if (typeof stats.gears !== 'number' || stats.gears < 0 || stats.gears > 10000) {
    throw new Error('Invalid gears value');
  }
  if (typeof stats.level !== 'number' || stats.level < 1 || stats.level > 1000) {
    throw new Error('Invalid level value');
  }
  if (typeof stats.xp !== 'number' || stats.xp < 0 || stats.xp > 500000) {
    throw new Error('Invalid XP value');
  }
  if (typeof stats.highScore !== 'number' || stats.highScore < 0 || stats.highScore > 100000) {
    throw new Error('Invalid high score value');
  }
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://dw78cwmd7ajty.cloudfront.net',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};
