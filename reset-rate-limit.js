const { createClient } = require('redis');

async function resetRateLimit() {
  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  
  try {
    await client.connect();
    console.log('Connected to Redis');
    
    // Get our IP - since we're testing locally, we'll use a pattern to find keys
    const keys = await client.keys('auth:*');
    console.log('Found rate limit keys:', keys);
    
    // Delete all auth rate limit keys
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`Deleted ${keys.length} rate limit keys`);
    } else {
      console.log('No rate limit keys found');
    }
    
    await client.quit();
    console.log('Rate limit reset complete');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetRateLimit();