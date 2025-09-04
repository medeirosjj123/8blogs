import React, { useState } from 'react';
import { Plus, BarChart3, Globe, TrendingUp, Users, Clock, AlertCircle, CheckCircle, Settings, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { BlogCard } from '../components/blogs/BlogCard';
import { SimpleWordPressInstaller } from '../components/installer/SimpleWordPressInstaller';
import { AddExistingBlogModal } from '../components/blogs/AddExistingBlogModal';

interface Blog {
  _id: string;
  name: string;
  url: string;
  domain: string;
  status: 'active' | 'maintenance' | 'error';
  healthStatus: 'good' | 'warning' | 'error';
  googleAnalyticsId?: string;
  metrics?: {
    realtimeUsers: number;
    todayViews: number;
    weekViews: number;
    topPost?: string;
  };
  wordpress?: {
    version: string;
    pluginsNeedUpdate: number;
    lastBackup?: string;
    sslActive: boolean;
  };
  createdAt: string;
}

export const BlogsDashboard: React.FC = () => {
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddExistingModal, setShowAddExistingModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user's blogs
  const { data: blogs = [], isLoading, refetch } = useQuery({
    queryKey: ['blogs'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/sites');
        return response.data.sites || [];
      } catch (error) {
        console.error('Error fetching blogs:', error);
        return [];
      }
    }
  });

  // Handle Analytics Integration
  const handleUpdateAnalytics = async (blogId: string, analyticsId: string) => {
    try {
      await api.put(`/api/sites/${blogId}`, {
        googleAnalyticsId: analyticsId
      });
      
      // Refresh the blogs data
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      toast.success('🎉 Google Analytics conectado com sucesso!');
    } catch (error) {
      console.error('Error updating analytics:', error);
      throw error;
    }
  };

  // Handle Quick Actions
  const handleQuickAction = async (blogId: string, action: 'delete' | 'refresh' | 'maintenance') => {
    try {
      let endpoint = '';
      switch (action) {
        case 'delete':
          await api.delete(`/api/sites/${blogId}`);
          break;
        case 'refresh':
          endpoint = `/api/sites/${blogId}/refresh-status`;
          await api.post(endpoint);
          break;
        case 'maintenance':
          endpoint = `/api/sites/${blogId}/toggle-status`;
          await api.post(endpoint);
          break;
      }
      
      // Refresh the blogs data
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
      throw error;
    }
  };


  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* UPDATED - Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Blogs</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {blogs.length > 0 
              ? `${blogs.length} blog${blogs.length > 1 ? 's' : ''} conectado${blogs.length > 1 ? 's' : ''}`
              : 'Conecte seu primeiro blog'
            }
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddExistingModal(true)}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
            Conectar Blog
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-coral hover:bg-coral-dark text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar Novo
          </button>
        </div>
      </div>

      {/* Simple Stats (only if has blogs) */}
      {blogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-3 divide-x divide-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{blogs.length}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {blogs.filter(blog => blog.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Ativos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {blogs.filter(blog => blog.googleAnalyticsId).length}
              </div>
              <div className="text-sm text-gray-600">Com Analytics</div>
            </div>
          </div>
        </div>
      )}

      {/* Blogs Grid */}
      {blogs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-coral/10 to-coral/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Globe className="w-8 h-8 text-coral" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Nenhum blog conectado ainda
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Conecte um blog WordPress existente ou crie um novo em poucos minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-coral hover:bg-coral-dark text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Criar Novo Blog
            </button>
            <button
              onClick={() => setShowAddExistingModal(true)}
              className="inline-flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              <LinkIcon className="w-4 h-4" />
              Conectar Blog Existente
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {blogs.map((blog: Blog) => (
            <BlogCard
              key={blog._id}
              blog={blog}
              onUpdateAnalytics={handleUpdateAnalytics}
              onQuickAction={handleQuickAction}
            />
          ))}
        </div>
      )}

      {/* Blog Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
            <SimpleWordPressInstaller 
              onClose={() => {
                setShowCreateModal(false);
                // Refresh blogs list when modal closes (in case a new blog was created)
                queryClient.invalidateQueries({ queryKey: ['blogs'] });
              }} 
            />
          </div>
        </div>
      )}

      {/* Add Existing Blog Modal */}
      <AddExistingBlogModal
        isOpen={showAddExistingModal}
        onClose={() => setShowAddExistingModal(false)}
        onSuccess={() => {
          // Refresh blogs list when a blog is successfully added
          queryClient.invalidateQueries({ queryKey: ['blogs'] });
        }}
      />
    </div>
  );
};