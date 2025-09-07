import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

// User schema - simplified for unlocking
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },
  role: { type: String }
});

const User = mongoose.model('User', userSchema);

async function unlockAccounts() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is required');
      process.exit(1);
    }
    
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Find locked accounts
    console.log('\n🔍 Finding locked accounts...');
    const lockedAccounts = await User.find({
      $or: [
        { lockedUntil: { $exists: true, $ne: null } },
        { loginAttempts: { $gt: 0 } }
      ]
    });

    console.log(`Found ${lockedAccounts.length} accounts with locks or failed attempts`);

    // Reset all accounts
    const unlockResult = await User.updateMany(
      {},
      {
        $unset: { 
          lockedUntil: 1 
        },
        $set: { 
          loginAttempts: 0,
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Unlocked ${unlockResult.modifiedCount} accounts`);

    // Show admin account info
    const adminAccount = await User.findOne({ email: 'novaeracomvisual@gmail.com' });
    if (adminAccount) {
      console.log('\n👤 Admin Account Status:');
      console.log(`   📧 Email: ${adminAccount.email}`);
      console.log(`   👤 Name: ${adminAccount.name}`);
      console.log(`   🎭 Role: ${adminAccount.role}`);
      console.log(`   🔓 Login Attempts: ${adminAccount.loginAttempts}`);
      console.log(`   🔒 Locked Until: ${adminAccount.lockedUntil || 'Not locked'}`);
    }

    // Show test account info
    const testAccount = await User.findOne({ email: 'maria.silva@example.com' });
    if (testAccount) {
      console.log('\n🧪 Test Account Status:');
      console.log(`   📧 Email: ${testAccount.email}`);
      console.log(`   👤 Name: ${testAccount.name}`);
      console.log(`   🎭 Role: ${testAccount.role}`);
      console.log(`   🔓 Login Attempts: ${testAccount.loginAttempts}`);
      console.log(`   🔒 Locked Until: ${testAccount.lockedUntil || 'Not locked'}`);
    }
    
    console.log('\n🎉 All accounts unlocked successfully!');
    console.log('\n🔑 Admin Account: novaeracomvisual@gmail.com / jiujitsu123');
    console.log('🔑 Test Account: maria.silva@example.com / Test123!@#');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

unlockAccounts();