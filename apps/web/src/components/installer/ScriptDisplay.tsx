import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  CheckCircle,
  AlertCircle,
  Shield,
  Loader2,
  Download,
  Eye,
  Clock,
  Server
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ScriptDisplayProps {
  script: string;
  domain: string;
  templateName: string;
  estimatedTime?: number;
  onComplete: () => void;
  onBack: () => void;
}

export const ScriptDisplay: React.FC<ScriptDisplayProps> = ({
  script,
  domain,
  templateName,
  estimatedTime = 10,
  onComplete,
  onBack
}) => {
  const [copied, setCopied] = useState(false);
  const [showFullScript, setShowFullScript] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      toast.success('Script copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error('Erro ao copiar script. Use Ctrl+C para copiar manualmente.');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `install-${domain.replace(/\./g, '-')}.sh`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Script baixado com sucesso!');
  };

  const scriptPreview = script.split('\n').slice(0, 10).join('\n');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Script de Instalação Gerado</h2>
        <p className="text-gray-600">
          Copie o script abaixo e execute no seu VPS Ubuntu 22.04 como root
        </p>
      </div>

      {/* Installation Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Server className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Domínio</p>
              <p className="text-sm text-blue-700">{domain}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">Tempo Estimado</p>
              <p className="text-sm text-green-700">~{estimatedTime} minutos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Script Display */}
      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">
              install-{domain}.sh
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFullScript(!showFullScript)}
              className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              {showFullScript ? 'Ocultar' : 'Ver Completo'}
            </button>
            
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar
            </button>
            
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                copied 
                  ? 'bg-green-600 text-white' 
                  : 'bg-coral hover:bg-coral-dark text-white'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="p-4 overflow-x-auto">
          <pre className="text-green-400 text-sm font-mono whitespace-pre">
            <code>{showFullScript ? script : scriptPreview}</code>
          </pre>
          {!showFullScript && script.split('\n').length > 10 && (
            <div className="mt-2 text-gray-500 text-xs">
              ... ({script.split('\n').length - 10} linhas ocultas)
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Instruções de Instalação
        </h3>
        
        <ol className="space-y-3 text-sm text-amber-800">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-amber-200 text-amber-900 rounded-full flex items-center justify-center text-xs font-bold">
              1
            </span>
            <div>
              <p className="font-medium">Conecte ao seu VPS</p>
              <code className="text-xs bg-amber-100 px-2 py-1 rounded mt-1 inline-block">
                ssh root@seu-vps-ip
              </code>
            </div>
          </li>
          
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-amber-200 text-amber-900 rounded-full flex items-center justify-center text-xs font-bold">
              2
            </span>
            <div>
              <p className="font-medium">Cole e execute o script</p>
              <p className="text-xs text-amber-700 mt-1">
                Use Ctrl+Shift+V para colar no terminal
              </p>
            </div>
          </li>
          
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-amber-200 text-amber-900 rounded-full flex items-center justify-center text-xs font-bold">
              3
            </span>
            <div>
              <p className="font-medium">Aguarde a conclusão</p>
              <p className="text-xs text-amber-700 mt-1">
                O script irá instalar e configurar tudo automaticamente
              </p>
            </div>
          </li>
          
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-amber-200 text-amber-900 rounded-full flex items-center justify-center text-xs font-bold">
              4
            </span>
            <div>
              <p className="font-medium">Acesse seu site</p>
              <p className="text-xs text-amber-700 mt-1">
                Após conclusão, acesse: <span className="font-mono">https://{domain}</span>
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* Security Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-gray-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-gray-900 mb-1">
              Script Seguro e Auto-Destrutivo
            </p>
            <p className="text-gray-600">
              Este script contém credenciais temporárias e será automaticamente removido após a execução para garantir a segurança do seu servidor.
            </p>
          </div>
        </div>
      </div>

      {/* What will be installed */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">O que será instalado:</h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>WordPress otimizado com template {templateName}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Certificado SSL Let's Encrypt</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Nginx com cache otimizado</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>PHP 8.1 com OPCache</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>MySQL 8.0 otimizado</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Redis para cache de objetos</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Firewall UFW configurado</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Backup automático diário</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Voltar
        </button>
        
        <button
          onClick={onComplete}
          className="px-6 py-3 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors"
        >
          Concluir
        </button>
      </div>
    </div>
  );
};