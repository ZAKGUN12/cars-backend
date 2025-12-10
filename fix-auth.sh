#!/bin/bash

API_ID="sask6xoaf3"
AUTHORIZER_ID="so2ou7"

# Update gamedata GET method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id dcko3h \
  --http-method GET \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID

# Update gamedata POST method  
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id dcko3h \
  --http-method POST \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID

# Deploy changes
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Enable Cognito auth"

echo "✅ API Gateway updated with Cognito authorization"