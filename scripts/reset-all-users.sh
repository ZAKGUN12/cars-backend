#!/bin/bash

# Reset all user stats in DynamoDB
# This resets: score, level, XP, gears, journey progress

REGION="eu-west-1"
TABLE="vehicle-guesser-gamedata-prod"

echo "🔄 Resetting all user stats..."

# Get all user IDs
USER_IDS=$(aws dynamodb scan \
  --table-name $TABLE \
  --region $REGION \
  --output json | jq -r '.Items[] | .userId.S')

for USER_ID in $USER_IDS; do
  echo "Resetting user: $USER_ID"
  
  aws dynamodb update-item \
    --table-name $TABLE \
    --region $REGION \
    --key "{\"userId\": {\"S\": \"$USER_ID\"}}" \
    --update-expression "SET #stats.#score = :zero, #stats.#level = :one, #stats.#xp = :zero, #stats.#gears = :startGears, #stats.#journeyProgress = :empty" \
    --expression-attribute-names '{
      "#stats": "stats",
      "#score": "score",
      "#level": "level",
      "#xp": "xp",
      "#gears": "gears",
      "#journeyProgress": "journeyProgress"
    }' \
    --expression-attribute-values '{
      ":zero": {"N": "0"},
      ":one": {"N": "1"},
      ":startGears": {"N": "20"},
      ":empty": {"M": {}}
    }' \
    --return-values UPDATED_NEW
    
  echo "✅ Reset complete for $USER_ID"
  echo ""
done

echo "🎉 All users reset successfully!"
