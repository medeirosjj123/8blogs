import React, { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  Globe,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Shuffle
} from 'lucide-react';

interface WordPressCredentialsProps {
  onCredentialsComplete: (credentials: WordPressCredentials) => void;
}

export interface WordPressCredentials {
  siteTitle: string;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
}

export const WordPressCredentialsStep: React.FC<WordPressCredentialsProps> = ({
  onCredentialsComplete
}) => {
  const [siteTitle, setSiteTitle] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password strength indicator
  const getPasswordStrength = (password: string): { score: number; feedback: string } => {
    if (!password) return { score: 0, feedback: '' };
    
    let score = 0;
    let feedback = '';

    if (password.length >= 8) score += 1;
    if (password.match(/[a-z]/)) score += 1;
    if (password.match(/[A-Z]/)) score += 1;
    if (password.match(/[0-9]/)) score += 1;
    if (password.match(/[^a-zA-Z0-9]/)) score += 1;

    switch (score) {
      case 0:
      case 1:
        feedback = 'Muito fraca';
        break;
      case 2:
        feedback = 'Fraca';
        break;
      case 3:
        feedback = 'Regular';
        break;
      case 4:
        feedback = 'Boa';
        break;
      case 5:
        feedback = 'Excelente';
        break;
      default:
        feedback = '';
    }

    return { score, feedback };
  };

  // Generate secure password
  const generateSecurePassword = () => {
    const length = 16;
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = lowercase + uppercase + numbers + symbols;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill remaining characters randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    const passwordArray = password.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }
    
    const securePassword = passwordArray.join('');
    setAdminPassword(securePassword);
    setErrors({ ...errors, adminPassword: '' });
  };

  // Validation functions
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Site title validation
    if (!siteTitle.trim()) {
      newErrors.siteTitle = 'Título do site é obrigatório';
    } else if (siteTitle.trim().length < 3) {
      newErrors.siteTitle = 'Título deve ter pelo menos 3 caracteres';
    }

    // Username validation
    if (!adminUsername.trim()) {
      newErrors.adminUsername = 'Nome de usuário é obrigatório';
    } else if (adminUsername.trim().length < 4) {
      newErrors.adminUsername = 'Nome de usuário deve ter pelo menos 4 caracteres';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(adminUsername.trim())) {
      newErrors.adminUsername = 'Nome de usuário só pode conter letras, números, _ e -';
    } else if (['admin', 'administrator', 'root', 'user', 'wordpress', 'wp'].includes(adminUsername.trim().toLowerCase())) {
      newErrors.adminUsername = 'Por segurança, evite nomes de usuário comuns como "admin"';
    }

    // Email validation
    if (!adminEmail.trim()) {
      newErrors.adminEmail = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) {
      newErrors.adminEmail = 'E-mail inválido';
    }

    // Password validation
    if (!adminPassword) {
      newErrors.adminPassword = 'Senha é obrigatória';
    } else {
      const { score } = getPasswordStrength(adminPassword);
      if (score < 3) {
        newErrors.adminPassword = 'Senha muito fraca. Use pelo menos 8 caracteres com letras, números e símbolos';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    onCredentialsComplete({
      siteTitle: siteTitle.trim(),
      adminUsername: adminUsername.trim(),
      adminEmail: adminEmail.trim(),
      adminPassword
    });
  };

  const passwordStrength = getPasswordStrength(adminPassword);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Configurar WordPress
        </h2>
        <p className="text-gray-600">
          Configure as credenciais de acesso do seu WordPress
        </p>
      </div>

      <div className="space-y-6">
        {/* Site Title */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Globe className="w-4 h-4" />
            Título do Site
          </label>
          <input
            type="text"
            value={siteTitle}
            onChange={(e) => {
              setSiteTitle(e.target.value);
              setErrors({ ...errors, siteTitle: '' });
            }}
            placeholder="Meu Site WordPress"
            className={`w-full px-4 py-3 rounded-lg border-2 ${
              errors.siteTitle ? 'border-red-300' : 'border-gray-200'
            } focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors`}
          />
          {errors.siteTitle && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.siteTitle}
            </p>
          )}
        </div>

        {/* Admin Username */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4" />
            Nome de Usuário Admin
          </label>
          <input
            type="text"
            value={adminUsername}
            onChange={(e) => {
              setAdminUsername(e.target.value);
              setErrors({ ...errors, adminUsername: '' });
            }}
            placeholder="meuusuario"
            className={`w-full px-4 py-3 rounded-lg border-2 ${
              errors.adminUsername ? 'border-red-300' : 'border-gray-200'
            } focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors`}
          />
          {errors.adminUsername && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.adminUsername}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Evite usar "admin" ou nomes óbvios por segurança
          </p>
        </div>

        {/* Admin Email */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Mail className="w-4 h-4" />
            E-mail do Admin
          </label>
          <input
            type="email"
            value={adminEmail}
            onChange={(e) => {
              setAdminEmail(e.target.value);
              setErrors({ ...errors, adminEmail: '' });
            }}
            placeholder="admin@meusite.com"
            className={`w-full px-4 py-3 rounded-lg border-2 ${
              errors.adminEmail ? 'border-red-300' : 'border-gray-200'
            } focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors`}
          />
          {errors.adminEmail && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.adminEmail}
            </p>
          )}
        </div>

        {/* Admin Password */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Lock className="w-4 h-4" />
            Senha do Admin
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={adminPassword}
              onChange={(e) => {
                setAdminPassword(e.target.value);
                setErrors({ ...errors, adminPassword: '' });
              }}
              placeholder="••••••••••••••••"
              className={`w-full px-4 py-3 pr-20 rounded-lg border-2 ${
                errors.adminPassword ? 'border-red-300' : 'border-gray-200'
              } focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors`}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={generateSecurePassword}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-coral transition-colors"
                title="Gerar senha segura"
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {/* Password Strength Indicator */}
          {adminPassword && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Força da senha:</span>
                <span className={`text-xs font-medium ${
                  passwordStrength.score <= 1 ? 'text-red-600' :
                  passwordStrength.score <= 2 ? 'text-yellow-600' :
                  passwordStrength.score <= 3 ? 'text-blue-600' :
                  passwordStrength.score <= 4 ? 'text-green-600' : 'text-green-700'
                }`}>
                  {passwordStrength.feedback}
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-2 flex-1 rounded ${
                      level <= passwordStrength.score
                        ? level <= 1 ? 'bg-red-400' :
                          level <= 2 ? 'bg-yellow-400' :
                          level <= 3 ? 'bg-blue-400' :
                          level <= 4 ? 'bg-green-400' : 'bg-green-500'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
          
          {errors.adminPassword && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.adminPassword}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Use o botão <Shuffle className="w-3 h-3 inline" /> para gerar uma senha segura
          </p>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-1">
              Suas credenciais são seguras
            </p>
            <p className="text-blue-700">
              As credenciais serão usadas apenas para configurar o WordPress no seu servidor. 
              Recomendamos alterá-las após o primeiro acesso por segurança.
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      {siteTitle && adminUsername && adminEmail && adminPassword && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Resumo das Credenciais:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Site:</span>
              <span className="font-medium">{siteTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Usuário:</span>
              <span className="font-medium">{adminUsername}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">E-mail:</span>
              <span className="font-medium">{adminEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Senha:</span>
              <span className="font-medium">••••••••••••••••</span>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!siteTitle || !adminUsername || !adminEmail || !adminPassword || passwordStrength.score < 3}
        className="w-full py-3 px-4 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <CheckCircle className="w-5 h-5" />
        Continuar para Seleção de Tema
      </button>
    </div>
  );
};