const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function createAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Define User schema
    const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      passwordHash: { type: String, required: true },
      role: { type: String, enum: ['user', 'admin'], default: 'user' },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    const User = mongoose.model('User', userSchema);

    const adminEmail = 'admin@tatame.com.br';
    const adminPassword = 'admin123';
    
    // Check if admin exists
    const existing = await User.findOne({ email: adminEmail });
    
    if (existing) {
      console.log('Found existing user:', existing.email, 'with role:', existing.role);
      
      // Update password and role
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      existing.passwordHash = passwordHash;
      existing.role = 'admin';
      existing.isActive = true;
      existing.updatedAt = new Date();
      
      await existing.save();
      console.log('✅ Admin user updated successfully');
      console.log('Email:', adminEmail);
      console.log('Password:', adminPassword);
      console.log('Role:', existing.role);
    } else {
      // Create new admin
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const admin = new User({
        name: 'Administrator',
        email: adminEmail,
        passwordHash: passwordHash,
        role: 'admin',
        isActive: true
      });
      
      await admin.save();
      console.log('✅ New admin user created successfully');
      console.log('Email:', adminEmail);
      console.log('Password:', adminPassword);
      console.log('Role: admin');
    }
    
    // Verify the admin can be found
    const verify = await User.findOne({ email: adminEmail });
    if (verify) {
      console.log('\n✅ Verification: Admin user exists in database');
      console.log('- ID:', verify._id);
      console.log('- Email:', verify.email);
      console.log('- Role:', verify.role);
      console.log('- Active:', verify.isActive);
      
      // Test password
      const passwordMatch = await bcrypt.compare(adminPassword, verify.passwordHash);
      console.log('- Password valid:', passwordMatch);
    }
    
    await mongoose.disconnect();
    console.log('\n✨ Done! You can now login with:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createAdmin();