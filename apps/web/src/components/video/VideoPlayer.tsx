import React, { useState, useCallback } from 'react';
import VimeoPlayer from './VimeoPlayer';

interface VideoPlayerProps {
  lessonId: string;
  videoProvider: 'vimeo' | 'youtube' | 'custom';
  videoId?: string;
  videoUrl?: string;
  title: string;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  lastPosition?: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  lessonId,
  videoProvider,
  videoId,
  videoUrl,
  title,
  onComplete,
  onProgress,
  lastPosition = 0
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(lastPosition);
  const [duration, setDuration] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);

  const handleProgress = useCallback((data: { seconds: number; percent: number; duration: number }) => {
    setCurrentTime(data.seconds);
    setDuration(data.duration);
    
    // Report progress to parent
    onProgress?.(data.seconds);
    
    // Check if video is 90% complete
    if (data.percent >= 0.9 && !hasCompleted) {
      setHasCompleted(true);
      onComplete?.();
    }
  }, [hasCompleted, onComplete, onProgress]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    if (!hasCompleted) {
      setHasCompleted(true);
      onComplete?.();
    }
  }, [hasCompleted, onComplete]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="video-player">
      <div className="video-header">
        <h2>{title}</h2>
        {hasCompleted && (
          <span className="completed-badge">✓ Completed</span>
        )}
      </div>
      
      <div className="video-container">
        {videoProvider === 'vimeo' && videoId && (
          <VimeoPlayer
            videoId={videoId}
            onProgress={handleProgress}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
            className="video-embed"
          />
        )}
        
        {videoProvider === 'youtube' && videoId && (
          <div className="video-embed">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
              title={title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        )}
        
        {videoProvider === 'custom' && videoUrl && (
          <video
            src={videoUrl}
            controls
            className="video-embed"
            style={{ width: '100%', height: 'auto' }}
            onTimeUpdate={(e) => {
              const video = e.currentTarget;
              handleProgress({
                seconds: video.currentTime,
                percent: video.currentTime / video.duration,
                duration: video.duration
              });
            }}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
          />
        )}
      </div>
      
      <div className="video-controls">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="time-display">
          <span>{formatTime(currentTime)}</span>
          <span> / </span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <style jsx>{`
        .video-player {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .video-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .video-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #333;
        }
        
        .completed-badge {
          background: #10b981;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .video-container {
          background: #000;
          border-radius: 12px;
          overflow: hidden;
          aspect-ratio: 16 / 9;
        }
        
        .video-embed {
          width: 100%;
          height: 100%;
        }
        
        .video-controls {
          margin-top: 16px;
        }
        
        .progress-bar {
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        
        .progress-fill {
          height: 100%;
          background: #3b82f6;
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        
        .time-display {
          text-align: right;
          font-size: 0.875rem;
          color: #6b7280;
          font-family: monospace;
        }
      `}</style>
    </div>
  );
};

export default VideoPlayer;