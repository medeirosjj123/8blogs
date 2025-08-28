/**
 * Test Data Factories
 * Generate realistic test data using Faker.js
 */

import { faker } from '@faker-js/faker';

// Set seed for consistent test data (optional)
// faker.seed(123);

/**
 * Create a random user object
 */
export function createUser(overrides = {}) {
  return {
    email: faker.internet.email().toLowerCase(),
    password: 'TestPass123!',
    name: faker.person.fullName(),
    username: faker.internet.username(),
    avatar: faker.image.avatar(),
    bio: faker.lorem.sentence(),
    role: 'aluno',
    isEmailVerified: true,
    ...overrides,
  };
}

/**
 * Create multiple users
 */
export function createUsers(count: number, overrides = {}) {
  return Array.from({ length: count }, () => createUser(overrides));
}

/**
 * Create a message object
 */
export function createMessage(overrides = {}) {
  return {
    content: faker.lorem.sentence(),
    channelId: 'general',
    userId: faker.string.uuid(),
    timestamp: new Date(),
    ...overrides,
  };
}

/**
 * Create a channel object
 */
export function createChannel(overrides = {}) {
  return {
    name: faker.word.noun().toLowerCase(),
    description: faker.lorem.sentence(),
    isPublic: true,
    members: [],
    ...overrides,
  };
}

/**
 * Create a course module
 */
export function createModule(overrides = {}) {
  return {
    title: faker.company.catchPhrase(),
    description: faker.lorem.paragraph(),
    order: faker.number.int({ min: 1, max: 10 }),
    isPublished: true,
    lessons: [],
    ...overrides,
  };
}

/**
 * Create a lesson
 */
export function createLesson(overrides = {}) {
  return {
    title: faker.company.buzzPhrase(),
    description: faker.lorem.paragraph(),
    videoUrl: faker.internet.url(),
    duration: faker.number.int({ min: 5, max: 60 }),
    order: faker.number.int({ min: 1, max: 20 }),
    materials: [],
    ...overrides,
  };
}

/**
 * Create a site installation request
 */
export function createSiteRequest(overrides = {}) {
  return {
    domain: faker.internet.domainName(),
    serverIp: faker.internet.ipv4(),
    template: 'basic-seo',
    adminEmail: faker.internet.email(),
    siteName: faker.company.name(),
    ...overrides,
  };
}

/**
 * Create a Kiwify webhook payload
 */
export function createKiwifyWebhook(type = 'order.paid', overrides = {}) {
  const basePayload = {
    event: type,
    data: {
      order_id: faker.string.uuid(),
      order_ref: faker.string.alphanumeric(10).toUpperCase(),
      product_id: faker.string.uuid(),
      product_name: 'Tatame SEO Course',
      customer: {
        email: faker.internet.email(),
        name: faker.person.fullName(),
        phone: faker.phone.number(),
      },
      amount: faker.number.int({ min: 100, max: 1000 }),
      status: 'paid',
      created_at: faker.date.recent().toISOString(),
    },
    signature: faker.string.alphanumeric(64),
    ...overrides,
  };

  return basePayload;
}

/**
 * Create a comment/reply
 */
export function createComment(overrides = {}) {
  return {
    content: faker.lorem.sentence(),
    authorId: faker.string.uuid(),
    parentId: null,
    likes: faker.number.int({ min: 0, max: 100 }),
    ...overrides,
  };
}

/**
 * Create progress data
 */
export function createProgress(overrides = {}) {
  return {
    userId: faker.string.uuid(),
    lessonId: faker.string.uuid(),
    completed: faker.datatype.boolean(),
    completedAt: faker.date.recent(),
    timeSpent: faker.number.int({ min: 0, max: 3600 }),
    ...overrides,
  };
}

/**
 * Create a subscription
 */
export function createSubscription(overrides = {}) {
  return {
    userId: faker.string.uuid(),
    plan: faker.helpers.arrayElement(['basic', 'pro', 'premium']),
    status: 'active',
    startDate: faker.date.recent(),
    endDate: faker.date.future(),
    paymentMethod: 'kiwify',
    ...overrides,
  };
}

/**
 * Create notification
 */
export function createNotification(overrides = {}) {
  return {
    userId: faker.string.uuid(),
    type: faker.helpers.arrayElement(['mention', 'dm', 'reply', 'system']),
    title: faker.lorem.sentence(3),
    message: faker.lorem.sentence(),
    read: false,
    createdAt: faker.date.recent(),
    ...overrides,
  };
}

/**
 * Create quiz question
 */
export function createQuizQuestion(overrides = {}) {
  const correctIndex = faker.number.int({ min: 0, max: 3 });
  const options = Array.from({ length: 4 }, (_, i) => ({
    text: faker.lorem.sentence(5),
    isCorrect: i === correctIndex,
  }));

  return {
    question: faker.lorem.sentence().replace('.', '?'),
    options,
    explanation: faker.lorem.sentence(),
    points: faker.number.int({ min: 1, max: 10 }),
    ...overrides,
  };
}

/**
 * Create file upload data
 */
export function createFileUpload(overrides = {}) {
  return {
    filename: faker.system.fileName(),
    mimetype: faker.helpers.arrayElement(['image/jpeg', 'image/png', 'application/pdf']),
    size: faker.number.int({ min: 1000, max: 5000000 }),
    url: faker.internet.url(),
    uploadedBy: faker.string.uuid(),
    ...overrides,
  };
}

/**
 * Generate random Brazilian CPF (for testing)
 */
export function generateCPF(): string {
  const randomDigits = () => Math.floor(Math.random() * 10);
  const cpf = Array.from({ length: 9 }, randomDigits);
  
  // Calculate verification digits (simplified for testing)
  cpf.push(randomDigits());
  cpf.push(randomDigits());
  
  return cpf.join('');
}

/**
 * Generate random Brazilian phone
 */
export function generateBrazilianPhone(): string {
  const ddd = faker.number.int({ min: 11, max: 99 });
  const firstDigit = faker.number.int({ min: 7, max: 9 });
  const rest = faker.number.int({ min: 10000000, max: 99999999 });
  return `+55${ddd}${firstDigit}${rest}`;
}