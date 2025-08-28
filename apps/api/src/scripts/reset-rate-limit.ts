import { getRedisClient } from '../utils/redis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function resetAllRateLimits() {
  const redis = getRedisClient();
  
  try {
    console.log('🔄 Resetting all rate limits...');
    
    // Get all rate limit keys
    const authKeys = await redis.keys('auth:*');
    const msgKeys = await redis.keys('msg:*');
    const apiKeys = await redis.keys('api:*');
    const slidingKeys = await redis.keys('sliding:*');
    const rateLimitKeys = await redis.keys('ratelimit:*');
    
    const allKeys = [...authKeys, ...msgKeys, ...apiKeys, ...slidingKeys, ...rateLimitKeys];
    
    if (allKeys.length === 0) {
      console.log('✅ No rate limit keys found');
    } else {
      console.log(`Found ${allKeys.length} rate limit keys to reset:`);
      
      for (const key of allKeys) {
        await redis.del(key);
        console.log(`  ✅ Deleted: ${key}`);
      }
      
      console.log(`\n✅ Successfully reset ${allKeys.length} rate limit keys`);
    }
    
    console.log('\n🎉 You can now login without rate limit issues!');
    console.log('   Email: admin@tatame.com');
    console.log('   Password: Admin@123');
    
  } catch (error) {
    console.error('❌ Error resetting rate limits:', error);
  } finally {
    // Close Redis connection
    await redis.quit();
    process.exit(0);
  }
}

// Run the script
resetAllRateLimits();