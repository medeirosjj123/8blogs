/**
 * MongoDB Production Setup Script
 * Creates indexes and initial data for production deployment
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = 'admin@tatame.com';
const ADMIN_PASSWORD = 'TatameAdmin2024!';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function setupDatabase() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    console.log('✅ Connected to MongoDB Atlas');
    
    // Create indexes for performance
    console.log('📊 Creating database indexes...');
    await createIndexes(db);
    
    // Create initial admin user
    console.log('👤 Creating initial admin user...');
    await createAdminUser(db);
    
    // Create default channels
    console.log('💬 Creating default chat channels...');
    await createDefaultChannels(db);
    
    // Create default email templates
    console.log('📧 Creating default email templates...');
    await createEmailTemplates(db);
    
    console.log('✅ Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function createIndexes(db) {
  const collections = [
    {
      name: 'users',
      indexes: [
        { key: { email: 1 }, options: { unique: true } },
        { key: { magicLinkToken: 1 }, options: { sparse: true } },
        { key: { createdAt: -1 } },
        { key: { role: 1 } },
        { key: { isEmailVerified: 1 } }
      ]
    },
    {
      name: 'memberships',
      indexes: [
        { key: { userId: 1 } },
        { key: { kiwifyOrderId: 1 }, options: { unique: true, sparse: true } },
        { key: { status: 1 } },
        { key: { plan: 1 } },
        { key: { currentPeriodEnd: 1 } }
      ]
    },
    {
      name: 'courses',
      indexes: [
        { key: { isPublished: 1 } },
        { key: { order: 1 } },
        { key: { createdAt: -1 } }
      ]
    },
    {
      name: 'progress',
      indexes: [
        { key: { userId: 1, courseId: 1 }, options: { unique: true } },
        { key: { userId: 1 } },
        { key: { completedAt: -1 } }
      ]
    },
    {
      name: 'chatmessages',
      indexes: [
        { key: { channelId: 1, createdAt: -1 } },
        { key: { authorId: 1 } },
        { key: { createdAt: -1 } }
      ]
    },
    {
      name: 'channels',
      indexes: [
        { key: { name: 1 }, options: { unique: true } },
        { key: { isPublic: 1 } },
        { key: { createdAt: -1 } }
      ]
    },
    {
      name: 'notifications',
      indexes: [
        { key: { userId: 1, createdAt: -1 } },
        { key: { isRead: 1 } },
        { key: { type: 1 } }
      ]
    },
    {
      name: 'wordpresssites',
      indexes: [
        { key: { userId: 1 } },
        { key: { domain: 1 }, options: { unique: true, sparse: true } },
        { key: { status: 1 } },
        { key: { createdAt: -1 } }
      ]
    }
  ];

  for (const collection of collections) {
    console.log(`  Creating indexes for ${collection.name}...`);
    const coll = db.collection(collection.name);
    
    for (const index of collection.indexes) {
      try {
        await coll.createIndex(index.key, index.options || {});
        console.log(`    ✅ Created index: ${JSON.stringify(index.key)}`);
      } catch (error) {
        if (error.code === 85) { // IndexOptionsConflict
          console.log(`    ⚠️  Index already exists: ${JSON.stringify(index.key)}`);
        } else {
          throw error;
        }
      }
    }
  }
}

async function createAdminUser(db) {
  const users = db.collection('users');
  
  // Check if admin already exists
  const existingAdmin = await users.findOne({ email: ADMIN_EMAIL });
  if (existingAdmin) {
    console.log('  ⚠️  Admin user already exists');
    return;
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
  
  // Create admin user
  const adminUser = {
    name: 'Administrador Tatame',
    email: ADMIN_EMAIL,
    password: hashedPassword,
    role: 'admin',
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      bio: 'Administrador da plataforma Tatame',
      avatar: null
    }
  };
  
  await users.insertOne(adminUser);
  console.log(`  ✅ Admin user created: ${ADMIN_EMAIL}`);
  console.log(`  🔑 Admin password: ${ADMIN_PASSWORD}`);
  console.log('  ⚠️  IMPORTANT: Change the admin password after first login!');
}

async function createDefaultChannels(db) {
  const channels = db.collection('channels');
  
  const defaultChannels = [
    {
      name: 'geral',
      description: 'Discussões gerais sobre SEO e WordPress',
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'ajuda',
      description: 'Tire suas dúvidas e peça ajuda',
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'sites-wordpress',
      description: 'Compartilhe seus sites e receba feedback',
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'anuncios',
      description: 'Novidades e anúncios importantes',
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  for (const channel of defaultChannels) {
    try {
      await channels.insertOne(channel);
      console.log(`  ✅ Created channel: ${channel.name}`);
    } catch (error) {
      if (error.code === 11000) { // Duplicate key
        console.log(`  ⚠️  Channel already exists: ${channel.name}`);
      } else {
        throw error;
      }
    }
  }
}

async function createEmailTemplates(db) {
  const templates = db.collection('emailtemplates');
  
  const defaultTemplates = [
    {
      name: 'welcome',
      subject: 'Bem-vindo à Escola do SEO! 🚀',
      htmlContent: `
        <h1>Bem-vindo à Escola do SEO!</h1>
        <p>Olá {{name}},</p>
        <p>É um prazer tê-lo conosco! Você agora faz parte da maior comunidade de SEO do Brasil.</p>
        <p>Aqui estão alguns primeiros passos:</p>
        <ul>
          <li>Complete seu perfil</li>
          <li>Explore os cursos disponíveis</li>
          <li>Participe da nossa comunidade</li>
        </ul>
        <p><a href="{{frontendUrl}}/cursos" style="background: #E10600; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Ver Cursos</a></p>
        <p>Qualquer dúvida, estamos aqui para ajudar!</p>
        <p>Equipe Tatame</p>
      `,
      textContent: 'Bem-vindo à Escola do SEO! Acesse {{frontendUrl}} para começar.',
      variables: ['name', 'frontendUrl'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'magicLink',
      subject: 'Seu acesso rápido à Escola do SEO ⚡',
      htmlContent: `
        <h1>Acesso Rápido</h1>
        <p>Olá {{name}},</p>
        <p>Clique no botão abaixo para acessar sua conta:</p>
        <p><a href="{{magicLinkUrl}}" style="background: #E10600; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Acessar Conta</a></p>
        <p><strong>Este link expira em 1 hora por segurança.</strong></p>
        <p>Se você não solicitou este acesso, pode ignorar este email.</p>
        <p>Equipe Tatame</p>
      `,
      textContent: 'Acesse sua conta: {{magicLinkUrl}}',
      variables: ['name', 'magicLinkUrl'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'passwordReset',
      subject: 'Redefinir senha - Escola do SEO',
      htmlContent: `
        <h1>Redefinir Senha</h1>
        <p>Olá {{name}},</p>
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <p><a href="{{resetUrl}}" style="background: #E10600; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Redefinir Senha</a></p>
        <p><strong>Este link expira em 1 hora.</strong></p>
        <p>Se você não solicitou esta alteração, pode ignorar este email.</p>
        <p>Equipe Tatame</p>
      `,
      textContent: 'Redefina sua senha: {{resetUrl}}',
      variables: ['name', 'resetUrl'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  for (const template of defaultTemplates) {
    try {
      await templates.insertOne(template);
      console.log(`  ✅ Created email template: ${template.name}`);
    } catch (error) {
      console.log(`  ⚠️  Template might already exist: ${template.name}`);
    }
  }
}

// Run the setup
setupDatabase().catch(console.error);