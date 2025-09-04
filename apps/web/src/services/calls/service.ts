import { api } from '../api';
import type { 
  WeeklyCall, 
  CreateCallData, 
  CallsResponse, 
  CallResponse, 
  ParticipantsResponse 
} from './types';

export const callService = {
  // Get upcoming calls for users
  getUpcomingCalls: async (): Promise<WeeklyCall[]> => {
    const response = await api.get<{ success: boolean; data: WeeklyCall[] }>('/api/calls/upcoming');
    return response.data.data;
  },

  // Get past calls for users
  getPastCalls: async (): Promise<WeeklyCall[]> => {
    const response = await api.get<{ success: boolean; data: WeeklyCall[] }>('/api/calls/past');
    return response.data.data;
  },

  // Get single call details
  getCall: async (callId: string): Promise<WeeklyCall> => {
    const response = await api.get<CallResponse>(`/api/calls/${callId}`);
    return response.data.data;
  },

  // Register for a call
  registerForCall: async (callId: string): Promise<void> => {
    await api.post(`/api/calls/${callId}/register`);
  },

  // Unregister from a call
  unregisterFromCall: async (callId: string): Promise<void> => {
    await api.delete(`/api/calls/${callId}/register`);
  },

  // Admin: Get all calls with pagination
  getAllCalls: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<CallsResponse> => {
    const response = await api.get<CallsResponse>('/api/calls', { params });
    return response.data;
  },

  // Admin: Create new call
  createCall: async (data: CreateCallData): Promise<WeeklyCall> => {
    const response = await api.post<CallResponse>('/api/calls', data);
    return response.data.data;
  },

  // Admin: Update call
  updateCall: async (callId: string, data: Partial<CreateCallData>): Promise<WeeklyCall> => {
    const response = await api.put<CallResponse>(`/api/calls/${callId}`, data);
    return response.data.data;
  },

  // Admin: Delete call
  deleteCall: async (callId: string): Promise<void> => {
    await api.delete(`/api/calls/${callId}`);
  },

  // Admin: Get call participants
  getCallParticipants: async (callId: string): Promise<ParticipantsResponse> => {
    const response = await api.get<ParticipantsResponse>(`/api/calls/${callId}/participants`);
    return response.data;
  },

  // Admin: Update recording link
  updateRecording: async (callId: string, recordingLink: string): Promise<WeeklyCall> => {
    const response = await api.put<CallResponse>(`/api/calls/${callId}/recording`, { recordingLink });
    return response.data.data;
  },
};