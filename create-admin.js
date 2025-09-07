import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  name: { type: String, required: true },
  bio: { type: String },
  avatar: { type: String },
  location: { type: String },
  socialLinks: {
    facebook: String,
    instagram: String,
    whatsapp: String,
    youtube: String,
    website: String
  },
  role: { type: String, default: 'aluno' },
  emailVerified: { type: Boolean, default: true },
  abilities: [String],
  interests: [String],
  lookingFor: [String],
  availability: { type: String, default: 'available' },
  profileCompleteness: { type: Number, default: 0 },
  connectionCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is required');
      process.exit(1);
    }
    
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const email = 'novaeracomvisual@gmail.com';
    const password = 'jiujitsu123';
    const name = 'Admin User';
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      console.log('⏭️  User already exists, updating role to admin');
      existingUser.role = 'admin';
      await existingUser.save();
      console.log('✅ Updated user role to admin');
    } else {
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create admin user
      const adminUser = new User({
        email,
        passwordHash,
        name,
        role: 'admin',
        emailVerified: true,
        profileCompleteness: 50,
        bio: 'Administrador da plataforma Blog House',
        abilities: ['Administration', 'Management'],
        interests: ['Platform Management', 'User Support'],
        lookingFor: ['administration'],
        availability: 'available'
      });

      await adminUser.save();
      console.log('✅ Created admin user successfully');
    }
    
    console.log('\n📋 Admin Account Details:');
    console.log(`   📧 Email: ${email}`);
    console.log(`   🔑 Password: ${password}`);
    console.log(`   👤 Role: admin`);
    console.log('\n🎉 Admin account ready!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

createAdminUser();