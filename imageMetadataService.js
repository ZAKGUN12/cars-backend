/**
 * Image Metadata Service
 * Manages image metadata and validation without breaking existing functionality
 * Integrates with DynamoDB when ImageMetadata table is created
 * Falls back to in-memory storage until then
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { S3_CONFIG, S3UrlManager } = require('./s3Config');

const dynamodbClient = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'eu-west-1'
});
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const s3Client = new S3Client({ 
  region: process.env.AWS_REGION || 'eu-west-1'
});

/**
 * In-memory cache for image metadata
 * Used until DynamoDB table is available
 * Format: Map<imageKey, metadata>
 */
const imageMetadataCache = new Map();
const brokenImagesCache = new Map(); // Format: Map<imageKey, {reportedAt, count}>

const IMAGE_METADATA_TABLE = process.env.IMAGE_METADATA_TABLE || 'vehicle-guesser-image-metadata';
const BROKEN_IMAGES_TABLE = process.env.BROKEN_IMAGES_TABLE || 'vehicle-guesser-broken-images';

/**
 * Check if image exists in S3
 * Uses S3 HeadObject to verify without downloading
 */
async function checkImageExists(s3Key) {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: S3_CONFIG.BUCKET_NAME,
      Key: s3Key
    }));
    return { exists: true, error: null };
  } catch (error) {
    if (error.name === 'NotFound') {
      return { exists: false, error: 'Image not found in S3' };
    }
    return { exists: false, error: error.message };
  }
}

/**
 * Store image metadata
 * Tries DynamoDB first, falls back to in-memory cache
 */
