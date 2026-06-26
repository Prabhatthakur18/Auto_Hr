import React, { useEffect, useRef } from 'react';

interface VideoEmbedPlayerProps {
  url: string;
  initialPositionSeconds?: number | null;
  onProgress: (watchedRatio: number, currentTimeSeconds: number) => void;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    Vimeo?: any;
  }
}

let youTubeApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (youTubeApiPromise) return youTubeApiPromise;
  youTubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return youTubeApiPromise;
}

let vimeoApiPromise: Promise<void> | null = null;
function loadVimeoApi(): Promise<void> {
  if (window.Vimeo?.Player) return Promise.resolve();
  if (vimeoApiPromise) return vimeoApiPromise;
  vimeoApiPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://player.vimeo.com/api/player.js';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return vimeoApiPromise;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return match ? match[1]! : null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1]! : null;
}

const POLL_INTERVAL_MS = 2_000;

export const VideoEmbedPlayer: React.FC<VideoEmbedPlayerProps> = ({ url, initialPositionSeconds, onProgress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const youTubeId = getYouTubeId(url);
  const vimeoId = !youTubeId ? getVimeoId(url) : null;

  useEffect(() => {
    let cancelled = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let ytPlayer: any = null;
    let vimeoPlayer: any = null;

    if (youTubeId && containerRef.current) {
      loadYouTubeApi().then(() => {
        if (cancelled || !containerRef.current) return;
        ytPlayer = new window.YT.Player(containerRef.current, {
          videoId: youTubeId,
          playerVars: { playsinline: 1, start: initialPositionSeconds ? Math.floor(initialPositionSeconds) : 0 },
          events: {
            onReady: () => {
              pollInterval = setInterval(() => {
                if (!ytPlayer?.getDuration) return;
                const duration = ytPlayer.getDuration();
                const current = ytPlayer.getCurrentTime();
                if (duration > 0) onProgressRef.current(current / duration, current);
              }, POLL_INTERVAL_MS);
            },
          },
        });
      });
    } else if (vimeoId && containerRef.current) {
      loadVimeoApi().then(() => {
        if (cancelled || !containerRef.current) return;
        vimeoPlayer = new window.Vimeo.Player(containerRef.current, {
          url: `https://vimeo.com/${vimeoId}`,
        });
        if (initialPositionSeconds) {
          vimeoPlayer.setCurrentTime(initialPositionSeconds).catch(() => {});
        }
        vimeoPlayer.on('timeupdate', (data: { seconds: number; duration: number }) => {
          if (data.duration > 0) onProgressRef.current(data.seconds / data.duration, data.seconds);
        });
      });
    }

    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
      ytPlayer?.destroy?.();
      vimeoPlayer?.destroy?.();
    };
  }, [youTubeId, vimeoId]);

  if (!youTubeId && !vimeoId) {
    return <div className="w-full h-full flex items-center justify-center text-white text-sm">Unable to load video</div>;
  }

  return <div ref={containerRef} className="w-full h-full" />;
};
