import React, { useEffect, useRef, useState } from 'react';
import Player from '@vimeo/player';

interface VimeoPlayerProps {
  videoId: string;
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  onProgress?: (data: { seconds: number; percent: number; duration: number }) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onReady?: () => void;
  className?: string;
  width?: string | number;
  height?: string | number;
}

const VimeoPlayer: React.FC<VimeoPlayerProps> = ({
  videoId,
  autoplay = false,
  controls = true,
  loop = false,
  muted = false,
  onProgress,
  onPlay,
  onPause,
  onEnded,
  onReady,
  className = '',
  width = '100%',
  height = 'auto'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !videoId) return;

    // Initialize Vimeo player
    const player = new Player(containerRef.current, {
      id: parseInt(videoId),
      autoplay,
      controls,
      loop,
      muted,
      responsive: true,
      dnt: true, // Do not track
      quality: 'auto'
    });

    playerRef.current = player;

    // Set up event handlers
    player.on('loaded', () => {
      setIsLoading(false);
      setError(null);
      onReady?.();
    });

    player.on('play', () => {
      onPlay?.();
    });

    player.on('pause', () => {
      onPause?.();
    });

    player.on('ended', () => {
      onEnded?.();
    });

    player.on('timeupdate', (data) => {
      onProgress?.({
        seconds: data.seconds,
        percent: data.percent,
        duration: data.duration
      });
    });

    player.on('error', (err) => {
      setIsLoading(false);
      setError(err.message || 'Failed to load video');
      console.error('Vimeo player error:', err);
    });

    // Cleanup
    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, [videoId, autoplay, controls, loop, muted]);

  // Public methods exposed via ref
  const play = () => playerRef.current?.play();
  const pause = () => playerRef.current?.pause();
  const seekTo = (seconds: number) => playerRef.current?.setCurrentTime(seconds);
  const setVolume = (volume: number) => playerRef.current?.setVolume(volume);

  return (
    <div className={`vimeo-player-wrapper ${className}`} style={{ width, height }}>
      {isLoading && (
        <div className="player-loading">
          <div className="spinner">Loading video...</div>
        </div>
      )}
      
      {error && (
        <div className="player-error">
          <p>Error loading video: {error}</p>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className="vimeo-player-container"
        style={{ display: error ? 'none' : 'block' }}
      />
      
      <style jsx>{`
        .vimeo-player-wrapper {
          position: relative;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .vimeo-player-container {
          width: 100%;
          height: 100%;
        }
        
        .player-loading,
        .player-error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          text-align: center;
        }
        
        .spinner {
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .player-error {
          background: rgba(255, 0, 0, 0.1);
          padding: 20px;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
};

export default VimeoPlayer;