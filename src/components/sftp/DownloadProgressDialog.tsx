import { useEffect, useState, useRef } from 'react';
import type { DownloadProgress } from '@/services/api';

interface DownloadProgressDialogProps {
  isOpen: boolean;
  filename: string;
  fileSize: number;
  progress: DownloadProgress;
  onClose: () => void;
  onMinimize: () => void;
  onCancel?: () => void;
}

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format time
const formatTime = (seconds: number): string => {
  if (seconds < 0 || !isFinite(seconds)) return '--:--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
};

// Parse speed string to get bytes per second
const parseSpeed = (speedStr: string): number => {
  if (!speedStr || speedStr === '0 B/s') return 0;
  const match = speedStr.match(/^([\d.]+)\s*(B|KB|MB|GB)\/s$/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = { 'B': 1, 'KB': 1024, 'MB': 1024 * 1024, 'GB': 1024 * 1024 * 1024 };
  return value * (multipliers[unit] || 1);
};

// Confetti particle type
interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'square' | 'circle' | 'triangle';
}

// Confetti component for celebration effect
const ConfettiEffect: React.FC<{ active: boolean }> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe', '#00b894', '#e17055'];
    const shapes: ('square' | 'circle' | 'triangle')[] = ['square', 'circle', 'triangle'];

    // Create particles from left and right sides
    const createParticles = () => {
      particlesRef.current = [];
      
      // Left side particles
      for (let i = 0; i < 50; i++) {
        particlesRef.current.push({
          id: i,
          x: -10,
          y: Math.random() * canvas.height * 0.6 + canvas.height * 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 10 + 5,
          velocityX: Math.random() * 15 + 8,
          velocityY: Math.random() * 8 - 10,
          rotation: Math.random() * 360,
          rotationSpeed: Math.random() * 10 - 5,
          shape: shapes[Math.floor(Math.random() * shapes.length)]
        });
      }
      
      // Right side particles
      for (let i = 0; i < 50; i++) {
        particlesRef.current.push({
          id: i + 50,
          x: canvas.width + 10,
          y: Math.random() * canvas.height * 0.6 + canvas.height * 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 10 + 5,
          velocityX: -(Math.random() * 15 + 8),
          velocityY: Math.random() * 8 - 10,
          rotation: Math.random() * 360,
          rotationSpeed: Math.random() * 10 - 5,
          shape: shapes[Math.floor(Math.random() * shapes.length)]
        });
      }
    };

    createParticles();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        particle.velocityY += 0.3; // gravity
        particle.rotation += particle.rotationSpeed;

        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.rotation * Math.PI) / 180);
        ctx.fillStyle = particle.color;

        switch (particle.shape) {
          case 'square':
            ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
            break;
          case 'circle':
            ctx.beginPath();
            ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'triangle':
            ctx.beginPath();
            ctx.moveTo(0, -particle.size / 2);
            ctx.lineTo(particle.size / 2, particle.size / 2);
            ctx.lineTo(-particle.size / 2, particle.size / 2);
            ctx.closePath();
            ctx.fill();
            break;
        }

        ctx.restore();
      });

      // Continue animation if particles are still visible
      if (particlesRef.current.some(p => p.x > -50 && p.x < canvas.width + 50 && p.y < canvas.height + 50)) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[200]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

