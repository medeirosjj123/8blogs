const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// User model schema (simplified version)
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

// Test users data
const testUsers = [
  {
    email: 'maria.silva@example.com',
    name: 'Maria Silva',
    bio: 'Especialista em SEO com 5 anos de experiência. Apaixonada por otimização de conteúdo e link building.',
    location: 'São Paulo, SP',
    abilities: ['SEO', 'Link Building', 'Keyword Research', 'Content Marketing'],
    interests: ['Marketing Digital', 'Empreendedorismo', 'Tecnologia', 'Educação'],
    lookingFor: ['networking', 'collaboration', 'learning'],
    availability: 'available',
    socialLinks: {
      website: 'https://mariasilva.com.br',
      linkedin: 'https://linkedin.com/in/mariasilva'
    }
  },
  {
    email: 'joao.santos@example.com',
    name: 'João Santos',
    bio: 'Desenvolvedor WordPress e entusiasta de e-commerce. Criando lojas online de sucesso.',
    location: 'Rio de Janeiro, RJ',
    abilities: ['WordPress', 'WooCommerce', 'PHP', 'E-commerce', 'Web Development'],
    interests: ['Programação', 'Startups', 'Inovação', 'Growth'],
    lookingFor: ['partnership', 'collaboration'],
    availability: 'available',
    socialLinks: {
      instagram: 'https://instagram.com/joaodev',
      website: 'https://joaosantos.dev'
    }
  },
  {
    email: 'ana.costa@example.com',
    name: 'Ana Costa',
    bio: 'Copywriter criativa focada em conversão. Transformo palavras em vendas.',
    location: 'Belo Horizonte, MG',
    abilities: ['Copywriting', 'Content Writing', 'Email Marketing', 'Social Media'],
    interests: ['Escrita', 'Marketing', 'Psicologia', 'Vendas'],
    lookingFor: ['mentorship', 'networking'],
    availability: 'available',
    socialLinks: {
      facebook: 'https://facebook.com/anacostacopy'
    }
  },
  {
    email: 'pedro.oliveira@example.com',
    name: 'Pedro Oliveira',
    bio: 'Especialista em Google Ads e Facebook Ads. ROI é meu sobrenome.',
    location: 'Curitiba, PR',
    abilities: ['Google Ads', 'Facebook Ads', 'Analytics', 'Marketing Digital'],
    interests: ['Análise de Dados', 'Performance Marketing', 'Automação'],
    lookingFor: ['collaboration', 'learning'],
    availability: 'busy',
    socialLinks: {
      youtube: 'https://youtube.com/@pedrooliveira'
    }
  },
  {
    email: 'carla.mendes@example.com',
    name: 'Carla Mendes',
    bio: 'Designer UI/UX com foco em conversão. Crio experiências que vendem.',
    location: 'Porto Alegre, RS',
    abilities: ['UI Design', 'UX Design', 'Figma', 'Web Design', 'Branding'],
    interests: ['Design', 'Arte', 'Tecnologia', 'User Experience'],
    lookingFor: ['partnership', 'networking'],
    availability: 'available'
  },
  {
    email: 'rafael.lima@example.com',
    name: 'Rafael Lima',
    bio: 'Consultor de SEO técnico. Especialista em Core Web Vitals e performance.',
    location: 'Brasília, DF',
    abilities: ['Technical SEO', 'Site Speed', 'Core Web Vitals', 'Schema Markup'],
    interests: ['Tecnologia', 'Programação', 'SEO', 'Performance'],
    lookingFor: ['collaboration', 'mentorship'],
    availability: 'available',
    socialLinks: {
      website: 'https://rafaellima.tech',
      linkedin: 'https://linkedin.com/in/rafaellima'
    }
  },
  {
    email: 'fernanda.rodrigues@example.com',
    name: 'Fernanda Rodrigues',
    bio: 'Growth Hacker e especialista em funis de vendas. Escalo negócios digitais.',
    location: 'Florianópolis, SC',
    abilities: ['Growth Hacking', 'Sales Funnels', 'Conversion Optimization', 'A/B Testing'],
    interests: ['Growth', 'Startups', 'Marketing', 'Vendas'],
    lookingFor: ['partnership', 'collaboration', 'networking'],
    availability: 'available'
  },
  {
    email: 'lucas.ferreira@example.com',
    name: 'Lucas Ferreira',
    bio: 'Especialista em automação de marketing e email campaigns.',
    location: 'Salvador, BA',
    abilities: ['Email Marketing', 'Marketing Automation', 'CRM', 'Lead Generation'],
    interests: ['Automação', 'Tecnologia', 'Marketing', 'Produtividade'],
    lookingFor: ['learning', 'networking'],
    availability: 'available'
  },
  {
    email: 'patricia.alves@example.com',
    name: 'Patrícia Alves',
    bio: 'Content Creator e estrategista de redes sociais. Engajamento é minha especialidade.',
    location: 'Recife, PE',
    abilities: ['Social Media', 'Content Creation', 'Instagram Marketing', 'TikTok'],
    interests: ['Redes Sociais', 'Criação de Conteúdo', 'Tendências', 'Influencer Marketing'],
    lookingFor: ['collaboration', 'partnership'],
    availability: 'busy'
  },
  {
    email: 'marcos.souza@example.com',
    name: 'Marcos Souza',
    bio: 'Desenvolvedor full-stack e criador de plugins WordPress.',
    location: 'Campinas, SP',
    abilities: ['JavaScript', 'React', 'Node.js', 'WordPress', 'PHP'],
    interests: ['Programação', 'Open Source', 'Tecnologia', 'Inovação'],
    lookingFor: ['collaboration', 'mentorship', 'learning'],
    availability: 'available',
    socialLinks: {
      github: 'https://github.com/marcossouza',
      website: 'https://marcossouza.dev'
    }
  },
  {
    email: 'juliana.castro@example.com',
    name: 'Juliana Castro',
    bio: 'Especialista em SEO local e Google My Business. Ajudo negócios locais a dominarem o Google.',
    location: 'Fortaleza, CE',
    abilities: ['Local SEO', 'Google My Business', 'Citation Building', 'Review Management'],
    interests: ['SEO', 'Marketing Local', 'Pequenos Negócios', 'Empreendedorismo'],
    lookingFor: ['networking', 'partnership'],
    availability: 'available'
  },
  {
    email: 'bruno.martins@example.com',
    name: 'Bruno Martins',
    bio: 'Data Analyst focado em métricas de marketing digital. Transformo dados em insights.',
    location: 'Vitória, ES',
    abilities: ['Google Analytics', 'Data Analysis', 'Python', 'Data Visualization', 'SQL'],
    interests: ['Análise de Dados', 'Business Intelligence', 'Machine Learning'],
    lookingFor: ['learning', 'collaboration'],
    availability: 'available'
  }
];

