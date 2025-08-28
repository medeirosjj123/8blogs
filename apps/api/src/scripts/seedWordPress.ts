import dotenv from 'dotenv';
import { connectDatabase } from '../database';
import { runWordPressSeeds } from '../seeders';

// Load environment variables from project root
dotenv.config({ path: '../../.env' });

async function main() {
  try {
    console.log('🌱 Starting WordPress seeds...');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected');
    
    // Run seeds
    const result = await runWordPressSeeds();
    console.log(`✅ Seeding completed: ${result.themes} themes, ${result.plugins} plugins`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();