async function storeImageMetadata(imageKey, metadata) {
  try {
    // Try to store in DynamoDB if table exists
    const params = {
      TableName: IMAGE_METADATA_TABLE,
      Item: {
        imageKey,
        ...metadata,
        updatedAt: new Date().toISOString()
      }
    };

    try {
      await dynamodb.send(new PutCommand(params));
      console.log(`Stored image metadata in DynamoDB: ${imageKey}`);
      return { success: true, source: 'dynamodb' };
    } catch (dynamoError) {
      if (dynamoError.name === 'ResourceNotFoundException') {
        // Table doesn't exist yet, use in-memory cache
        imageMetadataCache.set(imageKey, {
          ...metadata,
          updatedAt: new Date().toISOString()
        });
        console.log(`Stored image metadata in memory: ${imageKey}`);
        return { success: true, source: 'memory', warning: 'DynamoDB table not available' };
      }
      throw dynamoError;
    }
  } catch (error) {
    console.error(`Failed to store image metadata: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve image metadata
 * Tries DynamoDB first, falls back to in-memory cache
 */
async function getImageMetadata(imageKey) {
  try {
    // Try DynamoDB first
    try {
      const result = await dynamodb.send(new GetCommand({
        TableName: IMAGE_METADATA_TABLE,
        Key: { imageKey }
      }));

      if (result.Item) {
        return { found: true, metadata: result.Item, source: 'dynamodb' };
      }
    } catch (dynamoError) {
      if (dynamoError.name !== 'ResourceNotFoundException') {
        console.warn(`DynamoDB error: ${dynamoError.message}`);
      }
    }

    // Fall back to in-memory cache
    const cached = imageMetadataCache.get(imageKey);
    if (cached) {
      return { found: true, metadata: cached, source: 'memory' };
    }

    return { found: false, metadata: null };
  } catch (error) {
    console.error(`Failed to retrieve image metadata: ${error.message}`);
    return { found: false, error: error.message };
  }
}

/**
 * Report broken image
 * Stores broken image report for monitoring
 */
async function reportBrokenImage(imageUrl) {
  try {
    const imageKey = S3UrlManager.getS3KeyFromUrl(imageUrl);
    
    if (!imageKey) {
      console.warn('Could not extract image key from URL:', imageUrl);
      return { success: false, error: 'Invalid image URL' };
    }

    const normalizedKey = S3UrlManager.normalizeImageKey(imageKey);
    const now = new Date().toISOString();
    
    // Try to store in DynamoDB
    try {
      await dynamodb.send(new UpdateCommand({
        TableName: BROKEN_IMAGES_TABLE,
        Key: { imageKey: normalizedKey },
        UpdateExpression: 'SET reportCount = if_not_exists(reportCount, :zero) + :one, lastReportedAt = :now, isActive = :false',
        ExpressionAttributeValues: {
          ':zero': 0,
          ':one': 1,
          ':now': now,
          ':false': false
        }
      }));

      console.log(`Reported broken image in DynamoDB: ${normalizedKey}`);
      return { success: true, source: 'dynamodb' };
    } catch (dynamoError) {
      if (dynamoError.name === 'ResourceNotFoundException') {
        // Table doesn't exist, use in-memory cache
        const existing = brokenImagesCache.get(normalizedKey) || { reportCount: 0 };
        brokenImagesCache.set(normalizedKey, {
          ...existing,
          reportCount: existing.reportCount + 1,
          lastReportedAt: now,
          isActive: false
        });

        console.log(`Reported broken image in memory: ${normalizedKey}`);
        return { success: true, source: 'memory', warning: 'DynamoDB table not available' };
      }
      throw dynamoError;
    }
  } catch (error) {
    console.error(`Failed to report broken image: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get broken images list
 * Returns images that have been reported as broken
 */
async function getBrokenImages() {
  try {
    const broken = [];

    // Try to get from DynamoDB
    try {
      const result = await dynamodb.send(new ScanCommand({
        TableName: BROKEN_IMAGES_TABLE,
        FilterExpression: 'isActive = :false',
        ExpressionAttributeValues: {
          ':false': false
        }
      }));

      if (result.Items) {
        broken.push(...result.Items);
        return { broken, source: 'dynamodb' };
      }
    } catch (dynamoError) {
      if (dynamoError.name !== 'ResourceNotFoundException') {
        console.warn(`DynamoDB error: ${dynamoError.message}`);
      }
    }

    // Fall back to in-memory cache
    const cachedBroken = Array.from(brokenImagesCache.entries()).map(([key, data]) => ({
      imageKey: key,
      ...data
    }));

    return { broken: cachedBroken, source: 'memory' };
  } catch (error) {
    console.error(`Failed to get broken images: ${error.message}`);
    return { broken: [], error: error.message };
  }
}

/**
 * Validate image and store metadata
 * Checks if image exists in S3 and stores metadata
 */
async function validateAndStoreImageMetadata(imageKey, brand, model, year, difficulty, imagePart, format) {
  try {
    // Check if image exists
    const { exists, error: checkError } = await checkImageExists(imageKey);

    if (!exists) {
      console.warn(`Image does not exist in S3: ${imageKey} - ${checkError}`);
      return { valid: false, error: checkError };
    }

    // Store metadata
    const metadata = {
      imageKey,
      s3Path: `${S3_CONFIG.PATHS.VEHICLES}/${imageKey}`,
      imageUrl: S3UrlManager.getImageUrl(`${S3_CONFIG.PATHS.VEHICLES}/${imageKey}`),
      brand,
      model,
      year,
      difficulty,
      imagePart,
      format,
      isActive: true,
      uploadedAt: new Date().toISOString(),
      validatedAt: new Date().toISOString()
    };

    const { success } = await storeImageMetadata(imageKey, metadata);

    return { 
      valid: success, 
      metadata: success ? metadata : null,
      stored: success 
    };
  } catch (error) {
    console.error(`Failed to validate image: ${error.message}`);
    return { valid: false, error: error.message };
  }
}

/**
 * Get image statistics
 * Returns info about stored images
 */
async function getImageStatistics() {
  try {
    const stats = {
      totalInMetadata: 0,
      totalBroken: 0,
      byDifficulty: { Easy: 0, Medium: 0, Hard: 0 },
      byFormat: {},
      source: 'mixed'
    };

    // Try to get from DynamoDB
    try {
      const metadataResult = await dynamodb.send(new ScanCommand({
        TableName: IMAGE_METADATA_TABLE,
        Select: 'COUNT'
      }));

      const brokenResult = await dynamodb.send(new ScanCommand({
        TableName: BROKEN_IMAGES_TABLE,
        FilterExpression: 'isActive = :false',
        ExpressionAttributeValues: { ':false': false },
        Select: 'COUNT'
      }));

      stats.totalInMetadata = metadataResult.Count || 0;
      stats.totalBroken = brokenResult.Count || 0;
      stats.source = 'dynamodb';

      return { stats, success: true };
    } catch (dynamoError) {
      if (dynamoError.name !== 'ResourceNotFoundException') {
        console.warn(`DynamoDB error: ${dynamoError.message}`);
      }
    }

    // Fall back to in-memory cache statistics
    stats.totalInMetadata = imageMetadataCache.size;
    stats.totalBroken = brokenImagesCache.size;
    stats.source = 'memory';

    return { stats, success: true };
  } catch (error) {
    console.error(`Failed to get image statistics: ${error.message}`);
    return { stats: null, success: false, error: error.message };
  }
}

/**
 * Clear image metadata cache
 * Useful for testing or forcing refresh
 */
function clearMetadataCache() {
  imageMetadataCache.clear();
  return { success: true, message: 'Metadata cache cleared' };
}

/**
 * Get cache statistics
 * Shows current state of in-memory cache
 */
function getCacheStatistics() {
  return {
    imageMetadataCache: imageMetadataCache.size,
    brokenImagesCache: brokenImagesCache.size,
    totalCached: imageMetadataCache.size + brokenImagesCache.size
  };
}

module.exports = {
  // Main functions
  checkImageExists,
  storeImageMetadata,
  getImageMetadata,
  reportBrokenImage,
  getBrokenImages,
  validateAndStoreImageMetadata,
  getImageStatistics,
  
  // Utility functions
  clearMetadataCache,
  getCacheStatistics,
  
  // Constants
  IMAGE_METADATA_TABLE,
  BROKEN_IMAGES_TABLE
};
