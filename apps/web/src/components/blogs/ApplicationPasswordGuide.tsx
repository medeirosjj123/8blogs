import React from 'react';
import { ExternalLink, Copy, Shield, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApplicationPasswordGuideProps {
  blogUrl: string;
}

export const ApplicationPasswordGuide: React.FC<ApplicationPasswordGuideProps> = ({ blogUrl }) => {
  const adminUrl = blogUrl ? `${blogUrl.replace(/\/$/, '')}/wp-admin/profile.php#application-passwords-section` : '#';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const steps = [
    {
      number: 1,
      title: 'Acesse o painel do WordPress',
      description: 'Faça login no admin do seu blog',
      action: 'Ir para Admin',
      link: `${blogUrl?.replace(/\/$/, '') || 'https://seublog.com'}/wp-admin`
    },
    {
      number: 2,
      title: 'Vá para seu Perfil',
      description: 'No menu lateral, clique em "Usuários" → "Perfil"'
    },
    {
      number: 3,
      title: 'Role até "Senhas de Aplicação"',
      description: 'Procure pela seção no final da página'
    },
    {
      number: 4,
      title: 'Crie nova senha',
      description: 'Digite "BlogHouse" no campo nome e clique "Adicionar Nova"'
    },
    {
      number: 5,
      title: 'Copie a senha gerada',
      description: 'Aparecerá algo como "xxxx xxxx xxxx xxxx xxxx xxxx"'
    }
  ];

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-600" />
        <h4 className="font-semibold text-blue-900">Como criar uma Senha de Aplicação</h4>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
              {step.number}
            </div>
            <div className="flex-1">
              <h5 className="font-medium text-blue-900">{step.title}</h5>
              <p className="text-sm text-blue-700">{step.description}</p>
              {step.action && step.link && (
                <a
                  href={step.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-1 font-medium"
                >
                  {step.action}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick copy examples */}
      <div className="border-t border-blue-200 pt-4">
        <h5 className="font-medium text-blue-900 mb-2">Nome sugerido para a senha:</h5>
        <div className="flex items-center gap-2">
          <code className="bg-blue-100 px-2 py-1 rounded text-sm font-mono">BlogHouse</code>
          <button
            onClick={() => copyToClipboard('BlogHouse')}
            className="p-1 hover:bg-blue-200 rounded transition-colors"
            title="Copiar nome"
          >
            <Copy className="w-3 h-3 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Security note */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-green-900">Por que é mais seguro?</p>
            <ul className="text-green-700 mt-1 space-y-1">
              <li>• Não precisa da sua senha principal</li>
              <li>• Funciona mesmo com 2FA ativo</li>
              <li>• Pode ser revogada a qualquer momento</li>
              <li>• Acesso limitado apenas ao necessário</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Direct link */}
      <div className="text-center">
        <a
          href={adminUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Abrir Configurações Diretamente
        </a>
      </div>

      {/* Troubleshooting */}
      <div className="text-xs text-blue-600">
        <p className="font-medium mb-1">💡 Não encontra "Senhas de Aplicação"?</p>
        <p>Pode estar desabilitado no seu WordPress. Entre em contato conosco que te ajudamos!</p>
      </div>
    </div>
  );
};