async function createTestUsers() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is required. Please set your MongoDB Atlas connection string.');
      process.exit(1);
    }
    
    // Connect to MongoDB Atlas
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Hash a common password for all test users
    const defaultPassword = 'Test123!@#';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    let createdCount = 0;
    let skippedCount = 0;

    console.log('\n📝 Creating test users...\n');

    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        
        if (existingUser) {
          console.log(`⏭️  Skipping ${userData.name} - already exists`);
          skippedCount++;
          continue;
        }

        // Calculate profile completeness
        let completeness = 0;
        const fields = ['name', 'bio', 'location', 'abilities', 'interests', 'lookingFor'];
        fields.forEach(field => {
          const value = userData[field];
          if (value && (Array.isArray(value) ? value.length > 0 : true)) {
            completeness += 100 / fields.length;
          }
        });

        // Create new user
        const newUser = new User({
          ...userData,
          passwordHash,
          profileCompleteness: Math.round(completeness),
          emailVerified: true,
          role: 'aluno'
        });

        await newUser.save();
        createdCount++;
        
        console.log(`✅ Created user: ${userData.name}`);
        console.log(`   📍 Location: ${userData.location || 'Not specified'}`);
        console.log(`   💼 Abilities: ${userData.abilities.join(', ')}`);
        console.log(`   ❤️  Interests: ${userData.interests.join(', ')}`);
        console.log(`   🎯 Looking for: ${userData.lookingFor.join(', ')}`);
        console.log(`   📊 Profile completeness: ${Math.round(completeness)}%`);
        console.log(`   🔑 Password: ${defaultPassword}\n`);
        
      } catch (error) {
        console.error(`❌ Error creating user ${userData.name}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Created: ${createdCount} users`);
    console.log(`   ⏭️  Skipped: ${skippedCount} users (already existed)`);
    console.log(`\n🔑 All users have the password: ${defaultPassword}`);
    console.log('\n🎉 Test users creation completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
createTestUsers();