import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Course } from '../src/models/Course';
import { Module } from '../src/models/Module';
import { Lesson } from '../src/models/Lesson';

// Load environment variables
dotenv.config({ path: '../.env' });

async function seedCourses() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://8links:6zuQIeXNTWPo1qTh@cluster0.2yead.mongodb.net/tatame?retryWrites=true&w=majority';
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Course.deleteMany({});
    await Module.deleteMany({});
    await Lesson.deleteMany({});
    console.log('📦 Cleared existing course data');

    // Create courses
    const courses = [
      {
        title: 'Marketing de Afiliados - Fundamentos',
        slug: 'marketing-afiliados-fundamentos',
        description: 'Aprenda a criar um negócio lucrativo com marketing de afiliados. Desde a escolha de nichos rentáveis até estratégias avançadas de conversão e vendas.',
        thumbnail: 'https://placehold.co/600x400/1a1a1a/ff6b6b?text=Afiliados+Fundamentos',
        instructor: 'Professor Tatame',
        level: 'beginner',
        duration: 480,
        tags: ['afiliados', 'marketing digital', 'vendas online', 'comissões'],
        requirements: ['Conhecimento básico de internet', 'Vontade de empreender'],
        objectives: ['Escolher nichos rentáveis', 'Encontrar produtos para promover', 'Criar campanhas de alta conversão', 'Gerar primeiras comissões'],
        moduleCount: 5,
        lessonCount: 20,
        isPublished: true,
        order: 1
      },
      {
        title: 'SEO para Blogs de Afiliados',
        slug: 'seo-blogs-afiliados',
        description: 'Domine as técnicas de SEO específicas para blogs de afiliados. Aprenda a rankear reviews, comparações e conteúdo comercial que converte.',
        thumbnail: 'https://placehold.co/600x400/1a1a1a/4dabf7?text=SEO+Afiliados',
        instructor: 'Professor Tatame',
        level: 'intermediate',
        duration: 600,
        tags: ['seo', 'blog', 'afiliados', 'reviews'],
        requirements: ['Conhecimento básico de marketing de afiliados', 'Blog ou site próprio'],
        objectives: ['Rankear palavras-chave comerciais', 'Escrever reviews que convertem', 'Otimizar para featured snippets', 'Aumentar CTR dos afiliados'],
        moduleCount: 6,
        lessonCount: 24,
        isPublished: true,
        order: 2
      },
      {
        title: 'Escala e Automação para Afiliados',
        slug: 'escala-automacao-afiliados',
        description: 'Aprenda a escalar seu negócio de afiliados para 6 dígitos. Automação, gestão de múltiplos sites, e estratégias avançadas de monetização.',
        thumbnail: 'https://placehold.co/600x400/1a1a1a/9775fa?text=Escala+Afiliados',
        instructor: 'Professor Tatame',
        level: 'advanced',
        duration: 720,
        tags: ['automação', 'escala', 'afiliados', 'monetização'],
        requirements: ['Experiência com marketing de afiliados', 'Faturamento mínimo de R$ 5.000/mês'],
        objectives: ['Automatizar processos repetitivos', 'Gerenciar múltiplos sites', 'Diversificar fontes de receita', 'Escalar para 6 dígitos'],
        moduleCount: 7,
        lessonCount: 28,
        isPublished: true,
        order: 3
      }
    ];

    const createdCourses = await Course.insertMany(courses);
    console.log(`✅ Created ${createdCourses.length} courses`);

    // Create modules and lessons for each course
    for (const course of createdCourses) {
      const modules = [];
      
      // Create 3 modules per course
      const moduleNames = [
        ['Introdução e Fundamentos', 'Estratégias Intermediárias', 'Técnicas Avançadas'],
        ['Pesquisa de Nichos', 'Criação de Conteúdo', 'Otimização e Conversão'],
        ['Análise de Mercado', 'Implementação Prática', 'Escala e Crescimento']
      ];
      
      for (let m = 1; m <= 3; m++) {
        const moduleTitles = moduleNames[course.order - 1] || moduleNames[0];
        const module = await Module.create({
          courseId: course._id,
          title: moduleTitles[m - 1],
          slug: `modulo-${m}-${course.slug}`,
          description: `Aprenda ${moduleTitles[m - 1].toLowerCase()} neste módulo completo com aulas práticas e exercícios`,
          order: m,
          duration: 120,
          lessonCount: 4,
          isPublished: true
        });
        
        modules.push(module);
        
        // Create 4 lessons per module and link them
        const lessonTitles = [
          'Conceitos Fundamentais',
          'Aplicação Prática',
          'Estudo de Caso',
          'Avaliação de Conhecimentos'
        ];
        const lessonIds = [];
        for (let l = 1; l <= 4; l++) {
          const lesson = await Lesson.create({
            courseId: course._id,
            moduleId: module._id,
            title: lessonTitles[l - 1],
            slug: `aula-${l}-modulo-${m}-${course.slug}`,
            description: `${lessonTitles[l - 1]} sobre ${module.title.toLowerCase()}`,
            type: l === 1 ? 'video' : l === 4 ? 'quiz' : 'text',
            order: l,
            duration: 30,
            videoUrl: l === 1 ? 'https://vimeo.com/123456789' : undefined,
            videoProvider: l === 1 ? 'vimeo' : undefined,
            videoId: l === 1 ? '123456789' : undefined,
            content: `# Conteúdo da Aula ${l}\n\nEste é o conteúdo da aula...`,
            isFree: l === 1 && m === 1, // First lesson of first module is free
            isPublished: true
          });
          lessonIds.push(lesson._id);
        }
        
        // Update module with lesson references
        module.lessons = lessonIds;
        module.lessonCount = lessonIds.length;
        await module.save();
      }
      
      // Update course with module references
      course.modules = modules.map(m => m._id);
      await course.save();
    }

    console.log('✅ Created modules and lessons for all courses');

    console.log('\n📊 Database Statistics:');
    const courseCount = await Course.countDocuments();
    const moduleCount = await Module.countDocuments();
    const lessonCount = await Lesson.countDocuments();
    console.log(`Courses: ${courseCount}`);
    console.log(`Modules: ${moduleCount}`);
    console.log(`Lessons: ${lessonCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
seedCourses();