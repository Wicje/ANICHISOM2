import React, { useState, useEffect } from 'react';
import { useOS, OSRole } from '@/lib/os-context';
import { Power, Globe, Key, UserCircle, ChevronLeft, AlertCircle, Loader2 } from 'lucide-react';
import { googleSignIn, db, doc, setDoc, getDoc } from '@/lib/firebase';

const PROFILES: { id: OSRole, name: string, icon: string, color: string }[] = [
  { id: 'admin', name: 'Admin', icon: '⚡️', color: 'bg-emerald-500/20 text-emerald-400' },
  { id: 'filmmaker', name: 'Filmmaker', icon: '🎬', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'technician', name: 'Technician', icon: '⚙️', color: 'bg-rose-500/20 text-rose-400' },
];

export function LoginScreen() {
  const { setCurrentUser } = useOS();
  const [step, setStep] = useState<'profiles' | 'login'>('profiles');
  const [selectedProfile, setSelectedProfile] = useState<typeof PROFILES[0] | null>(null);
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleProfileSelect = (id: OSRole) => {
    setSelectedProfile(PROFILES.find(p => p.id === id) || null);
    setStep('login');
  };

  const handleBack = () => {
    setStep('profiles');
    setError('');
  };

  const handleGoogleLogin = async () => {
    if (!selectedProfile) return;
    setIsLoading(true);
    setError('');
    
    try {
      const result = await googleSignIn();
      if (result) {
         const { user } = result;
         const userRef = doc(db, 'users', user.uid);
         const userDoc = await getDoc(userRef);
         
         const role = user.email?.toLowerCase() === 'anichisom4top@gmail.com' ? 'admin' : selectedProfile.id;
         const finalStatus = role === 'admin' ? 'approved' : 'pending';

         if (!userDoc.exists()) {
            await setDoc(userRef, {
               email: user.email,
               name: user.displayName || user.email?.split('@')[0],
               role: role,
               status: finalStatus,
               createdAt: Date.now(),
               avatarUrl: user.photoURL || ''
            });
            if (finalStatus === 'pending') {
               setError('Account created. Please wait for an admin to approve your account.');
               setIsLoading(false);
               return;
            }
         } else {
            const data = userDoc.data();
            if (data?.status !== 'approved' && data?.role !== 'admin') {
               setError('Account pending approval from administrator.');
               setIsLoading(false);
               return;
            }
         }
         
         setCurrentUser({
           id: user.uid,
           name: user.displayName || user.email?.split('@')[0] || 'User',
           role: role as OSRole,
           avatarUrl: user.photoURL || undefined
         } as any);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login with Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 blur-sm"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop")' }} 
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/20 via-black/80 to-black" />
      
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {step === 'profiles' ? (
          <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-300">
             <div className="text-white/80 font-medium text-xl mb-4">Select Workspace Role</div>
             <div className="flex items-center justify-center gap-8">
               {PROFILES.map(profile => (
                 <div 
                   key={profile.id} 
                   onClick={() => handleProfileSelect(profile.id)}
                   className="flex flex-col items-center gap-3 cursor-pointer group"
                 >
                   <div className={`w-20 h-20 rounded-full flex items-center justify-center border border-white/10 shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:border-white/30 backdrop-blur-md ${profile.color}`}>
                     <span className="text-3xl font-light">{profile.icon}</span>
                   </div>
                   <div className="text-white/70 font-medium text-sm group-hover:text-white transition-colors">
                     {profile.name}
                   </div>
                 </div>
               ))}
             </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-6 p-8 rounded-2xl bg-black/40 border border-white/10 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button 
              onClick={handleBack}
              className="absolute top-4 left-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center mt-2">
               <div className={`w-16 h-16 rounded-full flex items-center justify-center border border-white/20 shadow-2xl mb-4 ${selectedProfile?.color}`}>
                  <span className="text-2xl font-light">{selectedProfile?.icon}</span>
               </div>
               <div className="text-white font-bold text-lg">{selectedProfile?.name} Access</div>
            </div>

            {error && (
                <div className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-3 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="w-full flex flex-col gap-4 mt-2">
                <button 
                  disabled={isLoading} 
                  onClick={handleGoogleLogin} 
                  className="w-full bg-white text-black hover:bg-white/90 font-medium rounded-xl px-4 py-3 text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-black/50" /> : (
                      <>
                        <Globe className="w-4 h-4" />
                        Sign in with Google
                      </>
                    )}
                </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Branding */}
      <div className="absolute bottom-8 flex flex-col items-center gap-2 z-10 text-white/30 pointer-events-none">
         <div className="flex items-center gap-2 font-mono text-xs tracking-widest">
           <Power className="w-3 h-3" />
           ANICHISOM OS [v1.0.4]
         </div>
      </div>
    </div>
  );
}
