'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useOnboardingStore } from '@/lib/stores/onboarding.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useOS } from '@/lib/os-context';
import { APP_MANIFEST, getManifestEntry } from '@/lib/app-manifest';
import { cn } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, Check, Clapperboard, Camera, Code, Palette,
  Megaphone, Briefcase, GraduationCap, Compass, type LucideIcon, Github,
  Sparkles, ExternalLink, Loader2, CheckCircle2, User, ArrowRight
} from 'lucide-react';
import type { UserRole } from '@/lib/stores/onboarding.store';
import { githubDeviceFlow, DeviceCodeResponse, GitHubProfile } from '@/lib/services/github-device-flow.service';
import { GoogleSSOService, GoogleUser } from '@/lib/services/google-sso.service';
import { audioSystem } from '@/lib/services/audio-engine';

const STEPS = ['welcome', 'role', 'apps'] as const;
type Step = (typeof STEPS)[number];

function getStepIndex(step: Step): number {
  return STEPS.indexOf(step);
}

export default function OnboardingWizard() {
  const { onboarding, availableRoles, setRole, toggleApp, selectApps, completeOnboarding, skipOnboarding } =
    useOnboardingStore();
  const { currentUser, setCurrentUser } = useOS();
  const setAuthUser = useAuthStore((s) => s.setCurrentUser);

  const [step, setStep] = useState<Step>('welcome');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  // Auth State in Onboarding
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubAuthorizing, setIsGithubAuthorizing] = useState(false);
  const [githubCodeData, setGithubCodeData] = useState<DeviceCodeResponse | null>(null);
  const [authenticatedProfile, setAuthenticatedProfile] = useState<{ name: string; avatarUrl: string; email?: string } | null>(null);

  const stepIndex = getStepIndex(step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const selectedRole = onboarding.selectedRole;
  const selectedApps = onboarding.selectedApps;

  const goNext = useCallback(() => {
    if (isLast) {
      completeOnboarding();
      window.dispatchEvent(new CustomEvent('os:onboarding-complete'));
      return;
    }
    setDirection('forward');
    setStep(STEPS[stepIndex + 1]!);
  }, [isLast, stepIndex, completeOnboarding]);

  const goBack = useCallback(() => {
    if (isFirst) return;
    setDirection('back');
    setStep(STEPS[stepIndex - 1]!);
  }, [isFirst, stepIndex]);

  const handleRoleSelect = useCallback(
    (roleId: UserRole) => {
      setRole(roleId);
      const role = availableRoles.find((r) => r.id === roleId);
      if (role) {
        selectApps(role.suggestedApps);
      }
    },
    [setRole, availableRoles, selectApps],
  );

  const handleSkip = useCallback(() => {
    skipOnboarding();
    window.dispatchEvent(new CustomEvent('os:onboarding-complete'));
  }, [skipOnboarding]);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      audioSystem.playClick();
      const gUser = await GoogleSSOService.signInWithGoogleOneTap();
      setIsGoogleLoading(false);
      const profile = { name: gUser.name, avatarUrl: gUser.picture, email: gUser.email };
      setAuthenticatedProfile(profile);
      if (currentUser) {
        const updated = { ...currentUser, ...profile };
        setCurrentUser(updated);
        setAuthUser(updated);
      }
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Welcome to Continua', description: `Signed in as ${gUser.email}`, type: 'success' }
      }));
    } catch (e: any) {
      setIsGoogleLoading(false);
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Google Sign-In Error', description: e.message, type: 'error' }
      }));
    }
  };

  const handleGithubDeviceFlow = async () => {
    try {
      setIsGithubAuthorizing(true);
      audioSystem.playClick();
      const codeRes = await githubDeviceFlow.requestDeviceCode();
      setGithubCodeData(codeRes);

      if (typeof window !== 'undefined') {
        window.open(codeRes.verification_uri, '_blank');
      }

      githubDeviceFlow.pollForToken(
        codeRes.device_code,
        codeRes.interval,
        (profile) => {
          setIsGithubAuthorizing(false);
          setGithubCodeData(null);
          const p = { name: profile.name || profile.login, avatarUrl: profile.avatar_url, email: profile.email };
          setAuthenticatedProfile(p);
          audioSystem.playClick();
          if (currentUser) {
            const updated = { ...currentUser, ...p };
            setCurrentUser(updated);
            setAuthUser(updated);
          }
          window.dispatchEvent(new CustomEvent('os:notify', {
            detail: { title: 'GitHub Connected', description: `Signed in as @${profile.login}`, type: 'success' }
          }));
        },
        (err) => {
          setIsGithubAuthorizing(false);
          setGithubCodeData(null);
          window.dispatchEvent(new CustomEvent('os:notify', {
            detail: { title: 'GitHub Auth Failed', description: err, type: 'error' }
          }));
        }
      );
    } catch (e: any) {
      setIsGithubAuthorizing(false);
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Auth Error', description: e.message, type: 'error' }
      }));
    }
  };

  if (onboarding.completed) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#060608] text-white select-none font-sans">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-[#10F4A0]/[0.04] blur-[140px] pointer-events-none" />

      <div className="absolute top-6 right-6">
        <button
          onClick={handleSkip}
          className="text-xs text-white/30 hover:text-white/70 transition-colors font-mono tracking-wider uppercase px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
        >
          Skip Setup
        </button>
      </div>

      {/* Progress dots */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-all duration-300',
              i === stepIndex ? 'bg-[#10F4A0] scale-125 shadow-[0_0_8px_rgba(16,244,160,0.5)]' : i < stepIndex ? 'bg-[#10F4A0]/40' : 'bg-white/10',
            )}
          />
        ))}
      </div>

      <div className="w-full max-w-2xl px-8">
        <div
          key={step}
          className={cn(
            'animate-in fade-in duration-300',
            direction === 'forward' ? 'slide-in-from-right-4' : 'slide-in-from-left-4',
          )}
        >
          {step === 'welcome' && (
            <WelcomeStep
              onGoogleClick={handleGoogleSignIn}
              onGithubClick={handleGithubDeviceFlow}
              isGoogleLoading={isGoogleLoading}
              isGithubAuthorizing={isGithubAuthorizing}
              githubCodeData={githubCodeData}
              authenticatedProfile={authenticatedProfile}
            />
          )}
          {step === 'role' && (
            <RoleStep
              roles={availableRoles}
              selectedRole={selectedRole}
              onSelect={handleRoleSelect}
            />
          )}
          {step === 'apps' && (
            <AppsStep
              selectedApps={selectedApps}
              onToggle={toggleApp}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 border-t border-white/10 pt-5">
          <button
            onClick={goBack}
            disabled={isFirst}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-colors font-medium',
              isFirst ? 'text-white/10 cursor-not-allowed' : 'text-white/50 hover:text-white hover:bg-white/[0.06]',
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={goNext}
            disabled={step === 'role' && !selectedRole}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg',
              step === 'role' && !selectedRole
                ? 'bg-white/[0.06] text-white/20 cursor-not-allowed'
                : isLast
                  ? 'bg-[#10F4A0] hover:bg-[#0BC68A] text-[#060608] shadow-[#10F4A0]/20'
                  : 'bg-white text-black hover:bg-white/90',
            )}
          >
            {isLast ? (
              <>
                <Check className="w-4 h-4" />
                Enter ContinuaOS
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface WelcomeStepProps {
  onGoogleClick: () => void;
  onGithubClick: () => void;
  isGoogleLoading: boolean;
  isGithubAuthorizing: boolean;
  githubCodeData: DeviceCodeResponse | null;
  authenticatedProfile: { name: string; avatarUrl: string; email?: string } | null;
}

function WelcomeStep({
  onGoogleClick,
  onGithubClick,
  isGoogleLoading,
  isGithubAuthorizing,
  githubCodeData,
  authenticatedProfile,
}: WelcomeStepProps) {
  return (
    <div className="text-center py-6">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10F4A0] to-[#0BC68A] flex items-center justify-center shadow-[0_0_50px_rgba(16,244,160,0.3)]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#060608" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Welcome to ContinuaOS</h1>
      <p className="text-white/50 text-sm max-w-md mx-auto leading-relaxed mb-6">
        The universal spatial web operating system. Choose an instant sign-in option below or continue as guest.
      </p>

      {authenticatedProfile ? (
        <div className="p-4 rounded-2xl bg-white/5 border border-emerald-500/40 max-w-sm mx-auto flex items-center gap-3 animate-in fade-in">
          <img src={authenticatedProfile.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-white/20" />
          <div className="text-left flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">{authenticatedProfile.name}</div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ready to initialize workspace
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-sm mx-auto space-y-3">
          {/* Google 1-Click Button */}
          <button
            onClick={onGoogleClick}
            disabled={isGoogleLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs transition-all flex items-center justify-center gap-3 shadow-md disabled:opacity-50"
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-4 h-4" />
            <span>{isGoogleLoading ? 'Connecting Google Account...' : 'Continue with Google'}</span>
          </button>

          {/* GitHub Device Flow 1-Click Button */}
          <button
            onClick={onGithubClick}
            disabled={isGithubAuthorizing}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-3 border border-white/20 shadow-md disabled:opacity-50"
          >
            <Github className="w-4 h-4" />
            <span>{isGithubAuthorizing ? 'Waiting for GitHub confirmation...' : 'Continue with GitHub (1-Click Code)'}</span>
          </button>

          {/* GitHub Active Code Prompt */}
          {githubCodeData && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/40 flex flex-col gap-2 animate-in fade-in text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Enter code on GitHub:</span>
                <span className="font-mono font-black text-sm text-cyan-400 tracking-widest bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-400/40">
                  {githubCodeData.user_code}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Authorize on device:</span>
                <a
                  href={githubCodeData.verification_uri}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 underline flex items-center gap-1 font-semibold"
                >
                  github.com/login/device <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface RoleStepProps {
  roles: { id: UserRole; label: string; description: string; icon: string }[];
  selectedRole: UserRole | null;
  onSelect: (roleId: UserRole) => void;
}

const ROLE_ICONS: Record<string, LucideIcon> = {
  clapperboard: Clapperboard,
  camera: Camera,
  code: Code,
  palette: Palette,
  megaphone: Megaphone,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  compass: Compass,
};

function RoleStep({ roles, selectedRole, onSelect }: RoleStepProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">What&apos;s your discipline?</h2>
      <p className="text-white/40 text-center mb-6 font-mono text-xs tracking-wider">We shape your context around how you work.</p>
      <div className="grid grid-cols-2 gap-3">
        {roles.map((role) => {
          const RoleIcon = ROLE_ICONS[role.icon] ?? Check;
          return (
            <button
              key={role.id}
              onClick={() => onSelect(role.id)}
              className={cn(
                'flex items-start gap-3 p-4 rounded-xl text-left transition-all border',
                selectedRole === role.id
                  ? 'bg-white/10 border-white/30 shadow-md'
                  : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/15',
              )}
            >
              <span className="mt-0.5 p-2 rounded-lg bg-white/[0.06] border border-white/10">
                <RoleIcon className="w-5 h-5 text-[#10F4A0]" />
              </span>
              <div>
                <div className="font-bold text-sm">{role.label}</div>
                <div className="text-xs text-white/40 mt-0.5">{role.description}</div>
              </div>
              {selectedRole === role.id && (
                <div className="ml-auto mt-1">
                  <Check className="w-4 h-4 text-[#10F4A0]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface AppsStepProps {
  selectedApps: string[];
  onToggle: (appId: string) => void;
}

function AppsStep({ selectedApps, onToggle }: AppsStepProps) {
  const apps = useMemo(
    () =>
      APP_MANIFEST.filter((app) => !app.isCore && app.id !== 'settings' && app.id !== 'admin').map((app) => ({
        id: app.id,
        title: app.title,
        description: app.description || '',
        icon: app.icon,
      })),
    [],
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">Select your starter toolkit</h2>
      <p className="text-white/40 text-center mb-6 font-mono text-xs tracking-wider">Choose apps to pin to your Dock on first launch.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto custom-scrollbar p-1">
        {apps.map((app) => {
          const isSelected = selectedApps.includes(app.id);
          return (
            <button
              key={app.id}
              onClick={() => onToggle(app.id)}
              className={cn(
                'flex items-center gap-2.5 p-3 rounded-xl text-left transition-all border',
                isSelected
                  ? 'bg-white/10 border-white/30 text-white'
                  : 'bg-white/[0.02] border-white/[0.05] text-white/60 hover:bg-white/[0.05] hover:text-white',
              )}
            >
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold truncate">{app.title}</span>
                <span className="text-[10px] text-white/40 truncate">{app.description}</span>
              </div>
              <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", isSelected ? "bg-[#10F4A0] border-[#10F4A0] text-black" : "border-white/20")}>
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
