import type { IUser, UserRole, IApiResponse } from '@tatame/types';

// Test type imports in frontend
const TestComponent = () => {
  const user: IUser = {
    id: '456',
    email: 'frontend@example.com',
    name: 'Frontend User',
    role: 'admin' as UserRole,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockApiResponse: IApiResponse<IUser[]> = {
    success: true,
    data: [user],
    meta: {
      total: 1,
      page: 1
    }
  };

  return (
    <div>
      <h1>Types Test</h1>
      <p>User: {user.name} ({user.role})</p>
      <p>API Success: {mockApiResponse.success ? '✅' : '❌'}</p>
    </div>
  );
};

export default TestComponent;