'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useOnboardingStore } from '@/lib/stores/onboarding.store';
import { APP_MANIFEST, getManifestEntry } from '@/lib/app-manifest';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';
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

  const roleOption = useMemo(
    () => availableRoles.find((r) => r.id === selectedRole),
    [availableRoles, selectedRole],
  );

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0a] text-white">
      <div className="absolute top-6 right-6">
        <button
          onClick={handleSkip}
          className="text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          Skip for now
        </button>
      </div>

      {/* Progress dots */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-all duration-300',
              i === stepIndex ? 'bg-white scale-110' : i < stepIndex ? 'bg-white/60' : 'bg-white/20',
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
              'flex items-center gap-1 px-4 py-2 rounded-lg text-sm transition-colors',
              isFirst ? 'text-white/20 cursor-not-allowed' : 'text-white/60 hover:text-white hover:bg-white/5',
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
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : isLast
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white',
            )}
          >
            {isLast ? (
              <>
                <Check className="w-4 h-4" />
                Finish
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
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
      </div>
      <h1 className="text-3xl font-bold mb-3">Welcome to ContinuaOS</h1>
      <p className="text-white/50 text-lg max-w-md mx-auto">
        A creative operating system built for filmmakers, developers, and creators.
        Let&apos;s set up your workspace in a few steps.
      </p>
    </div>
  );
}

interface RoleStepProps {
  roles: { id: UserRole; label: string; description: string; icon: string }[];
  selectedRole: UserRole | null;
  onSelect: (roleId: UserRole) => void;
}

function RoleStep({ roles, selectedRole, onSelect }: RoleStepProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">What&apos;s your role?</h2>
      <p className="text-white/40 text-center mb-8">We&apos;ll customize your apps based on your workflow.</p>
      <div className="grid grid-cols-2 gap-3">
        {roles.map((role) => (
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
            <span className="text-2xl mt-0.5">{role.icon}</span>
            <div>
              <div className="font-medium text-sm">{role.label}</div>
              <div className="text-xs text-white/40 mt-0.5">{role.description}</div>
            </div>
            {selectedRole === role.id && (
              <div className="ml-auto mt-1">
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
            )}
          </button>
        ))}
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
        description: app.description ?? '',
        icon: app.icon,
        selected: selectedApps.includes(app.id),
      })),
    [selectedApps],
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">Select your apps</h2>
      <p className="text-white/40 text-center mb-6">Choose the tools you need. You can always add more later.</p>
      <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <button
              key={app.id}
              onClick={() => onToggle(app.id)}
              className={cn(
                'flex items-center gap-2.5 p-3 rounded-xl text-left transition-all border',
                app.selected
                  ? 'bg-white/10 border-white/30'
                  : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]',
              )}
            >
              <Icon className="w-5 h-5 text-white/70 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{app.title}</div>
                <div className="text-[10px] text-white/30 truncate">{app.description}</div>
              </div>
              {app.selected && (
                <div className="ml-auto shrink-0">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-center text-white/30 text-xs mt-3">
        {selectedApps.length} app{selectedApps.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  );
}
