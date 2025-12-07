const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-west-1' }));

async function resetUserStats() {
    try {
        // Get all users
        const result = await dynamodb.send(new ScanCommand({
            TableName: process.env.GAME_DATA_TABLE || 'vehicle-guesser-gamedata-prod'
        }));

        console.log(`Found ${result.Items.length} users to reset`);

        for (const user of result.Items) {
            // Reset stats to new scoring system defaults
            const resetStats = {
                ...user,
                stats: {
                    highScore: 0,
                    enduranceHighScore: 0,
                    gamesPlayed: 0,
                    totalPoints: 0,
                    difficultyPlays: { Easy: 0, Medium: 0, Hard: 0 },
                    gears: 50, // Starting gears
                    xp: 0,
                    level: 1,
                    powerUps: { timeFreeze: 2, clueGiver: 2 }, // Starting powerups
                    correctAnswers: 0,
                    incorrectAnswers: 0,
                    perfectRounds: 0,
                    gameHistory: [],
                    lastBonusDate: '',
                    loginStreak: 0,
                    journeyProgress: {}
                },
                updatedAt: new Date().toISOString()
            };

            await dynamodb.send(new PutCommand({
                TableName: process.env.GAME_DATA_TABLE || 'vehicle-guesser-gamedata-prod',
                Item: resetStats
            }));

            console.log(`Reset stats for user: ${user.userId}`);
        }

        console.log('All user stats have been reset to new scoring system!');
    } catch (error) {
        console.error('Error resetting user stats:', error);
    }
}

resetUserStats();