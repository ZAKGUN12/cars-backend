# ⚡ Vehicle Guesser Backend

**AWS Lambda serverless backend**

## Quick Start
```bash
npm install
# Deploy via GitHub Actions on push to main
```

## Architecture
- **AWS Lambda**: Serverless functions
- **DynamoDB**: Data persistence
- **Cognito**: Authentication
- **API Gateway**: REST endpoints
- **WebSocket**: Real-time features

## Structure
```
src/           # TypeScript source files
dist/          # Compiled JavaScript for Lambda
utils/         # Utility functions
constants/     # Configuration constants
```

## TypeScript Integration
The backend is migrating to TypeScript:
- **src/**: Contains TypeScript source files
- **dist/**: Contains compiled JavaScript deployed to Lambda
- **Build**: `npm run build` compiles TypeScript to dist/
- **Old .js files**: Still work during migration (cognito-index.js, websocket.js, etc.)

## Building & Deploying
```bash
# Build TypeScript
npm run build

# Package and deploy
npm run package
npm run deploy
```

## API Endpoints
- `GET /gamedata` - User profile and stats
- `POST /setup-username` - Username configuration
- `POST /create-challenge` - Challenge creation
- `POST /accept-challenge` - Challenge acceptance
- `GET /my-challenges` - Pending challenges
- `GET /leaderboard` - Player rankings

## Environment Variables
Set in AWS Lambda:
- `GAME_DATA_TABLE` - DynamoDB table name
- `CHALLENGE_TABLE` - Challenge table name
- `USER_POOL_ID` - Cognito User Pool ID
- `NODE_ENV` - Environment (production/development)

## Related Repositories
- **Frontend**: [cars](../cars) - React + TypeScript + Capacitor
- **Infrastructure**: [cars-infrastructure](../cars-infrastructure) - CloudFormation templates