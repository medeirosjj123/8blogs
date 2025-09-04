export interface WeeklyCall {
  _id: string;
  title: string;
  description: string;
  date: string;
  duration: number;
  maxParticipants: number;
  zoomLink?: string;
  recordingLink?: string;
  topics: string[];
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  registeredUsers: string[];
  attendedUsers: string[];
  registrationDeadline?: string;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  currentParticipants: number;
  availableSpots: number;
  isFull: boolean;
  canRegister: boolean;
}

export interface CallRegistration {
  _id: string;
  userId: string;
  callId: string;
  registeredAt: string;
  attended: boolean;
  joinedAt?: string;
  leftAt?: string;
  duration?: number;
  rating?: number;
  feedback?: string;
  remindersSent: {
    initial: boolean;
    oneDayBefore: boolean;
    oneHourBefore: boolean;
  };
  cancelledAt?: string;
  cancellationReason?: string;
  waitlisted: boolean;
  waitlistPosition?: number;
  status: 'registered' | 'waitlisted' | 'attended' | 'cancelled';
  isActive: boolean;
}

export interface CallParticipant {
  _id: string;
  name: string;
  email: string;
  registrationInfo: CallRegistration;
}

export interface CallsResponse {
  success: boolean;
  data: {
    calls: WeeklyCall[];
    total: number;
    page: number;
    totalPages: number;
  };
}

export interface CallResponse {
  success: boolean;
  data: WeeklyCall;
}

export interface CreateCallData {
  title: string;
  description: string;
  date: string;
  duration: number;
  maxParticipants: number;
  zoomLink?: string;
  recordingLink?: string;
  topics: string[];
  registrationDeadline?: string;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
}

export interface ParticipantsResponse {
  success: boolean;
  data: {
    participants: CallParticipant[];
    total: number;
    stats: {
      registered: number;
      attended: number;
      waitlisted: number;
      cancelled: number;
    };
  };
}