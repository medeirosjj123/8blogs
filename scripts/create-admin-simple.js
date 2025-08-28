const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Simple User schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: String,
  plan: String,
  isActive: Boolean,
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const adminEmail = 'admin@tatame.com';
    
    // Check if admin exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('Admin already exists');
      
      // Update to ensure it's admin
      existingAdmin.role = 'admin';
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log('✅ Admin role confirmed');
    } else {
      // Create new admin
      const passwordHash = await bcrypt.hash('Admin@123', 10);
      
      const admin = new User({
        name: 'Admin Tatame',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        plan: 'premium',
        isActive: true,
        metadata: {
          isVerified: true,
          createdBy: 'system'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await admin.save();
      console.log('✅ Admin user created successfully');
    }
    
    console.log('\nAdmin credentials:');
    console.log('Email: admin@tatame.com');
    console.log('Password: Admin@123');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();