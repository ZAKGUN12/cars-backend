import { APIResponse } from './types';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://dw78cwmd7ajty.cloudfront.net',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

export function successResponse(data: any): APIResponse {
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(data)
  };
}

export function errorResponse(message: string, statusCode = 500): APIResponse {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: message })
  };
}

export function parseJSON<T>(body: string | null, defaultValue: T): T {
  if (!body) return defaultValue;
  
  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

export function validateRequired<T>(value: T | undefined | null, fieldName: string): T {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required`);
  }
  return value;
}
