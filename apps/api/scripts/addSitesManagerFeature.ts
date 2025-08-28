import dotenv from 'dotenv';
import { connectDatabase } from '../src/database';
import { Feature } from '../src/models/Feature';

dotenv.config({ path: '../../.env' });

async function addSitesManagerFeature() {
  try {
    await connectDatabase();
    
    // Check if feature already exists
    const existing = await Feature.findOne({ code: 'sites-manager' });
    
    if (existing) {
      console.log('Sites Manager feature already exists');
      return;
    }
    
    // Create the feature
    const feature = new Feature({
      code: 'sites-manager',
      name: 'Gerenciador de Sites',
      description: 'Gerencie múltiplos sites WordPress em seus servidores VPS',
      category: 'automation',
      icon: 'Layout',
      status: 'active',
      isNew: true,
      isPremium: false,
      order: 2 // Right after wp-installer
    });
    
    await feature.save();
    console.log('✅ Sites Manager feature added successfully');
    
  } catch (error) {
    console.error('Error adding feature:', error);
  } finally {
    process.exit();
  }
}

addSitesManagerFeature();