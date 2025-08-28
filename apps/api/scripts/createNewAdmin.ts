import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function createNewAdmin() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // Import the User model
    const { User } = await import('../src/models/User');
    
    // Create new admin credentials
    const email = 'superadmin@tatame.com.br';
    const password = 'Admin@2024';
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists, updating to admin...');
      existingUser.role = 'admin';
      existingUser.passwordHash = passwordHash;
      existingUser.isActive = true;
      existingUser.emailVerified = true;
      existingUser.loginAttempts = 0;
      existingUser.lockedUntil = undefined;
      await existingUser.save();
      console.log('✅ Existing user updated to admin');
    } else {
      // Create new admin user
      const newAdmin = new User({
        email,
        passwordHash,
        name: 'Super Admin',
        role: 'admin',
        isActive: true,
        emailVerified: true,
        loginAttempts: 0,
        lockedUntil: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newAdmin.save();
      console.log('✅ New admin user created');
    }
    
    console.log('\n=== New Admin Credentials ===');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role: admin');
    console.log('Active: true');
    console.log('Email Verified: true');
    console.log('==============================\n');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

createNewAdmin();