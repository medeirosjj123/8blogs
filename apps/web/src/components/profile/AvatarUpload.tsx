import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { useAvatarUpload, useDeleteAvatar } from '../../hooks/useUserStats';
import { getAvatarUrl, getInitials } from '../../utils/avatar';

interface AvatarUploadProps {
  currentAvatar?: string;
  userName: string;
  onClose?: () => void;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  userName,
  onClose
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const uploadMutation = useAvatarUpload();
  const deleteMutation = useDeleteAvatar();

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Imagem muito grande. Máximo 5MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleUpload = async () => {
    if (preview && fileInputRef.current?.files?.[0]) {
      await uploadMutation.mutateAsync(fileInputRef.current.files[0]);
      setPreview(null);
      onClose?.();
    }
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja remover seu avatar?')) {
      await deleteMutation.mutateAsync();
      onClose?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Alterar Avatar</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Current/Preview Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              {preview || currentAvatar ? (
                <img
                  src={preview || getAvatarUrl(currentAvatar)}
                  alt="Avatar"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 bg-gray-300 rounded-full flex items-center justify-center text-4xl font-bold text-gray-600 border-4 border-gray-200">
                  {getInitials(userName)}
                </div>
              )}
              
              {currentAvatar && !preview && (
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="absolute -bottom-2 -right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? 'border-coral bg-coral/5' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />
            
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            
            <p className="text-gray-600 mb-2">
              Arraste uma imagem aqui ou
            </p>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-coral font-semibold hover:underline"
            >
              escolha do computador
            </button>
            
            <p className="text-xs text-gray-500 mt-4">
              JPG, PNG ou GIF. Máximo 5MB.
            </p>
          </div>

          {/* Action Buttons */}
          {preview && (
            <div className="flex gap-3">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="flex-1 px-4 py-2 bg-coral text-white rounded-xl hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Salvar Avatar
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};