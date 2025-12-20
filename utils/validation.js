const { API_CONFIG } = require('../constants/api');

const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < API_CONFIG.VALIDATION.USERNAME_MIN_LENGTH) {
    return { isValid: false, error: `Username must be at least ${API_CONFIG.VALIDATION.USERNAME_MIN_LENGTH} characters` };
  }
  
  if (trimmed.length > API_CONFIG.VALIDATION.USERNAME_MAX_LENGTH) {
    return { isValid: false, error: `Username must be no more than ${API_CONFIG.VALIDATION.USERNAME_MAX_LENGTH} characters` };
  }
  
  if (!API_CONFIG.VALIDATION.USERNAME_PATTERN.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  
  return { isValid: true };
};

const validateScore = (score, mode) => {
  const maxScore = mode === 'Journey' 
    ? API_CONFIG.VALIDATION.MAX_SCORE_PER_VEHICLE * 10 
    : API_CONFIG.VALIDATION.MAX_SCORE_PER_GAME;
    
  if (score > maxScore || score < 0) {
    return { isValid: false, error: 'Invalid score value' };
  }
  
  return { isValid: true };
};

const validateChallengeId = (challengeId) => {
  if (!challengeId || typeof challengeId !== 'string') {
    return { isValid: false, error: 'Challenge ID is required' };
  }
  
  const pattern = /^challenge_\d+_[a-z0-9]+$/;
  if (!pattern.test(challengeId) || challengeId.length > 100) {
    return { isValid: false, error: 'Invalid challenge ID format' };
  }
  
  return { isValid: true };
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

module.exports = {
  validateUsername,
  validateScore,
  validateChallengeId,
  sanitizeInput
};