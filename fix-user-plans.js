const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function fixUserPlans() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Define User schema
    const userSchema = new mongoose.Schema({}, { collection: 'users' });
    const User = mongoose.model('User', userSchema);
    
    // Find users with black_belt role but starter/missing subscription plan
    const mismatchedUsers = await User.find({
      role: 'black_belt',
      $or: [
        { 'subscription.plan': 'starter' },
        { 'subscription.plan': { $exists: false } },
        { 'subscription': { $exists: false } }
      ]
    }).select('name email role subscription');
    
    console.log(`\n📊 Found ${mismatchedUsers.length} users with black_belt role but wrong subscription:`);
    
    if (mismatchedUsers.length === 0) {
      console.log('🎉 No users need to be fixed!');
      process.exit(0);
    }
    
    // Show the users first
    mismatchedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}): role=${user.role}, plan=${user.subscription?.plan || 'none'}`);
    });
    
    // Black belt subscription settings
    const blackBeltSubscription = {
      plan: 'black_belt',
      blogsLimit: -1, // unlimited
      reviewsLimit: -1, // unlimited
      reviewsUsed: 0,
      billingCycle: 'monthly',
      nextResetDate: (() => {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setHours(0, 0, 0, 0);
        return nextMonth;
      })(),
      features: {
        bulkUpload: true,
        weeklyCalls: true,
        coursesAccess: true,
        prioritySupport: true
      }
    };
    
    console.log(`\n🔄 Updating ${mismatchedUsers.length} users to Black Belt subscription...`);
    
    // Update all mismatched users
    const updateResult = await User.updateMany(
      {
        role: 'black_belt',
        $or: [
          { 'subscription.plan': 'starter' },
          { 'subscription.plan': { $exists: false } },
          { 'subscription': { $exists: false } }
        ]
      },
      {
        $set: {
          subscription: blackBeltSubscription
        }
      }
    );
    
    console.log(`✅ Successfully updated ${updateResult.modifiedCount} users`);
    
    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    const verifyUsers = await User.find({
      role: 'black_belt'
    }).select('name email role subscription.plan subscription.blogsLimit subscription.features');
    
    console.log(`\n📋 Current Black Belt users (${verifyUsers.length} total):`);
    verifyUsers.forEach((user, index) => {
      const features = user.subscription?.features || {};
      const hasAllFeatures = features.bulkUpload && features.coursesAccess && features.prioritySupport;
      console.log(`${index + 1}. ${user.name}: plan=${user.subscription?.plan}, blogs=${user.subscription?.blogsLimit}, features=${hasAllFeatures ? '✅' : '❌'}`);
    });
    
    console.log('\n🎉 All done!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixUserPlans();