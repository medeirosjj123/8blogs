import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function unlockAccount(email: string) {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // Import the User model
    const { User } = await import('../src/models/User');
    
    const user = await User.findOne({ email });
    
    if (user) {
      user.loginAttempts = 0;
      user.lockedUntil = undefined;
      await user.save();
      
      console.log(`✅ Account unlocked for: ${email}`);
      console.log('Login attempts reset to 0');
      console.log('Account lock removed');
    } else {
      console.log(`User not found: ${email}`);
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'admin@tatame.com.br';
unlockAccount(email);