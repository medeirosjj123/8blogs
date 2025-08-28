import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from '../models/User';

// Load environment variables
dotenv.config();

async function fixAdminAuth() {
  try {
    // Connect to MongoDB Atlas only
    if (!process.env.MONGODB_URI) {
      throw new Error('❌ MONGODB_URI environment variable is required. Please set your MongoDB Atlas connection string.');
    }
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Find admin user (try both emails)
    let admin = await User.findOne({ email: 'admin@tatame.com.br' });
    if (!admin) {
      admin = await User.findOne({ email: 'admin@tatame.com' });
    }
    
    if (!admin) {
      console.log('❌ Admin user not found. Creating new admin...');
      
      const passwordHash = await bcrypt.hash('Admin@123', 10);
      const newAdmin = new User({
        email: 'admin@tatame.com.br',
        name: 'Admin Tatame',
        passwordHash,
        role: 'admin',
        emailVerified: true,
        abilities: ['Administration', 'User Management', 'Content Management'],
        interests: ['Platform Management', 'Community Growth'],
        lookingFor: ['networking'],
        availability: 'available',
        profileCompleteness: 100
      });
      
      await newAdmin.save();
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user found. Resetting password...');
      
      // Reset password
      const passwordHash = await bcrypt.hash('Admin@123', 10);
      admin.passwordHash = passwordHash;
      admin.emailVerified = true;
      admin.role = 'admin';
      admin.loginAttempts = 0;
      admin.lockedUntil = undefined;
      
      // Add networking fields if missing
      if (!admin.abilities || admin.abilities.length === 0) {
        admin.abilities = ['Administration', 'User Management', 'Content Management'];
      }
      if (!admin.interests || admin.interests.length === 0) {
        admin.interests = ['Platform Management', 'Community Growth'];
      }
      if (!admin.lookingFor || admin.lookingFor.length === 0) {
        admin.lookingFor = ['networking'];
      }
      if (!admin.availability) {
        admin.availability = 'available';
      }
      
      await admin.save();
      console.log('✅ Admin password reset successfully');
    }

    // Generate a new JWT token
    const token = jwt.sign(
      {
        userId: admin?._id || 'admin-id',
        email: 'admin@tatame.com.br',
        role: 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      {
        expiresIn: '7d',
        issuer: 'tatame-api'
      }
    );

    console.log('\n🔑 Admin Authentication Details:');
    console.log('   Email: admin@tatame.com.br');
    console.log('   Password: Admin@123');
    console.log('\n🎫 New JWT Token (valid for 7 days):');
    console.log(`   ${token}`);
    console.log('\n📋 To use in browser console:');
    console.log(`   localStorage.setItem('accessToken', '${token}')`);
    console.log('\n✨ Then refresh the page!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
fixAdminAuth();