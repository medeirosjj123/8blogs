import { IUser, IApiResponse, UserRole } from '@tatame/types';

// Test type imports
const testUser: IUser = {
  _id: '123',
  id: '123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user' as UserRole,
  isVerified: false,
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date()
};

const testResponse: IApiResponse<IUser> = {
  success: true,
  data: testUser,
  meta: {
    page: 1,
    limit: 10,
    total: 1
  }
};

console.log('✅ Types working in backend:', testUser.email);
console.log('✅ API Response:', testResponse.success);