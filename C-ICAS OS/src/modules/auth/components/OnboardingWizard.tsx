import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Check, ChevronRight, FileText, Globe, Landmark, Users } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: OnboardingStep[] = [
  { id: 1, title: 'Dane Firmy', description: 'Podstawowe informacje o organizacji', icon: <Building2 className="h-5 w-5" /> },
  { id: 2, title: 'Weryfikacja', description: 'NIP i dane rejestrowe', icon: <FileText className="h-5 w-5" /> },
  { id: 3, title: 'Preferencje', description: 'Waluta i strefa czasowa', icon: <Globe className="h-5 w-5" /> },
  { id: 4, title: 'Zespół', description: 'Zaproś pierwszych członków', icon: <Users className="h-5 w-5" /> },
  { id: 5, title: 'Podsumowanie', description: 'Potwierdź i rozpocznij', icon: <Check className="h-5 w-5" /> }
];

export const OnboardingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    nip: '',
    legalForm: 'JDG',
    country: 'PL',
    currency: 'PLN',
    timezone: 'Europe/Warsaw'
  });
  const { user, setActiveTenant, isGlobalAdmin } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setError('Podaj nazwę organizacji');
        return false;
      }
      if (formData.name.length < 3) {
        setError('Nazwa organizacji jest za krótka');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!formData.nip.trim()) {
        setError('Podaj numer NIP');
        return false;
      }
      const nipRegex = /^\d{10}$/;
      if (!nipRegex.test(formData.nip.replace(/-|\s/g, ''))) {
        setError('Niepoprawny format NIP (wymagane 10 cyfr)');
        return false;
      }
    }
    setError(null);
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };
  
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    if (!user) return;
    if (!validateStep()) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      // Integration with Firebase
      const { db } = await import('../../../shared/lib/firebase');
      const { doc, collection, setDoc, serverTimestamp } = await import('firebase/firestore');
      
      const tenantId = `tnt_${crypto.randomUUID().replace(/-/g, '')}`;
      const tenantRef = doc(db, 'tenants', tenantId);
      
      const tenantData = {
        ...formData,
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        activeModules: ['dashboard', 'crm', 'projects', 'time', 'finance']
      };

      await setDoc(tenantRef, tenantData);

      // Add membership
      const membershipRef = doc(db, `users/${user.uid}/tenantMemberships`, tenantId);
      await setDoc(membershipRef, {
        roleId: 'owner',
        tenantId,
        status: 'active',
        joinedAt: serverTimestamp()
      });

      // Seed workflow role index (for document assignment)
      const { seedRoleIndexFromMembership } = await import('../../workflow/services/roleResolutionService');
      await seedRoleIndexFromMembership(tenantId, user.uid).catch(() => {});

      // Update user active tenant
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { activeTenantId: tenantId }, { merge: true });

      console.log('Tenant created successfully:', tenantId);
      
      // Notify components about the new tenant
      setActiveTenant(tenantId);
      
      setCurrentStep(5);
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Wystąpił błąd podczas tworzenia firmy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const skipOnboarding = () => {
    if (isGlobalAdmin) {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {isGlobalAdmin && (
        <div className="mb-6 flex justify-end">
          <button 
            onClick={skipOnboarding}
            className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2"
          >
            Pomiń onboarding (Admin) <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col items-center gap-2 relative">
              <div className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all ${
                currentStep >= step.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400'
              }`}>
                {currentStep > step.id ? <Check className="h-5 w-5" /> : step.icon}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 absolute top-full mt-2 w-max text-center">
                {currentStep === step.id && step.title}
              </div>
              {step.id < steps.length && (
                <div className={`h-[2px] w-12 md:w-20 absolute top-5 left-12 transition-colors ${
                  currentStep > step.id ? 'bg-slate-900' : 'bg-slate-100'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-2xl shadow-slate-200/50 min-h-[400px] flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            <h2 className="text-2xl font-black text-slate-900 mb-2">{steps[currentStep-1].title}</h2>
            <p className="text-slate-500 mb-8">{steps[currentStep-1].description}</p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold animate-shake">
                {error}
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Nazwa Organizacji</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="np. Moja Firma Sp. z o.o."
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-slate-900/5 outline-none transition-all font-display font-bold"
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Forma Prawna</label>
                  <select 
                    value={formData.legalForm}
                    onChange={e => setFormData({...formData, legalForm: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white outline-none transition-all font-display font-bold appearance-none cursor-pointer"
                  >
                    <option value="JDG">JDG (Osoba fizyczna)</option>
                    <option value="Spolka_z_oo">Spółka z o.o.</option>
                    <option value="Spolka_cywilna">Spółka cywilna</option>
                    <option value="Fundacja">Fundacja / Stowarzyszenie</option>
                  </select>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Numer NIP</label>
                  <input 
                    type="text" 
                    placeholder="Wpisz NIP dla auto-uzupełnienia"
                    value={formData.nip}
                    onChange={e => setFormData({...formData, nip: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-slate-900/5 outline-none transition-all font-display font-bold"
                  />
                  <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                     <Landmark className="h-5 w-5 text-amber-600 shrink-0" />
                     <p className="text-xs text-amber-700 leading-relaxed font-medium">Baza GUS: Dane zostaną automatycznie pobrane po wpisaniu pełnego numeru NIP.</p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="flex flex-col items-center justify-center text-center py-8">
                 <div className="h-20 w-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <Check className="h-10 w-10" />
                 </div>
                 <h3 className="text-xl font-black text-slate-900 mb-2">Gotowy do startu!</h3>
                 <p className="text-slate-500 mb-6">Twoja organizacja została poprawnie skonfigurowana. Teraz możesz przejść do panelu sterowania.</p>
                 <div className="w-full bg-slate-50 p-4 rounded-2xl text-left border border-slate-100 mb-8">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Wybrana firma</div>
                    <div className="text-sm font-bold text-slate-900">{formData.name || 'Bez nazwy'}</div>
                 </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-auto pt-8 flex gap-4">
          {currentStep > 1 && currentStep < 5 && (
            <button 
              onClick={prevStep}
              className="flex-1 py-4 px-6 rounded-2xl border border-slate-200 font-display font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Wstecz
            </button>
          )}
          {currentStep < 5 && (
            <button 
              onClick={currentStep === 4 ? handleSubmit : nextStep}
              disabled={isSubmitting}
              className="flex-[2] py-4 px-6 rounded-2xl bg-slate-900 text-white font-display font-bold hover:bg-black transition-all flex items-center justify-center gap-2 group shadow-xl shadow-slate-900/20"
            >
              {isSubmitting ? 'Przetwarzanie...' : (
                <>
                  {currentStep === 4 ? 'Utwórz Firmę' : 'Dalej'}
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          )}
          {currentStep === 5 && (
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="w-full py-4 px-6 rounded-2xl bg-slate-900 text-white font-display font-bold hover:bg-black transition-all shadow-xl shadow-slate-900/20"
            >
              Przejdź do Dashboardu
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