const DownloadProgressDialog = ({
  isOpen,
  filename,
  fileSize,
  progress,
  onClose,
  onMinimize,
  onCancel
}: DownloadProgressDialogProps) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [smoothSpeed, setSmoothSpeed] = useState('0 B/s');
  const [showConfetti, setShowConfetti] = useState(false);
  const [dialogWidth, setDialogWidth] = useState(420);
  const prevCompletedRef = useRef(false);
  // Track max progress to prevent rollback - progress should only increase
  const maxProgressRef = useRef(0);
  // Animation frame ref for smooth animation
  const animationRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Smart resize: adjust dialog width based on viewport size
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      
      const viewportWidth = window.innerWidth;
      
      // Calculate optimal width based on viewport
      // Minimum 320px for mobile, maximum 520px for large screens
      let calculatedWidth: number;
      
      if (viewportWidth < 480) {
        // Small mobile screens
        calculatedWidth = Math.max(320, viewportWidth - 32);
      } else if (viewportWidth < 768) {
        // Mobile and small tablets
        calculatedWidth = Math.min(440, viewportWidth - 40);
      } else {
        // Desktop and large tablets
        calculatedWidth = Math.min(520, viewportWidth * 0.4);
      }
      
      setDialogWidth(Math.round(calculatedWidth));
    };

    // Initial calculation
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Smooth progress animation - only allows progress to increase
  useEffect(() => {
    const rawProgress = progress.progress || 0;
    // Only update max progress if new value is higher
    if (rawProgress > maxProgressRef.current) {
      maxProgressRef.current = rawProgress;
    }
    
    const targetProgress = maxProgressRef.current;
    const currentProgress = displayProgress;
    
    // Skip if already at target or very close
    if (Math.abs(targetProgress - currentProgress) < 0.1) {
      setDisplayProgress(targetProgress);
      return;
    }
    
    // Only animate forward (target should always be >= current due to max tracking)
    if (targetProgress <= currentProgress) {
      return;
    }
    
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Smooth animation using requestAnimationFrame
    const startTime = performance.now();
    const startProgress = currentProgress;
    const progressDelta = targetProgress - startProgress;
    const animationDuration = 200; // 200ms smooth transition
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progressRatio = Math.min(elapsed / animationDuration, 1);
      
      // Ease-out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progressRatio, 3);
      const nextProgress = startProgress + progressDelta * easeOut;
      
      setDisplayProgress(nextProgress);
      
      if (progressRatio < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayProgress(targetProgress);
        animationRef.current = null;
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [progress.progress]);
  
  // Smooth speed display
  useEffect(() => {
    if (progress.speed) {
      setSmoothSpeed(progress.speed);
    }
  }, [progress.speed]);

  // Trigger confetti when download completes
  useEffect(() => {
    const isCompleted = progress.stage === 'completed';
    if (isCompleted && !prevCompletedRef.current) {
      setShowConfetti(true);
      // Stop confetti after 3 seconds
      setTimeout(() => setShowConfetti(false), 3000);
    }
    prevCompletedRef.current = isCompleted;
  }, [progress.stage]);
  
  if (!isOpen) return null;
  
  const speed = parseSpeed(progress.speed || smoothSpeed);
  const transferredBytes = progress.bytes_transferred || 0;
  const remainingBytes = fileSize - transferredBytes;
  const remainingTime = speed > 0 ? remainingBytes / speed : -1;
  const isCompleted = progress.stage === 'completed';
  const isError = progress.stage === 'error';
  const isDownloading = progress.stage === 'downloading';
  
  // Calculate progress bar color
  const getProgressColor = () => {
    if (isError) return 'from-status-error to-status-error';
    if (isCompleted) return 'from-status-success to-status-success';
    return 'from-primary via-primary to-accent-cyan';
  };
  
  return (
    <>
      <ConfettiEffect active={showConfetti} />
      <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
        {/* Background mask */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onMinimize} />
        
        {/* Dialog body */}
        <div
          ref={dialogRef}
          className="relative bg-gradient-to-b from-background-secondary to-background-primary rounded-2xl shadow-2xl border border-border-primary overflow-hidden transition-all duration-200 ease-out"
          style={{
            width: dialogWidth,
            maxWidth: '95vw',
            fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
          }}
        >
          {/* Title bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-secondary">
            <div className="flex items-center gap-3">
              {/* Icon animation */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isCompleted ? 'bg-status-success/20' :
                isError ? 'bg-status-error/20' :
                'bg-primary/20'
              }`}>
                {isCompleted ? (
                  <i className="fa-solid fa-check text-lg text-status-success" />
                ) : isError ? (
                  <i className="fa-solid fa-circle-exclamation text-lg text-status-error" />
                ) : (
                  <i className="fa-solid fa-cloud-arrow-down text-lg text-primary animate-pulse" />
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-100">
                  {isCompleted ? 'Download Complete' : isError ? 'Download Failed' : 'Downloading'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[280px]">{filename}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {!isCompleted && !isError && onCancel && (
                <button
                  onClick={onCancel}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Cancel download"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              )}
              <button
                onClick={onMinimize}
                className="p-2 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                title="Minimize to background"
              >
                <i className="fa-solid fa-minus text-sm" />
              </button>
              {isCompleted || isError ? (
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                  title="Close"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              ) : null}
            </div>
          </div>
          
          {/* Progress area */}
          <div className="px-5 py-6">
            {/* Large percentage display */}
            <div className="text-center mb-4">
              <span className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {Math.round(displayProgress)}%
              </span>
            </div>
            
            {/* Progress bar - Game style */}
            <div className="relative mb-5">
              {/* Background track */}
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                {/* Progress fill */}
                <div 
                  className={`h-full rounded-full bg-gradient-to-r ${getProgressColor()} transition-all duration-300 relative`}
                  style={{ width: `${displayProgress}%` }}
                >
                  {/* Light effect animation */}
                  {isDownloading && (
                    <div className="absolute inset-0 overflow-hidden rounded-full">
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                        style={{ 
                          animation: 'shimmer 1.5s infinite',
                          transform: 'skewX(-20deg)'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Light point on progress bar */}
              {isDownloading && displayProgress > 0 && (
                <div 
                  className="absolute top-0 w-3 h-3 rounded-full bg-white shadow-lg shadow-blue-400/50"
                  style={{ 
                    left: `calc(${displayProgress}% - 6px)`,
                    top: '0px',
                    animation: 'pulse 1s infinite'
                  }}
                />
              )}
            </div>
            
            {/* Details - File Size, Speed, Remaining Time */}
            <div className="grid grid-cols-3 gap-4 text-center">
              {/* File size */}
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">File Size</div>
                <div className="text-sm font-medium text-gray-200">{formatFileSize(fileSize)}</div>
              </div>
              
              {/* Download speed */}
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">Speed</div>
                <div className={`text-sm font-medium ${isDownloading ? 'text-blue-400' : 'text-gray-200'}`}>
                  {smoothSpeed}
                </div>
              </div>
              
              {/* Remaining time */}
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">Remaining</div>
                <div className="text-sm font-medium text-gray-200">
                  {isCompleted ? 'Done' : formatTime(remainingTime)}
                </div>
              </div>
            </div>
            
            {/* Transfer details */}
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>
                Downloaded: {formatFileSize(transferredBytes)}
              </span>
              <span>
                {progress.message || 'Preparing...'}
              </span>
            </div>
          </div>
          
          {/* Bottom action area */}
          {(isCompleted || isError) && (
            <div className="px-5 py-4 border-t border-white/5 bg-white/[0.02]">
              <button
                onClick={isCompleted ? onClose : onMinimize}
                className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isCompleted 
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white hover:from-emerald-400 hover:to-emerald-300'
                    : 'bg-gradient-to-r from-red-500 to-red-400 text-white hover:from-red-400 hover:to-red-300'
                }`}
              >
                {isCompleted ? 'Done' : 'Close'}
              </button>
            </div>
          )}
          
          {/* Decorative background */}
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>
      </div>
    </>
  );
};

export default DownloadProgressDialog;