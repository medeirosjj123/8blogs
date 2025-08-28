import dotenv from 'dotenv';
import { connectDatabase } from '../src/database';
import { Feature } from '../src/models/Feature';

dotenv.config({ path: '../../.env' });

async function addWordPressFeatures() {
  try {
    await connectDatabase();
    
    // Remove old sites-manager feature if it exists
    await Feature.deleteOne({ code: 'sites-manager' });
    console.log('✅ Removed old sites-manager feature');
    
    // Add new WordPress features
    const features = [
      {
        code: 'wordpress-add',
        name: 'Adicionar Site',
        description: 'Adicione outro site WordPress no mesmo servidor',
        category: 'automation',
        icon: 'Plus',
        status: 'active',
        isNew: true,
        isPremium: false,
        order: 2
      },
      {
        code: 'wordpress-remove',
        name: 'Remover Site',
        description: 'Remova um site WordPress do seu servidor',
        category: 'automation',
        icon: 'Trash2',
        status: 'active',
        isNew: true,
        isPremium: false,
        order: 3
      },
      {
        code: 'wordpress-backup',
        name: 'Backup WordPress',
        description: 'Crie backup completo do seu site WordPress',
        category: 'automation',
        icon: 'Archive',
        status: 'active',
        isNew: true,
        isPremium: false,
        order: 4
      }
    ];
    
    for (const featureData of features) {
      const existing = await Feature.findOne({ code: featureData.code });
      
      if (existing) {
        console.log(`Feature ${featureData.code} already exists, updating...`);
        await Feature.updateOne({ code: featureData.code }, featureData);
      } else {
        const feature = new Feature(featureData);
        await feature.save();
        console.log(`✅ Added feature: ${featureData.name}`);
      }
    }
    
    // Update wp-installer to be in wordpress category
    await Feature.updateOne(
      { code: 'wp-installer' },
      { 
        category: 'automation',
        order: 1,
        name: 'Instalar WordPress'
      }
    );
    console.log('✅ Updated wp-installer to wordpress category');
    
    console.log('✅ All WordPress features added successfully');
    
  } catch (error) {
    console.error('Error adding features:', error);
  } finally {
    process.exit();
  }
}

addWordPressFeatures();