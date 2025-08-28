import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Channel } from '../src/models/Channel';
import { User } from '../src/models/User';

// Load environment variables from api directory
dotenv.config({ path: path.join(__dirname, '../.env') });

async function seedChannels() {
  try {
    // Connect to MongoDB Atlas
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable is required. Please set your MongoDB Atlas connection string.');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas');

    // Find an admin user to be the creator
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    // Default channels to create
    const defaultChannels = [
      {
        name: 'General',
        slug: 'general',
        description: 'General discussion for all members',
        type: 'public',
        category: 'general'
      },
      {
        name: 'Técnicas',
        slug: 'tecnicas',
        description: 'Discussão sobre técnicas de Jiu-Jitsu',
        type: 'public',
        category: 'course'
      },
      {
        name: 'Competições',
        slug: 'competicoes',
        description: 'Informações e discussões sobre competições',
        type: 'public',
        category: 'general'
      },
      {
        name: 'Ajuda',
        slug: 'ajuda',
        description: 'Suporte e ajuda com a plataforma',
        type: 'public',
        category: 'support'
      }
    ];

    for (const channelData of defaultChannels) {
      // Check if channel already exists
      const existingChannel = await Channel.findOne({ slug: channelData.slug });
      if (existingChannel) {
        console.log(`Channel "${channelData.name}" already exists`);
        continue;
      }

      // Create new channel
      const channel = new Channel({
        ...channelData,
        createdBy: adminUser._id,
        members: [{
          userId: adminUser._id,
          role: 'owner',
          joinedAt: new Date()
        }]
      });

      await channel.save();
      console.log(`✅ Created channel: ${channel.name}`);
    }

    console.log('\n✨ Default channels seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding channels:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the seed function
seedChannels();