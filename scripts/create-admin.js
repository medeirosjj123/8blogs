const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env' });

async function createAdmin() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Check if admin exists
    const existingAdmin = await usersCollection.findOne({ email: 'admin@tatame.com.br' });
    
    if (existingAdmin) {
      // Update password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await usersCollection.updateOne(
        { email: 'admin@tatame.com.br' },
        { 
          $set: { 
            passwordHash: hashedPassword,
            role: 'admin',
            isActive: true,
            emailVerified: true,
            updatedAt: new Date()
          } 
        }
      );
      console.log('✅ Admin user password updated');
    } else {
      // Create new admin
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = {
        email: 'admin@tatame.com.br',
        passwordHash: hashedPassword,
        name: 'Admin Tatame',
        role: 'admin',
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await usersCollection.insertOne(admin);
      console.log('✅ Admin user created');
    }
    
    console.log('\n📧 Admin credentials:');
    console.log('Email: admin@tatame.com.br');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

createAdmin();