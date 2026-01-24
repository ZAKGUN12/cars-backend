// Image metadata service for tracking broken images
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'eu-west-1'
});
const dynamodb = DynamoDBDocumentClient.from(client);

// In-memory cache for broken images
const brokenImagesCache = new Set();

async function reportBrokenImage(imageUrl) {
  try {
    // Add to cache
    brokenImagesCache.add(imageUrl);
    
    // Try to save to DynamoDB if table exists
    if (process.env.BROKEN_IMAGES_TABLE) {
      await dynamodb.send(new PutCommand({
        TableName: process.env.BROKEN_IMAGES_TABLE,
        Item: {
          imageUrl,
          reportedAt: new Date().toISOString(),
          ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
        }
      }));
      return { success: true, source: 'dynamodb' };
    }
    
    return { success: true, source: 'cache' };
  } catch (error) {
    console.error('Failed to report broken image:', error);
    return { success: false, error: error.message };
  }
}

function isBrokenImage(imageUrl) {
  return brokenImagesCache.has(imageUrl);
}

module.exports = {
  reportBrokenImage,
  isBrokenImage
};
