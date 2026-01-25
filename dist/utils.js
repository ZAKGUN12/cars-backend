"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
exports.parseJSON = parseJSON;
exports.validateRequired = validateRequired;
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': 'https://dw78cwmd7ajty.cloudfront.net',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
};
function successResponse(data) {
    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(data)
    };
}
function errorResponse(message, statusCode = 500) {
    return {
        statusCode,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: message })
    };
}
function parseJSON(body, defaultValue) {
    if (!body)
        return defaultValue;
    try {
        return JSON.parse(body);
    }
    catch (error) {
        throw new Error('Invalid JSON in request body');
    }
}
function validateRequired(value, fieldName) {
    if (value === undefined || value === null) {
        throw new Error(`${fieldName} is required`);
    }
    return value;
}
