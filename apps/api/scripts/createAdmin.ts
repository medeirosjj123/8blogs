import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../src/models/User';

// Load environment variables
dotenv.config({ path: '../.env' });

async function createAdmin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://8links:6zuQIeXNTWPo1qTh@cluster0.2yead.mongodb.net/tatame?retryWrites=true&w=majority';
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@tatame.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('Email: admin@tatame.com');
      
      // Update password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      existingAdmin.passwordHash = hashedPassword;
      existingAdmin.role = 'admin';
      existingAdmin.emailVerified = true;
      await existingAdmin.save();
      
      console.log('✅ Admin password updated to: admin123');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const adminUser = new User({
        name: 'Admin Tatame',
        email: 'admin@tatame.com',
        passwordHash: hashedPassword,
        role: 'admin',
        emailVerified: true,
        membership: {
          product: 'premium',
          status: 'active',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        }
      });

      await adminUser.save();
      
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@tatame.com');
      console.log('🔑 Password: admin123');
    }

    // Also create a regular test user
    const existingUser = await User.findOne({ email: 'user@tatame.com' });
    
    if (!existingUser) {
      const hashedUserPassword = await bcrypt.hash('user123', 10);
      
      const testUser = new User({
        name: 'João Silva',
        email: 'user@tatame.com',
        passwordHash: hashedUserPassword,
        role: 'aluno',
        emailVerified: true,
        membership: {
          product: 'basic',
          status: 'active',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        }
      });

      await testUser.save();
      
      console.log('\n✅ Test user created successfully!');
      console.log('📧 Email: user@tatame.com');
      console.log('🔑 Password: user123');
    } else {
      // Update test user password
      const hashedUserPassword = await bcrypt.hash('user123', 10);
      existingUser.passwordHash = hashedUserPassword;
      existingUser.emailVerified = true;
      await existingUser.save();
      
      console.log('\n✅ Test user password updated');
      console.log('📧 Email: user@tatame.com');
      console.log('🔑 Password: user123');
    }

    console.log('\n📊 Database Statistics:');
    const userCount = await User.countDocuments();
    console.log(`Total users: ${userCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
createAdmin();