"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const vehicleDatabase_1 = require("./vehicleDatabase");
const config_1 = require("./config");
const utils_1 = require("./utils");
const client = new client_dynamodb_1.DynamoDBClient({
    region: process.env.AWS_REGION || 'eu-west-1',
    maxAttempts: 3,
    retryMode: 'adaptive'
});
const dynamodb = lib_dynamodb_1.DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true }
});
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': 'https://dw78cwmd7ajty.cloudfront.net',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
};
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_MINUTE = 100;
// Track used vehicles per user session to prevent duplicates
const usedVehiclesPerUser = new Map();
const SESSION_EXPIRY = 30 * 60 * 1000; // 30 minutes
const sessionTimestamps = new Map();
function checkRateLimit(userId) {
    const now = Date.now();
    const userRequests = rateLimits.get(userId) || [];
    const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
    if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE)
        return false;
    recentRequests.push(now);
    rateLimits.set(userId, recentRequests);
    return true;
}
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
async function retryOperation(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            if (attempt === maxRetries)
                throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
    }
    throw new Error('Retry failed');
}
const handler = async (event) => {
    try {
        const { httpMethod, path, body } = event;
        if (httpMethod === 'OPTIONS') {
            return (0, utils_1.successResponse)('');
        }
        if (path === '/leaderboard' && httpMethod === 'GET') {
            return await getLeaderboard();
        }
        if (path === '/vehicles/puzzle' && httpMethod === 'POST') {
            const data = (0, utils_1.parseJSON)(body, { level: 'easy' });
            (0, utils_1.validateRequired)(data.level, 'level');
            const claims = event.requestContext?.authorizer?.claims;
            const userId = claims?.sub;
            return await generateVehiclePuzzle(data.level, userId);
        }
        const claims = event.requestContext?.authorizer?.claims;
        const userId = (0, utils_1.validateRequired)(claims?.sub, 'userId');
        if (!checkRateLimit(userId)) {
            return (0, utils_1.errorResponse)('Rate limit exceeded', 429);
        }
        const userProfile = {
            email: claims?.email || '',
            username: claims?.['cognito:username'] || '',
            name: claims?.name || '',
            picture: claims?.picture,
            emailVerified: claims?.email_verified === 'true',
            authMethod: claims?.['cognito:username']?.startsWith('Google_') ? 'google' : 'email'
        };
        if (path === '/gamedata') {
            if (httpMethod === 'GET')
                return await getGameData(userId, userProfile);
            if (httpMethod === 'POST') {
                const gameData = (0, utils_1.parseJSON)(body, {});
                return await updateGameData(userId, gameData, userProfile);
            }
        }
        return (0, utils_1.errorResponse)('Not found', 404);
    }
    catch (error) {
        console.error('Lambda error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return (0, utils_1.errorResponse)(message, 500);
    }
};
exports.handler = handler;
async function getGameData(userId, userProfile) {
    try {
        const result = await retryOperation(() => dynamodb.send(new lib_dynamodb_1.GetCommand({
            TableName: process.env.GAME_DATA_TABLE,
            Key: { userId }
        })));
        const gameData = result.Item || {
            userId,
            profile: userProfile,
            stats: {
                highScore: 0,
                enduranceHighScore: 0,
                gamesPlayed: 0,
                gamesWon: 0,
                totalPoints: 0,
                difficultyPlays: { Easy: 0, Medium: 0, Hard: 0 },
                gears: 20,
                xp: 0,
                level: 1,
                powerUps: { timeFreeze: 0, clueGiver: 0 },
                correctAnswers: 0,
                incorrectAnswers: 0,
                perfectRounds: 0,
                gameHistory: [],
                lastBonusDate: '',
                loginStreak: 0,
                journeyProgress: {}
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        return (0, utils_1.successResponse)(gameData);
    }
    catch (error) {
        console.error('Get game data error:', error);
        return (0, utils_1.errorResponse)('Failed to get game data');
    }
}
async function updateGameData(userId, gameData, userProfile) {
    try {
        const existing = await retryOperation(() => dynamodb.send(new lib_dynamodb_1.GetCommand({
            TableName: process.env.GAME_DATA_TABLE,
            Key: { userId }
        })));
        const currentData = existing.Item || {
            userId,
            profile: userProfile,
            stats: {
                highScore: 0,
                enduranceHighScore: 0,
                gamesPlayed: 0,
                gamesWon: 0,
                totalPoints: 0,
                difficultyPlays: { Easy: 0, Medium: 0, Hard: 0 },
                gears: 20,
                xp: 0,
                level: 1,
                powerUps: { timeFreeze: 0, clueGiver: 0 },
                correctAnswers: 0,
                incorrectAnswers: 0,
                perfectRounds: 0,
                gameHistory: [],
                lastBonusDate: '',
                loginStreak: 0,
                journeyProgress: {}
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        currentData.updatedAt = new Date().toISOString();
        const updateResult = await retryOperation(() => dynamodb.send(new lib_dynamodb_1.UpdateCommand({
            TableName: process.env.GAME_DATA_TABLE,
            Key: { userId },
            UpdateExpression: 'SET stats = :stats, profile = :profile, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':stats': currentData.stats,
                ':profile': currentData.profile,
                ':updatedAt': currentData.updatedAt
            },
            ReturnValues: 'ALL_NEW'
        })));
        return (0, utils_1.successResponse)(updateResult.Attributes);
    }
    catch (error) {
        console.error('Update game data error:', error);
        return (0, utils_1.errorResponse)('Failed to update game data');
    }
}
async function getLeaderboard() {
    try {
        const result = await retryOperation(() => dynamodb.send(new lib_dynamodb_1.ScanCommand({ TableName: process.env.GAME_DATA_TABLE })));
        const players = result.Items
            .map(item => ({
            userId: item.userId,
            username: item.profile?.username || 'Anonymous',
            highScore: item.stats?.highScore || 0,
            level: item.stats?.level || 1
        }))
            .sort((a, b) => b.highScore - a.highScore)
            .slice(0, 10);
        return (0, utils_1.successResponse)({ leaderboard: players });
    }
    catch (error) {
        console.error('Get leaderboard error:', error);
        return (0, utils_1.errorResponse)('Failed to get leaderboard');
    }
}
async function generateVehiclePuzzle(level, userId) {
    try {
        const levelKey = level.toLowerCase();
        const vehicles = vehicleDatabase_1.VEHICLE_DATABASE[levelKey] || [];
        if (!vehicles.length) {
            return (0, utils_1.errorResponse)('No vehicles available', 404);
        }
        // Clean up expired sessions
        const now = Date.now();
        for (const [uid, timestamp] of sessionTimestamps.entries()) {
            if (now - timestamp > SESSION_EXPIRY) {
                usedVehiclesPerUser.delete(uid);
                sessionTimestamps.delete(uid);
            }
        }
        // Get or create user's used vehicles set
        const sessionKey = userId || 'anonymous';
        if (!usedVehiclesPerUser.has(sessionKey)) {
            usedVehiclesPerUser.set(sessionKey, new Set());
        }
        const usedVehicles = usedVehiclesPerUser.get(sessionKey);
        sessionTimestamps.set(sessionKey, now);
        // Filter out already used vehicles
        const availableVehicles = vehicles.filter((v) => !usedVehicles.has(v.id));
        // If all vehicles used, reset for this user
        if (availableVehicles.length === 0) {
            console.log(`All ${levelKey} vehicles used for ${sessionKey}, resetting...`);
            usedVehicles.clear();
            availableVehicles.push(...vehicles);
        }
        const randomVehicle = availableVehicles[Math.floor(Math.random() * availableVehicles.length)];
        usedVehicles.add(randomVehicle.id);
        const imageUrl = `${config_1.S3_CONFIG.BASE_URL}/${randomVehicle.imageKey}`;
        const puzzle = {
            id: randomVehicle.id,
            vehicle: randomVehicle.vehicle,
            imageUrl,
            brandOptions: shuffleArray([...randomVehicle.brandOptions]),
            modelOptions: shuffleArray([...randomVehicle.modelOptions]),
            yearOptions: shuffleArray([...randomVehicle.yearOptions]),
            difficulty: randomVehicle.difficulty,
            tags: randomVehicle.tags
        };
        return (0, utils_1.successResponse)(puzzle);
    }
    catch (error) {
        console.error('Generate puzzle error:', error);
        return (0, utils_1.errorResponse)('Failed to generate puzzle');
    }
}
