import mongoose from 'mongoose';
import { seedWordPressThemes } from './wordpressThemeSeeder';
import { seedWordPressPlugins } from './wordpressPluginSeeder';

export async function runWordPressSeeds() {
  console.log('🌱 Starting WordPress themes and plugins seeding...');
  
  try {
    // Create a dummy admin user ID for the seeders
    // In production, this should be a real admin user ID
    const dummyAdminUserId = new mongoose.Types.ObjectId().toString();
    
    // Seed themes
    const themes = await seedWordPressThemes(dummyAdminUserId);
    console.log(`✅ Seeded ${themes.length} themes`);
    
    // Seed plugins
    const plugins = await seedWordPressPlugins(dummyAdminUserId);
    console.log(`✅ Seeded ${plugins.length} plugins`);
    
    console.log('🎉 WordPress seeding completed successfully!');
    
    return {
      themes: themes.length,
      plugins: plugins.length,
      success: true
    };
  } catch (error) {
    console.error('❌ WordPress seeding failed:', error);
    throw error;
  }
}

// Allow running this file directly for development
if (require.main === module) {
  // This will only run if the file is executed directly (not imported)
  runWordPressSeeds()
    .then(() => {
      console.log('Seeding completed, exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}