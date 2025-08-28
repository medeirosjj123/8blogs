import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Import User model
import { User } from '../models/User';

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Check if admin exists
    let adminUser = await User.findOne({ email: 'admin@tatame.com.br' });
    
    if (adminUser) {
      console.log('ℹ️ Admin user already exists, updating password...');
      // Update password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      adminUser.password = hashedPassword;
      adminUser.role = 'admin';
      adminUser.isActive = true;
      adminUser.emailVerified = true;
      await adminUser.save();
      console.log('✅ Password updated to: admin123');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      adminUser = new User({
        name: 'Admin Tatame',
        email: 'admin@tatame.com.br',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });
      
      await adminUser.save();
      console.log('✅ Admin user created successfully!');
    }

    console.log('\n📋 Admin Credentials:');
    console.log('=====================================');
    console.log('Email: admin@tatame.com.br');
    console.log('Password: admin123');
    console.log('Role: admin');
    console.log('=====================================');

    // List all admin users
    console.log('\n👥 All admin users in database:');
    const admins = await User.find({ role: 'admin' }).select('email name isActive');
    admins.forEach(u => {
      console.log(`  - ${u.email} (${u.name}) - Active: ${u.isActive}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Done! You can now login with admin@tatame.com.br / admin123');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.log('Note: Email already exists, trying to update...');
    }
    process.exit(1);
  }
}

createAdmin();