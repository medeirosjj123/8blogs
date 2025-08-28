import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function debugAccount(email: string) {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // Import the User model
    const { User } = await import('../src/models/User');
    
    // Find user with all fields
    const user = await User.findOne({ email }).select('+loginAttempts +lockedUntil +passwordHash');
    
    if (user) {
      console.log('\n=== User Debug Info ===');
      console.log('Email:', user.email);
      console.log('Login Attempts:', user.loginAttempts);
      console.log('Locked Until:', user.lockedUntil);
      console.log('Current Time:', new Date());
      console.log('Is Locked?:', user.lockedUntil && user.lockedUntil > new Date());
      console.log('Has Password?:', !!user.passwordHash);
      console.log('Role:', user.role);
      console.log('Active?:', user.isActive);
      console.log('Email Verified?:', user.emailVerified);
      console.log('\nFull user object:');
      console.log(JSON.stringify(user.toObject(), null, 2));
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
debugAccount(email);