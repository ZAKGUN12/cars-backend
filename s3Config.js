/**
 * Unified S3 Configuration for Backend
 * Node.js compatible version that mirrors frontend config
 * Can be used in Lambda and other Node.js services
 */

const S3_BUCKET_NAME = 'vehicle-guesser-1764962592';
const S3_REGION = 'eu-west-1';
const S3_BASE_URL = `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com`;
const CDN_BASE_URL = 'https://vehicle-guesser-cdn.cloudfront.net';

const S3_PATHS = {
  VEHICLES: 'images/vehicles',
  VEHICLES_EASY: 'images/vehicles/easy',
  VEHICLES_MEDIUM: 'images/vehicles/medium',
  VEHICLES_HARD: 'images/vehicles/hard',
  BRANDS: 'images/brands',
  ICONS: 'images/icons',
  THUMBNAILS: 'images/thumbnails'
};

const IMAGE_NAMING_PATTERNS = {
  VEHICLE: '{brand}-{model}-{year}-{part}.{ext}',
  BRAND_LOGO: '{brand}-logo.{ext}',
  THUMBNAIL: '{brand}-{model}-{year}-thumb.{ext}'
};

// Backward compatible export
const S3_CONFIG = {
  BUCKET_NAME: S3_BUCKET_NAME,
  REGION: S3_REGION,
  BASE_URL: S3_BASE_URL,
  PATHS: S3_PATHS,
  NAMING: IMAGE_NAMING_PATTERNS
};

const SUPPORTED_IMAGE_FORMATS = {
  primary: 'webp',
  fallback: ['jpg', 'jpeg', 'png'],
  all: ['webp', 'jpg', 'jpeg', 'png']
};

/**
 * S3 URL Manager for backend
 * Handles URL generation and validation
 */
class S3UrlManager {
  static getImageUrl(s3Key, useCDN = false) {
    const cleanKey = s3Key.startsWith('/') ? s3Key.substring(1) : s3Key;
    
    if (useCDN && CDN_BASE_URL !== 'https://vehicle-guesser-cdn.cloudfront.net') {
      return `${CDN_BASE_URL}/${cleanKey}`;
    }
    
    return `${S3_BASE_URL}/${cleanKey}`;
  }

  static getVehicleImageUrl(imageKey, difficulty = 'Easy') {
    if (imageKey.includes('/')) {
      return this.getImageUrl(imageKey);
    }

    const diffPath = difficulty === 'Easy' 
      ? S3_PATHS.VEHICLES_EASY
      : difficulty === 'Medium'
      ? S3_PATHS.VEHICLES_MEDIUM
      : S3_PATHS.VEHICLES_HARD;

    return this.getImageUrl(`${diffPath}/${imageKey}`);
  }

  static getS3KeyFromUrl(imageUrl) {
    if (imageUrl.includes(S3_BASE_URL)) {
      return imageUrl.replace(S3_BASE_URL + '/', '');
    }
    
    if (imageUrl.includes('cloudfront.net')) {
      return imageUrl.replace(CDN_BASE_URL + '/', '');
    }

    return imageUrl.includes('/') ? imageUrl : null;
  }

  static isValidS3Key(key) {
    return !key.startsWith('/') && /^[a-zA-Z0-9\-_.\/]+$/.test(key);
  }

  static getDifficultyFromPath(s3Key) {
    if (s3Key.includes('/easy/')) return 'Easy';
    if (s3Key.includes('/medium/')) return 'Medium';
    if (s3Key.includes('/hard/')) return 'Hard';
    return null;
  }

  static normalizeImageKey(imageKey) {
    let normalized = imageKey.trim();
    normalized = normalized.replace(/\s+/g, '-');
    normalized = normalized.toLowerCase();
    return normalized;
  }
}

module.exports = {
  S3_BUCKET_NAME,
  S3_REGION,
  S3_BASE_URL,
  CDN_BASE_URL,
  S3_PATHS,
  IMAGE_NAMING_PATTERNS,
  SUPPORTED_IMAGE_FORMATS,
  S3_CONFIG,
  S3UrlManager
};
