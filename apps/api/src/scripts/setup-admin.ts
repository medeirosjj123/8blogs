import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Import User model
import { User } from '../models/User';

async function setupAdmin() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const email = 'admin@tatame.com.br';
    const password = 'Admin@123';
    
    // Check if admin exists
    let adminUser = await User.findOne({ email: email.toLowerCase() });
    
    if (adminUser) {
      console.log('📝 Admin user found, updating...');
    } else {
      console.log('📝 Creating new admin user...');
      adminUser = new User({
        email: email.toLowerCase(),
        name: 'Admin Tatame'
      });
    }
    
    // Hash the password properly
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Update all fields
    adminUser.passwordHash = passwordHash;
    adminUser.role = 'admin';
    adminUser.isActive = true;
    adminUser.emailVerified = true;
    adminUser.loginAttempts = 0;
    adminUser.lockedUntil = undefined;
    adminUser.name = adminUser.name || 'Admin Tatame';
    
    // Save the user
    await adminUser.save();
    
    // Verify the password works
    const testHash = adminUser.passwordHash;
    const isValid = await bcrypt.compare(password, testHash);
    
    if (isValid) {
      console.log('✅ Password verification successful!');
    } else {
      console.log('❌ Password verification failed!');
    }
    
    console.log('\n========================================');
    console.log('✅ Admin User Setup Complete!');
    console.log('========================================');
    console.log('📧 Email: admin@tatame.com.br');
    console.log('🔑 Password: Admin@123');
    console.log('👤 Role: admin');
    console.log('✔️  Active: true');
    console.log('✔️  Email Verified: true');
    console.log('🔓 Login Attempts: 0');
    console.log('🔓 Account Locked: false');
    console.log('========================================\n');
    
    // List all admin users
    console.log('📋 All admin users in database:');
    const admins = await User.find({ role: 'admin' }).select('email name isActive emailVerified loginAttempts lockedUntil');
    admins.forEach(u => {
      console.log(`  - ${u.email} (${u.name})`);
      console.log(`    Active: ${u.isActive}, Verified: ${u.emailVerified}, Login Attempts: ${u.loginAttempts}`);
      if (u.lockedUntil) {
        console.log(`    ⚠️ Locked until: ${u.lockedUntil}`);
      }
    });

    await mongoose.disconnect();
    console.log('\n✅ Done! You can now login at http://localhost:5174');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

setupAdmin();