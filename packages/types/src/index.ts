/**
 * @tatame/types - Shared TypeScript types for Tatame platform
 */

// ============================================
// User & Authentication Types
// ============================================

export type UserRole = 'aluno' | 'mentor' | 'moderador' | 'admin';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface IUser {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar?: string;
  location?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    youtube?: string;
    website?: string;
  };
  role: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
  membership?: {
    product?: string;
    status?: 'active' | 'cancelled' | 'expired' | 'pending';
    expiresAt?: Date;
  };
  // Networking fields
  abilities?: string[];
  interests?: string[];
  lookingFor?: ('mentorship' | 'collaboration' | 'partnership' | 'networking' | 'learning')[];
  availability?: 'available' | 'busy' | 'not_interested';
  profileCompleteness?: number;
  connectionCount?: number;
  // Personal interests
  personalInterests?: {
    music?: string[];
    hobbies?: string[];
    gymFrequency?: 'never' | 'rarely' | '1-2x_week' | '3-4x_week' | '5+_week' | 'daily';
    travelInterests?: string[];
    favoriteBooks?: string[];
    favoriteMovies?: string[];
    languages?: string[];
    dietPreferences?: string[];
  };
  createdAt: Date | string;
  updatedAt?: Date | string;
  lastLoginAt?: Date | string;
}

export interface IUserProfile {
  userId: string;
  bio?: string;
  socials?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  belt?: BeltLevel;
  points?: number;
}

// ============================================
// Authentication Types
// ============================================

export interface IAuthToken {
  token: string;
  expiresIn: number;
  type: 'access' | 'refresh';
}

export interface ISession {
  userId: string;
  role: UserRole;
  createdAt: Date;
  expiresAt: Date;
}

export interface IMagicLinkPayload {
  email: string;
  token: string;
  expiresAt: Date;
}

// ============================================
// Membership & Kiwify Types
// ============================================

export type MembershipStatus = 'active' | 'cancelled' | 'expired' | 'pending' | 'suspended';

export type PaymentStatus = 'approved' | 'pending' | 'cancelled' | 'refunded' | 'chargeback';

export interface IMembership {
  id: string;
  userId: string;
  plan: string;
  status: MembershipStatus;
  kiwifyOrderId?: string;
  kiwifyCustomerId?: string;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IKiwifyWebhookEvent {
  event: string;
  orderId: string;
  customerId: string;
  productId: string;
  email: string;
  status: PaymentStatus;
  amount: number;
  timestamp: Date;
  signature: string;
}

// ============================================
// Course & Content Types
// ============================================

export type BeltLevel = 'white' | 'blue' | 'purple' | 'brown' | 'black';

export type LessonStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface ICourse {
  id: string;
  title: string;
  description: string;
  slug: string;
  thumbnailUrl?: string;
  order: number;
  isPublished: boolean;
  modules: IModule[];
}

export interface IModule {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  lessons: ILesson[];
}

export interface ILesson {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  videoUrl?: string;
  videoDuration?: number;
  contentHtml?: string;
  order: number;
  materials?: IMaterial[];
}

export interface IMaterial {
  id: string;
  lessonId: string;
  title: string;
  type: 'pdf' | 'image' | 'video' | 'link' | 'file';
  url: string;
  size?: number;
}

export interface ILessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  status: LessonStatus;
  completedAt?: Date;
  lastWatchedPosition?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Site Installer Types
// ============================================

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type DNSCheckStatus = 'pending' | 'checking' | 'propagated' | 'failed';

export interface ISiteTemplate {
  id: string;
  name: string;
  description: string;
  type: 'wordpress' | 'static';
  thumbnailUrl?: string;
  sizeMb: number;
  url: string;
  checksum: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISite {
  id: string;
  userId: string;
  domain: string;
  templateId: string;
  status: JobStatus;
  jobId?: string;
  nameservers?: string[];
  cloudflareZoneId?: string;
  vpsIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInstallJob {
  id: string;
  siteId: string;
  templateId: string;
  status: JobStatus;
  progress: number;
  currentStep?: string;
  logs: IJobLog[];
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface IJobLog {
  id: string;
  jobId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IDNSCheck {
  id: string;
  siteId: string;
  status: DNSCheckStatus;
  nameserversOk: boolean;
  aRecordOk: boolean;
  httpsOk: boolean;
  lastCheckAt: Date;
  nextCheckAt?: Date;
}

// ============================================
// Networking/Connection Types
// ============================================

export type ConnectionStatus = 'pending' | 'accepted' | 'blocked' | 'rejected';

export interface IConnection {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: ConnectionStatus;
  message?: string;
  acceptedAt?: Date | string;
  rejectedAt?: Date | string;
  blockedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IConnectionRequest {
  toUserId: string;
  message?: string;
}

// ============================================
// Community/Chat Types
// ============================================

export type ChannelType = 'public' | 'private' | 'dm';

export interface IChannel {
  id: string;
  name: string;
  description?: string;
  type: ChannelType;
  createdBy: string;
  memberCount: number;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  attachments?: IAttachment[];
  threadId?: string;
  replyToId?: string;
  reactions?: IReaction[];
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
}

export interface IAttachment {
  id: string;
  messageId: string;
  type: 'image' | 'file';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface IReaction {
  emoji: string;
  userIds: string[];
  count: number;
}

// ============================================
// API Response Types
// ============================================

export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: IApiError;
  meta?: IApiMeta;
}

export interface IApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface IApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface IPaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ============================================
// Notification Types
// ============================================

export type NotificationType = 
  | 'welcome'
  | 'magic_link'
  | 'job_completed'
  | 'job_failed'
  | 'new_message'
  | 'new_mention'
  | 'course_available'
  | 'belt_upgrade';

export interface INotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  readAt?: Date;
  createdAt: Date;
}

// ============================================
// Audit & Logging Types
// ============================================

export interface IAuditLog {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// ============================================
// Environment & Config Types
// ============================================

export interface IEnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  API_URL: string;
  FRONTEND_URL: string;
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  MAGIC_LINK_SECRET: string;
  SESSION_SECRET: string;
}

// ============================================
// Feature Flags
// ============================================

export interface IFeatureFlags {
  seoTools: boolean;
  advancedChat: boolean;
  videoHLS: boolean;
  twoFactorAuth: boolean;
  socialLogin: boolean;
}

// ============================================
// Utility Types
// ============================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<IApiResponse<T>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};