'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoginGolden() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full h-full flex bg-[#1a1a1a] font-sans overflow-hidden rounded-xl">
      {/* Left Panel */}
      <div className="flex-1 bg-black flex flex-col items-center justify-center relative overflow-hidden">
        {/* Logo */}
        <div className="absolute top-6 left-6">
          <span className="text-white text-sm font-semibold tracking-wide">Golden Suisse<sup className="text-[8px]">®</sup></span>
        </div>

        {/* Geometric star */}
        <div className="relative w-48 h-48">
          {/* Lines radiating from center */}
          {[0, 45, 90, 135].map(angle => (
            <div
              key={angle}
              className="absolute top-1/2 left-1/2 h-px bg-white/40 origin-center"
              style={{
                width: '200px',
                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
              }}
            />
          ))}
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-6">
          <span className="text-white/30 text-[10px]">© GoldenSuisse 2022. All rights reserved.</span>
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="w-[420px] bg-[#111] flex flex-col p-12 relative">
        {/* Create account link */}
        <div className="absolute top-6 right-6">
          <button className="text-white/40 text-xs hover:text-white/60 transition-colors">
            Create an account
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-4xl font-light text-white mb-12">Login</h1>

          <div className="space-y-6">
            {/* Email */}
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Email</label>
              <input
                type="email"
                defaultValue="mark.johnson@gmail.com"
                className="w-full bg-transparent border-b border-white/20 pb-2 text-white text-sm outline-none focus:border-white/50 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  defaultValue="password123"
                  className="w-full bg-transparent border-b border-white/20 pb-2 text-white text-sm outline-none focus:border-white/50 transition-colors pr-8"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me / Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="w-4 h-4 rounded-full border border-white/30 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white/60" />
                </div>
                <span className="text-xs text-white/50">Remember me</span>
              </label>
              <button className="text-xs text-white/40 hover:text-white/60 transition-colors">
                Forgot?
              </button>
            </div>
          </div>
        </div>

        {/* Sign In button */}
        <div className="flex justify-end pb-4">
          <button className="w-16 h-16 rounded-full bg-white text-black text-xs font-bold tracking-wider hover:bg-gray-200 transition-colors flex items-center justify-center">
            SIGN IN
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginGolden;
