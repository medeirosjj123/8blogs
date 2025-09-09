import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
// import { DebugPanel } from './components/debug/DebugPanel';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { MagicLinkAuth } from './pages/MagicLinkAuth';
import { Dashboard } from './pages/Dashboard';
import { Courses } from './pages/Courses';
import { Course } from './pages/Course';
import { Community } from './pages/Community';
import { Tools } from './pages/Tools';
import { Profile } from './pages/Profile';
import ReviewGenerator from './pages/ReviewGenerator';
import { Security } from './pages/profile/Security';
import { Notifications as ProfileNotifications } from './pages/profile/Notifications';
import { Notifications } from './pages/Notifications';
import { Discover } from './pages/Discover';
import { UserProfile } from './pages/UserProfile';
import { ProfileNetworking } from './pages/ProfileNetworking';
import Pricing from './pages/Pricing';
import { WeeklyCalls } from './pages/WeeklyCalls';
import LessonView from './pages/LessonView';
import { BlogsDashboard } from './pages/BlogsDashboard';
import { AdminRoute } from './components/AdminRoute';
import { AdminLayout } from './components/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminCourses from './pages/admin/Courses';
import AdminModules from './pages/admin/Modules';
import AdminLessons from './pages/admin/Lessons';
import AdminSettings from './pages/admin/Settings';
import AdminEmailTemplates from './pages/admin/EmailTemplates';
import AdminTemplates from './pages/admin/Templates';
import AdminProfileSuggestions from './pages/admin/ProfileSuggestions';
import AdminFeatures from './pages/admin/Features';
import { Categories as AdminCategories } from './pages/admin/Categories';
import { ApiManagement } from './pages/admin/ApiManagement';
import { PromptLibrary } from './pages/admin/PromptLibrary';
import { ContentAnalytics } from './pages/admin/ContentAnalytics';
import { AiSettings } from './pages/admin/AiSettings';
import { AiModels } from './pages/admin/AiModels';
import { ContentHub } from './pages/admin/ContentHub';
import { ContentGenerationHub } from './pages/admin/ContentGenerationHub';
import WordPressManagement from './pages/admin/WordPressManagement';
import ThemeManagement from './pages/admin/ThemeManagement';
import PluginManagement from './pages/admin/PluginManagement';
import AdminWeeklyCalls from './pages/admin/WeeklyCalls';
import WordPressSites from './pages/WordPressSites';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/magic-link" element={<MagicLinkAuth />} />
            <Route path="/precos" element={<Pricing />} />
            
            {/* Lesson Routes (Full Screen - No Layout) */}
            <Route path="/courses/:courseId/modules/:moduleId/lessons/:lessonId" element={
              <PrivateRoute>
                <LessonView />
              </PrivateRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="courses" element={<AdminCourses />} />
              <Route path="courses/:courseId/modules" element={<AdminModules />} />
              <Route path="courses/:courseId/modules/:moduleId/lessons" element={<AdminLessons />} />
              <Route path="features" element={<AdminFeatures />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="content-hub" element={<ContentGenerationHub />} />
              {/* Legacy routes - redirect to hub */}
              <Route path="api-management" element={<ContentGenerationHub />} />
              <Route path="prompt-library" element={<ContentGenerationHub />} />
              <Route path="ai-settings" element={<AiSettings />} />
              <Route path="ai-models" element={<ContentGenerationHub />} />
              <Route path="content-analytics" element={<ContentGenerationHub />} />
              <Route path="templates" element={<AdminTemplates />} />
              <Route path="profile-suggestions" element={<AdminProfileSuggestions />} />
              <Route path="wordpress" element={<WordPressManagement />} />
              <Route path="wordpress/themes" element={<ThemeManagement />} />
              <Route path="wordpress/plugins" element={<PluginManagement />} />
              <Route path="calls" element={<AdminWeeklyCalls />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="email-templates" element={<AdminEmailTemplates />} />
            </Route>
            
            {/* Protected Routes with Layout */}
            <Route element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/meus-sites" element={<WordPressSites />} />
              <Route path="/cursos" element={<Courses />} />
              <Route path="/course/:courseId" element={<Course />} />
              <Route path="/comunidade" element={<Community />} />
              <Route path="/descobrir" element={<Discover />} />
              <Route path="/usuarios/:userId" element={<UserProfile />} />
              <Route path="/ferramentas" element={<Tools />} />
              <Route path="/ferramentas/gerador-reviews" element={<ReviewGenerator />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/perfil/networking" element={<ProfileNetworking />} />
              <Route path="/profile/security" element={<Security />} />
              <Route path="/profile/notifications" element={<ProfileNotifications />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/chamadas" element={<WeeklyCalls />} />
              {/* Legacy route redirect */}
              <Route path="/blogs" element={<Navigate to="/meus-sites" replace />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#fff',
                borderRadius: '12px',
              },
              success: {
                iconTheme: {
                  primary: '#ff6b6b',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ff6b6b',
                  secondary: '#fff',
                },
              },
            }}
          />
          
          {/* Debug Panel - only visible in development or when debug=true */}
          {/* <DebugPanel /> */}
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;