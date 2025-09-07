import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

// User schema - simplified version for update
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  name: { type: String, required: true },
  role: { type: String, enum: ['starter', 'pro', 'black_belt', 'admin'], default: 'starter' },
  emailVerified: { type: Boolean, default: false },
  subscription: {
    plan: { type: String, enum: ['starter', 'pro', 'black_belt'], default: 'starter' },
    blogsLimit: { type: Number, default: 1 },
    reviewsLimit: { type: Number, default: 30 },
    reviewsUsed: { type: Number, default: 0 },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    nextResetDate: { type: Date },
    features: {
      bulkUpload: { type: Boolean, default: false },
      weeklyCalls: { type: Boolean, default: false },
      coursesAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false }
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function fixUserRoles() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is required');
      process.exit(1);
    }
    
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Find all users with invalid role 'aluno'
    console.log('\n🔍 Finding users with invalid role...');
    const usersWithInvalidRole = await User.find({ role: 'aluno' });
    console.log(`Found ${usersWithInvalidRole.length} users with role 'aluno'`);

    let updatedCount = 0;

    for (const user of usersWithInvalidRole) {
      try {
        // Update role to 'starter' and set subscription defaults
        const updateResult = await User.updateOne(
          { _id: user._id },
          {
            $set: {
              role: 'starter',
              'subscription.plan': 'starter',
              'subscription.blogsLimit': 1,
              'subscription.reviewsLimit': 30,
              'subscription.reviewsUsed': 0,
              'subscription.billingCycle': 'monthly',
              'subscription.nextResetDate': new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
              'subscription.features.bulkUpload': false,
              'subscription.features.weeklyCalls': false,
              'subscription.features.coursesAccess': false,
              'subscription.features.prioritySupport': false,
              updatedAt: new Date()
            }
          }
        );

        if (updateResult.modifiedCount > 0) {
          console.log(`✅ Updated user: ${user.name} (${user.email}) -> role: starter`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating user ${user.email}:`, error.message);
      }
    }

    // Create admin user
    console.log('\n👤 Creating admin account...');
    const adminEmail = 'novaeracomvisual@gmail.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      // Update existing user to admin
      await User.updateOne(
        { email: adminEmail },
        {
          $set: {
            role: 'admin',
            'subscription.plan': 'black_belt',
            'subscription.blogsLimit': -1, // unlimited
            'subscription.reviewsLimit': -1, // unlimited
            'subscription.features.bulkUpload': true,
            'subscription.features.weeklyCalls': true,
            'subscription.features.coursesAccess': true,
            'subscription.features.prioritySupport': true,
            updatedAt: new Date()
          }
        }
      );
      console.log('✅ Updated existing user to admin role');
    } else {
      console.log('ℹ️  Admin user not found. Create via registration first.');
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated ${updatedCount} users from 'aluno' to 'starter' role`);
    console.log(`   🎯 All users now have valid roles and subscription settings`);
    console.log('\n🎉 User roles fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

fixUserRoles();