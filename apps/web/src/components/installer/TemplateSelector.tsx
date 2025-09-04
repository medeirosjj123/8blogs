import React, { useState, useEffect } from 'react';
import { Check, ExternalLink, Eye, Download, Rocket, Globe, TrendingUp, BarChart, AlertCircle, Crown } from 'lucide-react';
import type { WordPressTemplate } from '../../types/installer';
import api from '../../services/api';
import { useUsage } from '../../hooks/useUsage';

interface TemplateSelectorProps {
  selectedTemplate: WordPressTemplate | null;
  onSelectTemplate: (template: WordPressTemplate) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onSelectTemplate
}) => {
  const { usage } = useUsage();
  const [activeCategory, setActiveCategory] = useState('all');
  const [templates, setTemplates] = useState<WordPressTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get('/api/sites/templates');
        
        // Transform API response to match frontend interface
        const apiTemplates = response.data.templates || [];
        const transformedTemplates: WordPressTemplate[] = apiTemplates.map((template: any) => ({
          id: template.slug || template.id,
          name: template.name,
          description: template.description || 'Template WordPress otimizado',
          category: template.category,
          demoUrl: template.demoUrl || '#',
          thumbnailUrl: template.thumbnailUrl || `https://via.placeholder.com/400x300/3b82f6/ffffff?text=${encodeURIComponent(template.name)}`,
          downloadUrl: template.downloadUrl,
          features: template.features || ['SEO Otimizado', 'Responsivo', 'Rápido'],
          seoScore: template.seoScore || 90,
          performanceScore: template.performanceScore || 90,
          difficulty: template.difficulty || 'beginner',
          requiredPlan: template.requiredPlan || 'starter',
          isPremium: template.isPremium || false
        }));
        
        setTemplates(transformedTemplates);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError('Erro ao carregar templates. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const categories = [
    { id: 'all', name: 'Todos os Templates', icon: Globe },
    { id: 'blog', name: 'Blog', icon: BarChart },
    { id: 'affiliate', name: 'Afiliados', icon: TrendingUp },
    { id: 'business', name: 'Negócios', icon: Rocket },
  ];

  // Helper function to check if user has access to template
  const hasTemplateAccess = (template: WordPressTemplate, userPlan: string) => {
    const planHierarchy = { 'starter': 1, 'pro': 2, 'black_belt': 3 };
    const requiredLevel = planHierarchy[template.requiredPlan as keyof typeof planHierarchy] || 1;
    const userLevel = planHierarchy[userPlan as keyof typeof planHierarchy] || 1;
    return userLevel >= requiredLevel;
  };

  // Create mock templates based on user plan since API might not have plan restrictions yet
  const getMockTemplates = (userPlan: string): WordPressTemplate[] => {
    const basicTemplate: WordPressTemplate = {
      id: 'basic-blog',
      name: 'Blog Básico',
      description: 'Template simples e otimizado para blogs de afiliados',
      category: 'blog',
      demoUrl: '#',
      thumbnailUrl: 'https://via.placeholder.com/400x300/3b82f6/ffffff?text=Blog+Básico',
      downloadUrl: '#',
      features: ['SEO Básico', 'Responsivo', 'Rápido'],
      seoScore: 85,
      performanceScore: 90,
      difficulty: 'beginner',
      requiredPlan: 'starter',
      isPremium: false
    };

    if (userPlan === 'black_belt') {
      // Black Belt gets 10 premium templates
      return [
        basicTemplate,
        ...Array.from({ length: 9 }, (_, i) => ({
          id: `premium-${i + 1}`,
          name: `Premium Template ${i + 1}`,
          description: `Template premium exclusivo para Black Belts com design profissional`,
          category: ['blog', 'affiliate', 'business'][i % 3],
          demoUrl: '#',
          thumbnailUrl: `https://via.placeholder.com/400x300/f59e0b/ffffff?text=Premium+${i + 1}`,
          downloadUrl: '#',
          features: ['SEO Avançado', 'Conversão Otimizada', 'Design Premium', 'Suporte Prioritário'],
          seoScore: 95 + Math.floor(Math.random() * 5),
          performanceScore: 90 + Math.floor(Math.random() * 10),
          difficulty: ['intermediate', 'advanced'][Math.floor(Math.random() * 2)] as any,
          requiredPlan: 'black_belt' as any,
          isPremium: true
        }))
      ];
    } else {
      // Starter/Pro only get the basic template
      return [basicTemplate];
    }
  };

  // Use mock templates for now (you can replace this with API templates when ready)
  const availableTemplates = usage?.plan ? getMockTemplates(usage.plan) : [getMockTemplates('starter')[0]];

  // Filter by category and user access
  const filteredTemplates = activeCategory === 'all' 
    ? availableTemplates.filter(template => hasTemplateAccess(template, usage?.plan || 'starter'))
    : availableTemplates.filter(template => 
        template.category === activeCategory && 
        hasTemplateAccess(template, usage?.plan || 'starter')
      );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'Iniciante';
      case 'intermediate':
        return 'Intermediário';
      case 'advanced':
        return 'Avançado';
      default:
        return difficulty;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gray-200 h-64 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Escolha seu Template</h2>
          <p className="text-gray-600">Selecione um template otimizado para SEO que servirá como base do seu site WordPress</p>
        </div>
        
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar templates</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Escolha seu Template</h2>
        <p className="text-gray-600">Selecione um template otimizado para SEO que servirá como base do seu site WordPress</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const IconComponent = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                activeCategory === category.id
                  ? 'bg-coral text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`relative bg-white rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg group ${
              selectedTemplate?.id === template.id 
                ? 'border-coral shadow-lg' 
                : 'border-gray-200 hover:border-coral/50'
            }`}
            onClick={() => onSelectTemplate(template)}
          >
            {/* Selection Indicator */}
            {selectedTemplate?.id === template.id && (
              <div className="absolute -top-2 -right-2 bg-coral text-white rounded-full p-1 z-10 shadow-md">
                <Check className="w-4 h-4" />
              </div>
            )}

            {/* Template Thumbnail */}
            <div className="relative aspect-video bg-gray-100 rounded-t-xl overflow-hidden">
              <img
                src={template.thumbnailUrl}
                alt={template.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300/f3f4f6/6b7280?text=' + encodeURIComponent(template.name);
                }}
              />
              
              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <a
                  href={template.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4 text-gray-700" />
                </a>
                <button className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors">
                  <Eye className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              {/* Difficulty Badge */}
              <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                {getDifficultyLabel(template.difficulty)}
              </div>

              {/* Premium Badge for Black Belt templates */}
              {template.isPremium && (
                <div className="absolute top-3 right-3 px-2 py-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-full text-xs font-medium flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Black Belt
                </div>
              )}
            </div>

            {/* Template Info */}
            <div className="p-4">
              <h3 className="font-bold text-gray-900 mb-2 text-lg">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>

              {/* Features */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {template.features.slice(0, 3).map((feature, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                  {template.features.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      +{template.features.length - 3} mais
                    </span>
                  )}
                </div>

                {/* Performance Indicators */}
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">SEO: {template.seoScore}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">Performance: {template.performanceScore}%</span>
                  </div>
                </div>
              </div>

              {/* Select Button */}
              <button
                className={`w-full mt-4 px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'bg-coral text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 group-hover:bg-coral group-hover:text-white'
                }`}
              >
                {selectedTemplate?.id === template.id ? 'Selecionado' : 'Selecionar Template'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Black Belt Upgrade Prompt for lower tier users */}
      {usage?.plan !== 'black_belt' && (
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            Quer Mais Templates Premium?
          </h3>
          <p className="text-gray-700 mb-4">
            Black Belts têm acesso a <strong>10 templates premium exclusivos</strong> com designs profissionais, 
            conversão otimizada e suporte prioritário.
          </p>
          <button
            onClick={() => window.location.href = '/pricing'}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Virar Black Belt - R$ 3.000
          </button>
        </div>
      )}

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Download className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum template encontrado</h3>
          <p className="text-gray-600">Tente selecionar uma categoria diferente ou verifique sua conexão.</p>
        </div>
      )}

      {/* Selected Template Summary */}
      {selectedTemplate && (
        <div className="bg-coral/5 border border-coral/20 rounded-xl p-4">
          <div className="flex items-start gap-4">
            <img
              src={selectedTemplate.thumbnailUrl}
              alt={selectedTemplate.name}
              className="w-16 h-12 object-cover rounded-lg flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64x48/f3f4f6/6b7280?text=' + encodeURIComponent(selectedTemplate.name);
              }}
            />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{selectedTemplate.name}</h4>
              <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>SEO: {selectedTemplate.seoScore}%</span>
                <span>Performance: {selectedTemplate.performanceScore}%</span>
                <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(selectedTemplate.difficulty)}`}>
                  {getDifficultyLabel(selectedTemplate.difficulty)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};