"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 100;
async function checkRateLimit(dynamodb, userId) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    try {
        const result = await dynamodb.send(new lib_dynamodb_1.GetCommand({
            TableName: process.env.GAME_DATA_TABLE,
            Key: { userId },
            ProjectionExpression: 'rateLimitData'
        }));
        let requests = result.Item?.rateLimitData?.requests || [];
        requests = requests.filter((time) => time > windowStart);
        if (requests.length >= MAX_REQUESTS_PER_MINUTE) {
            return false;
        }
        requests.push(now);
        dynamodb.send(new lib_dynamodb_1.UpdateCommand({
            TableName: process.env.GAME_DATA_TABLE,
            Key: { userId },
            UpdateExpression: 'SET rateLimitData = :data',
            ExpressionAttributeValues: {
                ':data': { requests, lastReset: now }
            }
        })).catch(err => console.warn('Rate limit update failed:', err));
        return true;
    }
    catch (error) {
        console.error('Rate limit check failed:', error);
        return true;
    }
}
