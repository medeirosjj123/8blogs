import React, { useState, useEffect } from 'react';
import VideoPlayer from '../components/video/VideoPlayer';

// Mock lesson data for demonstration
const mockLesson = {
  id: '1',
  title: 'Introdução ao SEO Moderno',
  description: 'Aprenda os fundamentos do SEO e como aplicar as melhores práticas.',
  videoProvider: 'vimeo' as const,
  videoId: '824804225', // Example Vimeo ID - replace with actual
  duration: 600, // 10 minutes
  materials: [
    { title: 'Guia de SEO', url: '#', type: 'pdf' },
    { title: 'Checklist de Otimização', url: '#', type: 'doc' }
  ]
};

const LessonPage: React.FC = () => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [lastProgress, setLastProgress] = useState(0);

  const handleLessonComplete = async () => {
    console.log('Lesson completed!');
    setIsCompleted(true);
    
    // Here you would call the API to mark lesson as complete
    // await fetch(`/api/progress/lessons/${mockLesson.id}/complete`, { method: 'POST' });
  };

  const handleProgress = async (seconds: number) => {
    // Update progress every 10 seconds
    if (Math.abs(seconds - lastProgress) >= 10) {
      console.log('Progress update:', seconds);
      setLastProgress(seconds);
      
      // Here you would call the API to update progress
      // await fetch(`/api/progress/lessons/${mockLesson.id}/update`, {
      //   method: 'POST',
      //   body: JSON.stringify({ position: seconds, duration: 10 })
      // });
    }
  };

  return (
    <div className="lesson-page">
      <div className="lesson-content">
        <VideoPlayer
          lessonId={mockLesson.id}
          videoProvider={mockLesson.videoProvider}
          videoId={mockLesson.videoId}
          title={mockLesson.title}
          onComplete={handleLessonComplete}
          onProgress={handleProgress}
          lastPosition={0}
        />
        
        <div className="lesson-info">
          <div className="lesson-description">
            <h3>Sobre esta aula</h3>
            <p>{mockLesson.description}</p>
          </div>
          
          {mockLesson.materials.length > 0 && (
            <div className="lesson-materials">
              <h3>Materiais da Aula</h3>
              <ul>
                {mockLesson.materials.map((material, index) => (
                  <li key={index}>
                    <a href={material.url} target="_blank" rel="noopener noreferrer">
                      <span className="material-icon">📄</span>
                      {material.title}
                      <span className="material-type">{material.type}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="lesson-actions">
            <button className="btn-secondary">
              ← Aula Anterior
            </button>
            <button className="btn-primary" disabled={!isCompleted}>
              Próxima Aula →
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .lesson-page {
          min-height: 100vh;
          background: #f9fafb;
        }
        
        .lesson-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        
        .lesson-info {
          margin-top: 40px;
          display: grid;
          gap: 24px;
        }
        
        .lesson-description,
        .lesson-materials {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .lesson-description h3,
        .lesson-materials h3 {
          margin: 0 0 16px 0;
          font-size: 1.25rem;
          color: #111827;
        }
        
        .lesson-description p {
          color: #6b7280;
          line-height: 1.6;
        }
        
        .lesson-materials ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .lesson-materials li {
          margin-bottom: 12px;
        }
        
        .lesson-materials a {
          display: flex;
          align-items: center;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
          text-decoration: none;
          color: #374151;
          transition: background 0.2s;
        }
        
        .lesson-materials a:hover {
          background: #e5e7eb;
        }
        
        .material-icon {
          margin-right: 12px;
          font-size: 1.25rem;
        }
        
        .material-type {
          margin-left: auto;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #9ca3af;
          background: white;
          padding: 2px 8px;
          border-radius: 4px;
        }
        
        .lesson-actions {
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }
        
        .btn-primary,
        .btn-secondary {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary {
          background: #3b82f6;
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }
        
        .btn-primary:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }
        
        .btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
        }
        
        .btn-secondary:hover {
          background: #f9fafb;
        }
      `}</style>
    </div>
  );
};

export default LessonPage;