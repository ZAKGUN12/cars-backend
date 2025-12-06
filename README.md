# Vehicle Guesser Backend

AWS Lambda backend for the Vehicle Guesser game.

## Features
- AWS Cognito authentication
- Game data management
- User progress tracking

## Deployment
```bash
npm run deploy
```

## Environment Variables
Set in AWS Lambda:
- `GAME_DATA_TABLE`: DynamoDB table name
- `USER_POOL_ID`: Cognito User Pool ID
- `NODE_ENV`: production