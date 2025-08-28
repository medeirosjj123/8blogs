const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required. Please set your MongoDB Atlas connection string.');
  process.exit(1);
}

// Import models
const Channel = require('../apps/api/dist/models/Channel').Channel;
const User = require('../apps/api/dist/models/User').User;

async function seedChannels() {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Find admin user to be the creator
    const adminUser = await User.findOne({ email: 'admin@tatame.com.br' });
    if (!adminUser) {
      console.error('❌ Admin user not found. Please ensure admin user exists.');
      process.exit(1);
    }

    // Check if general channel exists
    const existingGeneral = await Channel.findOne({ slug: 'general' });
    if (!existingGeneral) {
      const generalChannel = new Channel({
        name: 'General',
        slug: 'general',
        description: 'Canal geral para discussões da comunidade',
        type: 'public',
        category: 'general',
        createdBy: adminUser._id,
        members: [{
          userId: adminUser._id,
          role: 'owner',
          joinedAt: new Date()
        }]
      });
      await generalChannel.save();
      console.log('✅ Created general channel');
    } else {
      console.log('ℹ️ General channel already exists');
    }

    // Create additional channels
    const channels = [
      {
        name: 'Dúvidas',
        slug: 'duvidas',
        description: 'Tire suas dúvidas sobre SEO e marketing digital',
        type: 'public',
        category: 'support'
      },
      {
        name: 'Recursos',
        slug: 'recursos',
        description: 'Compartilhe ferramentas e recursos úteis',
        type: 'public',
        category: 'resources'
      },
      {
        name: 'Networking',
        slug: 'networking',
        description: 'Conecte-se com outros profissionais',
        type: 'public',
        category: 'social'
      },
      {
        name: 'Cases de Sucesso',
        slug: 'cases-sucesso',
        description: 'Compartilhe seus resultados e conquistas',
        type: 'public',
        category: 'showcase'
      }
    ];

    for (const channelData of channels) {
      const existing = await Channel.findOne({ slug: channelData.slug });
      if (!existing) {
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
        console.log(`✅ Created ${channelData.name} channel`);
      } else {
        console.log(`ℹ️ ${channelData.name} channel already exists`);
      }
    }

    console.log('✅ Channels seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding channels:', error);
    process.exit(1);
  }
}

seedChannels();