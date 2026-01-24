// Centralized S3 configuration for vehicle images
const S3_CONFIG = {
  BUCKET_NAME: 'vehicle-guesser-1764962592',
  REGION: 'eu-west-1',
  BASE_URL: 'https://vehicle-guesser-1764962592.s3.eu-west-1.amazonaws.com',
  CLOUDFRONT_URL: 'https://dw78cwmd7ajty.cloudfront.net'
};

class S3_UrlManager {
  static getImageUrl(imageKey) {
    return `${S3_CONFIG.BASE_URL}/${imageKey}`;
  }

  static getCloudFrontUrl(imageKey) {
    return `${S3_CONFIG.CLOUDFRONT_URL}/${imageKey}`;
  }
}

module.exports = { S3_CONFIG, S3_UrlManager };
