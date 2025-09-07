const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const MONGODB_URI = "mongodb+srv://8links:6zuQIeXNTWPo1qTh@cluster0.2yead.mongodb.net/tatame?retryWrites=true&w=majority&appName=Cluster0";

async function fixWebhookAffectedUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Define schemas
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      role: String,
      membership: {
        product: String,
        status: String,
        expiresAt: Date
      },
      subscription: {
        plan: String,
        blogsLimit: Number,
        reviewsLimit: Number,
        reviewsUsed: Number,
        billingCycle: String,
        nextResetDate: Date,
        features: {
          bulkUpload: Boolean,
          weeklyCalls: Boolean,
          coursesAccess: Boolean,
          prioritySupport: Boolean
        }
      },
      createdAt: Date,
      updatedAt: Date
    }, { collection: 'users' });
    
    const membershipSchema = new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId,
      plan: String,
      status: String,
      kiwifyOrderId: String,
      kiwifyCustomerId: String,
      kiwifyProductId: String,
      createdAt: Date
    }, { collection: 'memberships' });
    
    const User = mongoose.model('User', userSchema);
    const Membership = mongoose.model('Membership', membershipSchema);
    
    console.log('🔍 Finding users who might be affected by webhook bugs...\n');
    
    // Find users with potential issues
    const potentiallyAffected = await User.find({
      $or: [
        // Users with invalid roles that might have been created by webhook
        { role: { $nin: ['starter', 'pro', 'black_belt', 'admin'] } },
        // Users who have active memberships but wrong role/subscription
        { 
          'membership.status': 'active',
          $or: [
            { role: 'starter', subscription: { $exists: false } },
            { role: { $ne: 'starter' }, 'subscription.plan': 'starter' },
            { 'subscription.plan': 'basic' } // Invalid plan
          ]
        }
      ]
    }).select('name email role membership subscription createdAt');
    
    console.log(`📊 Found ${potentiallyAffected.length} potentially affected users\n`);
    
    if (potentiallyAffected.length === 0) {
      console.log('🎉 No users need fixing!');
      process.exit(0);
    }
    
    // Show affected users
    potentiallyAffected.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Plan: ${user.subscription?.plan || 'none'}`);
      console.log(`   Membership: ${user.membership?.status || 'none'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });
    
    // Get their memberships to determine correct roles
    console.log('🔍 Checking memberships for these users...\n');
    
    let fixed = 0;
    let errors = 0;
    
    for (const user of potentiallyAffected) {
      try {
        // Find their membership(s)
        const memberships = await Membership.find({
          userId: user._id,
          status: 'active'
        }).sort({ createdAt: -1 });
        
        if (memberships.length === 0) {
          console.log(`⚠️  ${user.name}: No active memberships found - setting to starter`);
          
          await User.findByIdAndUpdate(user._id, {
            role: 'starter',
            subscription: {
              plan: 'starter',
              blogsLimit: 1,
              reviewsLimit: 40,
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
                bulkUpload: false,
                weeklyCalls: false,
                coursesAccess: false,
                prioritySupport: false
              }
            }
          });
          fixed++;
          continue;
        }
        
        // Get the latest active membership
        const membership = memberships[0];
        const plan = membership.plan || 'starter';
        
        // Determine correct role and subscription based on plan
        let correctRole = 'starter';
        let subscription = {
          plan: 'starter',
          blogsLimit: 1,
          reviewsLimit: 40,
          reviewsUsed: 0,
          billingCycle: 'monthly',
          features: {
            bulkUpload: false,
            weeklyCalls: false,
            coursesAccess: false,
            prioritySupport: false
          }
        };
        
        switch (plan) {
          case 'black_belt':
          case 'premium': // Legacy
            correctRole = 'black_belt';
            subscription = {
              plan: 'black_belt',
              blogsLimit: -1,
              reviewsLimit: -1,
              reviewsUsed: 0,
              billingCycle: 'yearly',
              features: {
                bulkUpload: true,
                weeklyCalls: true,
                coursesAccess: true,
                prioritySupport: true
              }
            };
            break;
          case 'pro':
            correctRole = 'pro';
            subscription = {
              plan: 'pro',
              blogsLimit: 3,
              reviewsLimit: 100,
              reviewsUsed: 0,
              billingCycle: 'monthly',
              features: {
                bulkUpload: false,
                weeklyCalls: false,
                coursesAccess: false,
                prioritySupport: true
              }
            };
            break;
        }
        
        // Add next reset date
        const nextResetDate = new Date();
        nextResetDate.setMonth(nextResetDate.getMonth() + 1);
        nextResetDate.setDate(1);
        nextResetDate.setHours(0, 0, 0, 0);
        subscription.nextResetDate = nextResetDate;
        
        console.log(`✅ ${user.name}: Fixing ${user.role} → ${correctRole} (${plan} plan)`);
        
        await User.findByIdAndUpdate(user._id, {
          role: correctRole,
          subscription: subscription
        });
        
        fixed++;
        
      } catch (error) {
        console.log(`❌ ${user.name}: Error fixing user - ${error.message}`);
        errors++;
      }
    }
    
    console.log(`\n📊 Fix Summary:`);
    console.log(`✅ Successfully fixed: ${fixed} users`);
    console.log(`❌ Errors: ${errors} users`);
    
    if (errors === 0) {
      console.log(`\n🎉 All affected users have been fixed!`);
    }
    
    // Final verification
    console.log(`\n🔍 Final verification...`);
    const stillAffected = await User.find({
      role: { $nin: ['starter', 'pro', 'black_belt', 'admin'] }
    }).count();
    
    console.log(`Users with invalid roles remaining: ${stillAffected}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixWebhookAffectedUsers();