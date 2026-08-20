'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useOnboardingStore } from '@/lib/stores/onboarding.store';
import { APP_MANIFEST } from '@/lib/app-manifest';
import { cn } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, Check, Clapperboard, Camera, Code, Palette,
  Megaphone, Briefcase, GraduationCap, Compass, type LucideIcon
} from 'lucide-react';
import type { UserRole } from '@/lib/stores/onboarding.store';

const STEPS = ['welcome', 'role', 'apps'] as const;
type Step = (typeof STEPS)[number];

function getStepIndex(step: Step): number {
  return STEPS.indexOf(step);
}

export default function OnboardingWizard() {
  const { onboarding, availableRoles, setRole, toggleApp, selectApps, completeOnboarding, skipOnboarding } =
    useOnboardingStore();

  const [step, setStep] = useState<Step>('welcome');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

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

  if (onboarding.completed) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#060608] text-white select-none font-sans">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#10F4A0]/[0.03] blur-[120px] pointer-events-none" />

      <div className="absolute top-6 right-6">
        <button
          onClick={handleSkip}
          className="text-xs text-white/30 hover:text-white/70 transition-colors font-mono tracking-wider uppercase px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
        >
          Skip
        </button>
      </div>

      {/* Progress dots */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              i === stepIndex ? 'bg-[#10F4A0] scale-125 shadow-[0_0_8px_rgba(16,244,160,0.4)]' : i < stepIndex ? 'bg-[#10F4A0]/40' : 'bg-white/10',
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
          {step === 'welcome' && <WelcomeStep />}
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
        <div className="flex items-center justify-between mt-10">
          <button
            onClick={goBack}
            disabled={isFirst}
            className={cn(
              'flex items-center gap-1 px-4 py-2 rounded-lg text-sm transition-colors font-mono',
              isFirst ? 'text-white/10 cursor-not-allowed' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]',
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={goNext}
            disabled={step === 'role' && !selectedRole}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all',
              step === 'role' && !selectedRole
                ? 'bg-white/[0.06] text-white/20 cursor-not-allowed'
                : isLast
                  ? 'bg-[#10F4A0] hover:bg-[#0BC68A] text-[#060608] font-bold shadow-lg shadow-[#10F4A0]/20'
                  : 'bg-white/[0.08] hover:bg-white/[0.12] text-white',
            )}
          >
            {isLast ? (
              <>
                <Check className="w-4 h-4" />
                Enter Continua
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function WelcomeStep() {
  return (
    <div className="text-center py-12">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10F4A0] to-[#0BC68A] flex items-center justify-center shadow-[0_0_60px_rgba(16,244,160,0.2)]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#060608" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
      </div>
      <h1 className="text-3xl font-bold mb-3">Welcome to Continua</h1>
      <p className="text-white/40 text-base max-w-md mx-auto leading-relaxed">
        The persistent context layer. Pick up exactly where you stopped — not the file, the context.
        Let&apos;s set up your workspace.
      </p>
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
      <p className="text-white/40 text-center mb-8 font-mono text-xs tracking-wider">We shape your context around how you work.</p>
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
                  ? 'bg-white/10 border-white/30'
                  : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/15',
              )}
            >
              <span className="mt-0.5 p-2 rounded-lg bg-white/[0.06] border border-white/10">
                <RoleIcon className="w-5 h-5 text-[#10F4A0]" />
              </span>
              <div>
                <div className="font-medium text-sm">{role.label}</div>
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
      <p className="text-white/40 text-center mb-8 font-mono text-xs tracking-wider">Choose apps to pin to your dock. You can always change this later.</p>
      <div className="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto custom-scrollbar p-1">
        {apps.map((app) => {
          const isSelected = selectedApps.includes(app.id);
          return (
            <button
              key={app.id}
              onClick={() => onToggle(app.id)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl text-left transition-all border',
                isSelected
                  ? 'bg-white/10 border-white/30 text-white'
                  : 'bg-white/[0.02] border-white/[0.05] text-white/60 hover:bg-white/[0.05] hover:text-white',
              )}
            >
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium truncate">{app.title}</span>
                <span className="text-xs text-white/40 truncate">{app.description}</span>
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
