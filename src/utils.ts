import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

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
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
