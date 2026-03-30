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
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0D0F]/80 via-[#141518]/70 to-[#1C1E21]/60" />
        
        {/* Left Content */}
        <div className="relative z-10 text-center text-white p-10">
          {/* Brand Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
            <Box size={40} className="text-white" />
          </div>
          
          {/* Brand Title */}
          <h1 className="text-3xl font-semibold mb-3 tracking-tight">
            Cockpit
          </h1>
          
          {/* Brand Subtitle */}
          <p className="text-base text-white/90 mb-12 font-normal">
            Modern Server Operations Management Platform
          </p>
          
          {/* Features */}
          <div className="flex flex-col gap-4 items-center">
            <div className="flex items-center gap-3 px-6 py-3 bg-white/10 rounded-xl backdrop-blur-xl border border-white/10 text-sm font-medium min-w-[200px]">
              <Terminal size={18} className="text-[#60A5FA]" />
              <span>SSH Terminal Management</span>
            </div>
            
            <div className="flex items-center gap-3 px-6 py-3 bg-white/10 rounded-xl backdrop-blur-xl border border-white/10 text-sm font-medium min-w-[200px]">
              <FolderOpen size={18} className="text-[#A855F7]" />
              <span>SFTP File Transfer</span>
            </div>
            
            <div className="flex items-center gap-3 px-6 py-3 bg-white/10 rounded-xl backdrop-blur-xl border border-white/10 text-sm font-medium min-w-[200px]">
              <TrendingUp size={18} className="text-[#4ADE80]" />
              <span>System Monitoring Dashboard</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Area */}
      <div className="w-[480px] min-w-[400px] flex flex-col items-center justify-center p-10 bg-[#FAFAFA] relative">
        <div className="w-full max-w-[360px]">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-[#0F0F10] mb-2 tracking-tight">
              Welcome Back
            </h2>
            <p className="text-sm text-[#52525B]">
              Please login to your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-sm">
                <AlertCircle size={16} className="text-[#F87171]" />
                <span>{error}</span>
              </div>
            )}

            {/* Username */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#334155]">
                Username
              </label>
              <div className="relative flex items-center">
                <User size={16} className="absolute left-3.5 text-[#A855F7]" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full py-3.5 pl-11 pr-4 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#1E293B] outline-none transition-all duration-150 focus:border-[#A855F7] focus:shadow-[0_0_0_3px_rgba(168,85,247,0.15)]"
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#334155]">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-[#A855F7]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full py-3.5 pl-11 pr-12 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#1E293B] outline-none transition-all duration-150 focus:border-[#A855F7] focus:shadow-[0_0_0_3px_rgba(168,85,247,0.15)]"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 p-1 bg-none border-none cursor-pointer flex items-center justify-center transition-colors duration-150 hover:text-[#64748B]"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff size={16} className="text-[#94A3B8]" />
                  ) : (
                    <Eye size={16} className="text-[#94A3B8]" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button - Railway style: solid color, no gradient */}
            <button
              type="submit"
              className={`flex items-center justify-center gap-2 w-full py-3.5 px-6 text-sm font-medium text-white bg-[#A855F7] border-none rounded-lg cursor-pointer transition-all duration-150 mt-2 ${
                loading 
                  ? 'opacity-70 cursor-not-allowed' 
                  : 'hover:bg-[#9333EA] hover:-translate-y-0.5 active:translate-y-0'
              }`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Login
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