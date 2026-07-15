'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SignupDark() {
  const [showPassword, setShowPassword] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  return (
    <div className="w-full h-full flex bg-[#0a0a0a] font-sans overflow-hidden rounded-xl">
      {/* Left Panel - Welcome */}
      <div className="flex-1 bg-gradient-to-br from-[#0a2a1a] via-[#0d3320] to-[#0a1f15] flex flex-col justify-end p-12 relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        <div className="relative z-10 mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Get Started<br />with Us
          </h1>
          <p className="text-white/50 text-sm max-w-xs">
            Complete these easy steps to register your account.
          </p>
        </div>

        {/* Steps */}
        <div className="relative z-10 flex gap-3">
          {[
            { num: 1, label: 'Sign up your\naccount' },
            { num: 2, label: 'Set up your\nworkspace' },
            { num: 3, label: 'Set up your\nprofile' },
          ].map(step => (
            <div
              key={step.num}
              className={cn(
                "flex-1 rounded-xl p-4 transition-colors cursor-pointer",
                activeStep === step.num
                  ? "bg-white/10 border border-white/20"
                  : "bg-white/5 border border-white/10"
              )}
              onClick={() => setActiveStep(step.num)}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-3",
                activeStep === step.num
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/60"
              )}>
                {step.num}
              </div>
              <div className="text-white/70 text-xs whitespace-pre-line leading-relaxed">
                {step.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-[420px] bg-[#111] flex flex-col p-12">
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-white mb-2">Sign Up Account</h2>
          <p className="text-white/40 text-sm mb-8">Enter your personal data to create your account.</p>

          {/* Social buttons */}
          <div className="flex gap-3 mb-6">
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-white text-sm font-medium hover:bg-white/5 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-white text-sm font-medium hover:bg-white/5 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Github
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">Or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-white/40 mb-1.5 block">First Name</label>
                <input
                  type="text"
                  placeholder="eg. John"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-white/40 mb-1.5 block">Last Name</label>
                <input
                  type="text"
                  placeholder="eg. Francisco"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="eg. johnfranc@gmail.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
              />
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-colors placeholder:text-white/20 pr-10"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-white/30 mt-1.5">Must be at least 8 characters.</p>
            </div>

            <button className="w-full py-3 bg-white text-black text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors mt-2">
              Sign Up
            </button>

            <p className="text-center text-xs text-white/40">
              Already have an account? <button className="text-white font-medium hover:underline">Log in</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupDark;
