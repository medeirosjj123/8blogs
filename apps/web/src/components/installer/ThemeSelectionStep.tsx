import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Palette,
  Star,
  Download,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';

interface ThemeSelectionProps {
  onThemeSelected: (theme: WordPressTheme) => void;
  siteCategory?: string;
}

interface WordPressTheme {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: 'blog' | 'business' | 'ecommerce' | 'portfolio' | 'agency' | 'magazine' | 'landing';
  version: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  demoUrl?: string;
  author: string;
  rating?: number;
  downloadCount?: number;
  isDefault: boolean;
  isPremium: boolean;
  features: string[];
  tags: string[];
}

export const ThemeSelectionStep: React.FC<ThemeSelectionProps> = ({
  onThemeSelected,
  siteCategory
}) => {
  const [themes, setThemes] = useState<WordPressTheme[]>([]);
  const [themesByCategory, setThemesByCategory] = useState<Record<string, WordPressTheme[]>>({});
  const [selectedTheme, setSelectedTheme] = useState<WordPressTheme | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const categories = [
    { key: 'all', label: 'Todos os Temas', icon: '🎨' },
    { key: 'blog', label: 'Blog', icon: '📝' },
    { key: 'business', label: 'Negócios', icon: '🏢' },
    { key: 'ecommerce', label: 'E-commerce', icon: '🛒' },
    { key: 'portfolio', label: 'Portfolio', icon: '🎭' },
    { key: 'agency', label: 'Agência', icon: '🚀' },
    { key: 'magazine', label: 'Magazine', icon: '📰' },
    { key: 'landing', label: 'Landing Page', icon: '🎯' }
  ];

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/wordpress-themes/active');
      
      if (response.data.success) {
        setThemes(response.data.data.themes);
        setThemesByCategory(response.data.data.themesByCategory);

        // Auto-select default theme for the detected category
        if (siteCategory && response.data.data.themesByCategory[siteCategory]) {
          const categoryThemes = response.data.data.themesByCategory[siteCategory];
          const defaultTheme = categoryThemes.find(theme => theme.isDefault);
          if (defaultTheme) {
            setSelectedTheme(defaultTheme);
            setActiveCategory(siteCategory);
          }
        }
      } else {
        setError('Erro ao carregar temas');
      }
    } catch (err) {
      console.error('Error fetching themes:', err);
      setError('Erro ao carregar temas');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeSelect = (theme: WordPressTheme) => {
    setSelectedTheme(theme);
  };

  const handleConfirmSelection = () => {
    if (selectedTheme) {
      onThemeSelected(selectedTheme);
    }
  };

  const getFilteredThemes = () => {
    if (activeCategory === 'all') {
      return themes;
    }
    return themesByCategory[activeCategory] || [];
  };

  const getThemeImage = (theme: WordPressTheme) => {
    if (theme.thumbnailUrl && !theme.thumbnailUrl.includes('i0.wp.com')) {
      return theme.thumbnailUrl;
    }
    // Use a reliable placeholder instead of broken WordPress.org URLs
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#grad1)"/>
        <rect x="20" y="40" width="360" height="8" fill="#d1d5db" rx="4"/>
        <rect x="20" y="60" width="280" height="6" fill="#e5e7eb" rx="3"/>
        <rect x="20" y="80" width="320" height="6" fill="#e5e7eb" rx="3"/>
        <circle cx="60" cy="120" r="25" fill="#d1d5db"/>
        <rect x="100" y="105" width="200" height="8" fill="#d1d5db" rx="4"/>
        <rect x="100" y="120" width="150" height="6" fill="#e5e7eb" rx="3"/>
        <text x="200" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280" font-weight="500">
          ${theme.name}
        </text>
        <text x="200" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af">
          WordPress Theme
        </text>
      </svg>
    `)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral mx-auto mb-4" />
          <p className="text-gray-600">Carregando temas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">Erro ao Carregar Temas</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchThemes}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const filteredThemes = getFilteredThemes();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Escolha um Tema
        </h2>
        <p className="text-gray-600">
          Selecione o design perfeito para o seu WordPress
        </p>
      </div>

      {/* Category Filter */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category.key}
              onClick={() => setActiveCategory(category.key)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeCategory === category.key
                  ? 'border-coral text-coral'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{category.icon}</span>
              {category.label}
              {category.key !== 'all' && themesByCategory[category.key] && (
                <span className="bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-xs">
                  {themesByCategory[category.key].length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Themes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredThemes.map((theme) => (
          <div
            key={theme._id}
            className={`group relative bg-white rounded-lg border-2 overflow-hidden transition-all cursor-pointer hover:shadow-lg ${
              selectedTheme?._id === theme._id
                ? 'border-coral ring-2 ring-coral/20'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleThemeSelect(theme)}
          >
            {/* Theme Screenshot */}
            <div className="relative aspect-video bg-gray-100 overflow-hidden">
              <img
                src={getThemeImage(theme)}
                alt={theme.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  // Prevent infinite loops by checking if already set to fallback
                  if (!img.src.includes('data:image/svg+xml')) {
                    img.src = `data:image/svg+xml;base64,${btoa(`
                      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                        <rect width="400" height="300" fill="#f3f4f6"/>
                        <text x="200" y="150" text-anchor="middle" dominant-baseline="middle" 
                              font-family="Arial, sans-serif" font-size="18" fill="#9ca3af">
                          ${theme.name}
                        </text>
                      </svg>
                    `)}`;
                  }
                }}
              />
              
              {/* Default Badge */}
              {theme.isDefault && (
                <div className="absolute top-2 left-2 bg-coral text-white text-xs px-2 py-1 rounded-full font-medium">
                  Recomendado
                </div>
              )}

              {/* Premium Badge */}
              {theme.isPremium && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Premium
                </div>
              )}

              {/* Selected Indicator */}
              {selectedTheme?._id === theme._id && (
                <div className="absolute inset-0 bg-coral/20 flex items-center justify-center">
                  <div className="bg-coral text-white rounded-full p-2">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>
              )}

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {theme.demoUrl && (
                  <a
                    href={theme.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white text-gray-900 px-3 py-1 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Demo
                  </a>
                )}
              </div>
            </div>

            {/* Theme Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 group-hover:text-coral transition-colors">
                  {theme.name}
                </h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  v{theme.version}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {theme.description}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>por {theme.author}</span>
                <div className="flex items-center gap-3">
                  {theme.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{theme.rating}</span>
                    </div>
                  )}
                  {theme.downloadCount && (
                    <div className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      <span>{theme.downloadCount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Features */}
              {theme.features.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {theme.features.slice(0, 3).map((feature, index) => (
                    <span
                      key={index}
                      className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                    >
                      {feature}
                    </span>
                  ))}
                  {theme.features.length > 3 && (
                    <span className="inline-block text-gray-500 text-xs px-2 py-1">
                      +{theme.features.length - 3} mais
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredThemes.length === 0 && (
        <div className="text-center py-12">
          <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum tema encontrado
          </h3>
          <p className="text-gray-500">
            Não há temas disponíveis nesta categoria.
          </p>
        </div>
      )}

      {/* Selected Theme Details */}
      {selectedTheme && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-12 bg-white rounded overflow-hidden flex-shrink-0">
              <img
                src={getThemeImage(selectedTheme)}
                alt={selectedTheme.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">
                Tema Selecionado: {selectedTheme.name}
              </h4>
              <p className="text-blue-700 text-sm mb-2">
                {selectedTheme.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-blue-600">
                <span>Categoria: {selectedTheme.category}</span>
                <span>Autor: {selectedTheme.author}</span>
                <span>Versão: {selectedTheme.version}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">Sobre os Temas</p>
            <p>
              Você pode alterar o tema a qualquer momento após a instalação. 
              Todos os temas são responsivos e compatíveis com as últimas versões do WordPress.
            </p>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={handleConfirmSelection}
        disabled={!selectedTheme}
        className="w-full py-3 px-4 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Palette className="w-5 h-5" />
        {selectedTheme ? 
          `Continuar com ${selectedTheme.name}` : 
          'Selecione um tema para continuar'
        }
      </button>
    </div>
  );
};