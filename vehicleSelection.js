// Improved Vehicle Selection System
// Prevents duplicate vehicles in Career Mode

// Session-based vehicle tracking (in-memory, resets per Lambda cold start)
const usedVehiclesBySession = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Clean up old sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of usedVehiclesBySession.entries()) {
    if (now - data.timestamp > SESSION_TIMEOUT) {
      usedVehiclesBySession.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

/**
 * Generate unique vehicle puzzle for Career Mode
 * Ensures no duplicates within the same game session
 */
async function generateUniqueVehiclePuzzle(level, sessionId) {
  const levelKey = level.toLowerCase();
  const vehicles = VEHICLE_DATABASE[levelKey] || [];
  const availableVehicles = vehicles.filter(v => !brokenImages.has(v.imageKey));
  
  if (!availableVehicles.length) {
    throw new Error(`No vehicles available for level: ${level}`);
  }
  
  // Get or create session tracking
  if (!usedVehiclesBySession.has(sessionId)) {
    usedVehiclesBySession.set(sessionId, {
      usedIds: new Set(),
      timestamp: Date.now()
    });
  }
  
  const session = usedVehiclesBySession.get(sessionId);
  session.timestamp = Date.now(); // Update activity
  
  // Filter out already used vehicles
  const unusedVehicles = availableVehicles.filter(v => !session.usedIds.has(v.id));
  
  // If all vehicles used, reset for this session
  if (unusedVehicles.length === 0) {
    console.log(`All vehicles used in session ${sessionId}, resetting...`);
    session.usedIds.clear();
    unusedVehicles.push(...availableVehicles);
  }
  
  // Select random unused vehicle
  const randomVehicle = unusedVehicles[Math.floor(Math.random() * unusedVehicles.length)];\n  
  // Mark as used
  session.usedIds.add(randomVehicle.id);
  
  // Build full image URL
  const imageUrl = `${S3_CONFIG.BASE_URL}/${randomVehicle.imageKey}`;
  
  return {
    id: randomVehicle.id,
    vehicle: randomVehicle.vehicle,
    imageUrl: imageUrl,
    brandOptions: shuffleArray([...randomVehicle.brandOptions]),
    modelOptions: shuffleArray([...randomVehicle.modelOptions]),
    yearOptions: shuffleArray([...randomVehicle.yearOptions]),
    difficulty: randomVehicle.difficulty,
    tags: randomVehicle.tags,
    imagePart: randomVehicle.imagePart
  };
}

/**
 * Generate multiple unique puzzles for Career Mode level
 * Returns array of 10 unique vehicle puzzles
 */
async function generateCareerLevelPuzzles(level, sessionId) {
  const puzzles = [];
  const levelKey = level.toLowerCase();
  const vehicles = VEHICLE_DATABASE[levelKey] || [];
  const availableVehicles = vehicles.filter(v => !brokenImages.has(v.imageKey));
  
  if (availableVehicles.length < 10) {
    throw new Error(`Insufficient vehicles for Career Mode. Need 10, have ${availableVehicles.length}`);
  }
  
  // Shuffle and take first 10 unique vehicles
  const shuffled = shuffleArray([...availableVehicles]);
  const selectedVehicles = shuffled.slice(0, 10);
  
  for (const vehicle of selectedVehicles) {
    const imageUrl = `${S3_CONFIG.BASE_URL}/${vehicle.imageKey}`;
    
    puzzles.push({
      id: vehicle.id,
      vehicle: vehicle.vehicle,
      imageUrl: imageUrl,
      brandOptions: shuffleArray([...vehicle.brandOptions]),
      modelOptions: shuffleArray([...vehicle.modelOptions]),
      yearOptions: shuffleArray([...vehicle.yearOptions]),
      difficulty: vehicle.difficulty,
      tags: vehicle.tags,
      imagePart: vehicle.imagePart
    });
  }
  
  return puzzles;
}

/**
 * Reset session tracking (for new game)
 */
function resetVehicleSession(sessionId) {
  usedVehiclesBySession.delete(sessionId);
}

module.exports = {
  generateUniqueVehiclePuzzle,
  generateCareerLevelPuzzles,
  resetVehicleSession
};
