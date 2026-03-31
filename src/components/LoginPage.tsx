import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { authApi } from '../services/authApi';
import {
  Box,
  Terminal,
  FolderOpen,
  TrendingUp,
  AlertCircle,
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  LogIn
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

// Background images configuration
const BACKGROUNDS = [
  '/backgrounds/wallhaven-1qdz5w.png',
  '/backgrounds/wallhaven-9o2w9k.png',
  '/backgrounds/wallhaven-powv93.jpg',
  '/backgrounds/wallhaven-vpo8k8.jpg',
];

// Get random background index, stored in sessionStorage for consistency within session
const getRandomBackgroundIndex = (): number => {
  const storedIndex = sessionStorage.getItem('login_background_index');
  if (storedIndex !== null) {
    return parseInt(storedIndex, 10);
  }
  
  const randomIndex = Math.floor(Math.random() * BACKGROUNDS.length);
  sessionStorage.setItem('login_background_index', randomIndex.toString());
  return randomIndex;
};

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);

  const backgroundIndex = useMemo(() => getRandomBackgroundIndex(), []);
  const backgroundUrl = BACKGROUNDS[backgroundIndex];

  // Preload background image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setBgLoaded(true);
    img.src = backgroundUrl;
  }, [backgroundUrl]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await authApi.login({ username: username.trim(), password });

      if (result.code === 0) {
        sessionStorage.removeItem('login_background_index');
        onLoginSuccess();
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error, please try again later');
    } finally {
      setLoading(false);
    }
  }, [username, password, onLoginSuccess]);

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel - Background Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden min-w-[400px]">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
          style={{
            backgroundImage: bgLoaded ? `url(${backgroundUrl})` : undefined,
            opacity: bgLoaded ? 1 : 0,
          }}
        />
        
        {/* Overlay - Railway style dark gradient */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom right, rgba(11, 13, 15, 0.85), rgba(20, 21, 24, 0.75), rgba(28, 30, 33, 0.65))',
          }}
        />
        
        {/* Left Content */}
        <div className="relative z-10 text-center p-10">
          {/* Brand Icon - Railway style: pure color, no gradient */}
          <div 
            className="w-20 h-20 mx-auto mb-6 rounded-xl flex items-center justify-center"
            style={{
              background: 'var(--accent-muted)',
              border: '0.5px solid var(--accent)',
            }}
          >
            <Box size={40} style={{ color: 'var(--accent)' }} />
          </div>
          
          {/* Brand Title */}
          <h1 
            className="text-3xl font-semibold mb-3 tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Cockpit
          </h1>
          
          {/* Brand Subtitle */}
          <p 
            className="text-base mb-12 font-normal"
            style={{ color: 'var(--text-secondary)' }}
          >
            Modern Server Operations Management Platform
          </p>
          
          {/* Features - Railway style cards */}
          <div className="flex flex-col gap-4 items-center">
            <div 
              className="flex items-center gap-3 px-6 py-3 rounded-lg text-sm font-medium min-w-[200px]"
              style={{
                background: 'var(--bg-overlay)',
                border: '0.5px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            >
              <Terminal size={18} style={{ color: 'var(--color-info)' }} />
              <span>SSH Terminal Management</span>
            </div>
            
            <div 
              className="flex items-center gap-3 px-6 py-3 rounded-lg text-sm font-medium min-w-[200px]"
              style={{
                background: 'var(--bg-overlay)',
                border: '0.5px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            >
              <FolderOpen size={18} style={{ color: 'var(--accent)' }} />
              <span>SFTP File Transfer</span>
            </div>
            
            <div 
              className="flex items-center gap-3 px-6 py-3 rounded-lg text-sm font-medium min-w-[200px]"
              style={{
                background: 'var(--bg-overlay)',
                border: '0.5px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            >
              <TrendingUp size={18} style={{ color: 'var(--color-success)' }} />
              <span>System Monitoring Dashboard</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Area - Railway dark style */}
      <div 
        className="w-[480px] min-w-[400px] flex flex-col items-center justify-center p-10"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="w-full max-w-[360px]">
          {/* Header */}
          <div className="mb-8">
            <h2 
              className="text-xl font-semibold mb-2 tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Welcome Back
            </h2>
            <p 
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign in to your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Error Banner - Railway style */}
            {error && (
              <div 
                className="flex items-center gap-2.5 px-4 py-3.5 rounded-lg text-sm"
                style={{
                  background: 'var(--color-error-muted)',
                  border: '0.5px solid rgba(248, 113, 113, 0.2)',
                  color: 'var(--color-error-text)',
                }}
              >
                <AlertCircle size={16} style={{ color: 'var(--color-error)' }} />
                <span>{error}</span>
              </div>
            )}

            {/* Username - Railway style */}
            <div className="flex flex-col gap-2">
              <label 
                className="text-sm font-medium text-text-secondary"
              >
                Username
              </label>
              <div className="input-with-icon">
                <User 
                  size={16} 
                  className="input-icon input-icon-accent" 
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="input py-3.5"
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password - Railway style */}
            <div className="flex flex-col gap-2">
              <label 
                className="text-sm font-medium text-text-secondary"
              >
                Password
              </label>
              <div className="input-with-icon">
                <Lock 
                  size={16} 
                  className="input-icon input-icon-accent" 
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input py-3.5"
                  style={{ paddingRight: '44px' }}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="input-action"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button - Railway style */}
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full py-3.5 px-6 text-sm font-medium text-white mt-2 btn-primary"
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;