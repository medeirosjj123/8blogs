import mongoose from 'mongoose';
import { Prompt } from '../models/Prompt';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function fixBBRPrompts() {
  try {
    // Connect to MongoDB Atlas only
    if (!process.env.MONGODB_URI) {
      throw new Error('❌ MONGODB_URI environment variable is required');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');
    
    console.log('🧹 Fixing BBR prompts category issue...\n');
    
    // First, remove the generic prompts that are incorrectly in BBR category
    const genericPromptCodes = ['review_product', 'review_conclusion'];
    
    console.log('📝 Removing generic fallback prompts from BBR category:');
    for (const code of genericPromptCodes) {
      const result = await Prompt.deleteOne({ code, category: 'bbr' });
      if (result.deletedCount > 0) {
        console.log(`   ✅ Removed ${code} from BBR category`);
      } else {
        console.log(`   ⚠️  ${code} not found in BBR category`);
      }
    }
    
    console.log('\n📊 Current BBR prompts after cleanup:');
    const bbrPrompts = await Prompt.find({ category: 'bbr' });
    
    console.log(`Found ${bbrPrompts.length} BBR prompts:\n`);
    bbrPrompts.forEach(p => {
      console.log(`   - ${p.name} (${p.code})`);
    });
    
    // Also verify content_section exists in informational category
    const contentSection = await Prompt.findOne({ code: 'content_section' });
    if (contentSection) {
      console.log(`\n✅ Extra section prompt found: ${contentSection.name} (category: ${contentSection.category})`);
    } else {
      console.log('\n⚠️  content_section prompt not found');
    }
    
    console.log('\n✅ BBR prompts fixed!');
    console.log('\n📝 The BBR generation now correctly uses:');
    console.log('   1. bbr_intro - Introduction');
    console.log('   2. bbr_product - Product Review');  
    console.log('   3. bbr_conclusion - Conclusion');
    console.log('   4. content_section - Extra Section (from informational category)\n');
    
    console.log('✨ All prompts are editable through the admin panel.');
    console.log('   Navigate to: Admin Panel → Content Generation Hub → Prompts Tab');
    console.log('   Changes made in the panel will be reflected in the generation function.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

fixBBRPrompts();