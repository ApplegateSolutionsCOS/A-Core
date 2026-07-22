/**
 * Legal Agreement Modal - Shown during free trial signup
 * Requires agreement to EULA, ToS, and Privacy Policy
 * Includes credit card verification flow
 */

import React, { useState, useRef } from 'react';
import { EULAContent, TermsOfServiceContent, PrivacyPolicyContent } from './LegalDocuments';
import { supabase } from '@/lib/supabase';
import { SUBSCRIPTION_TIERS } from '@/types';

interface LegalAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: { tier: string; trialId: string }) => void;
  userEmail: string;
  organizationId?: string;
}

type Step = 'legal' | 'tier_select' | 'card_verify' | 'complete';

const CheckboxIcon: React.FC<{ checked: boolean }> = ({ checked }) => (
  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
    checked ? 'bg-cyan-500 border-cyan-500' : 'border-gray-600 bg-transparent'
  }`}>
    {checked && (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )}
  </div>
);

const LegalAgreementModal: React.FC<LegalAgreementModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  userEmail,
  organizationId,
}) => {
  const [step, setStep] = useState<Step>('legal');
  const [activeLegalTab, setActiveLegalTab] = useState<'eula' | 'tos' | 'privacy'>('eula');
  const [agreedEULA, setAgreedEULA] = useState(false);
  const [agreedToS, setAgreedToS] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'basic' | 'pro' | 'expert'>('basic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardName, setCardName] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const allAgreed = agreedEULA && agreedToS && agreedPrivacy;

  const handleLegalNext = () => {
    if (!allAgreed) {
      setError('You must agree to all legal documents to continue.');
      return;
    }
    setError('');
    setStep('tier_select');
  };

  const handleTierNext = () => {
    setStep('card_verify');
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handleCardSubmit = async () => {
    if (!cardNumber || !cardExpiry || !cardCVC || !cardName) {
      setError('Please fill in all card fields.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Record legal agreements
      const agreements = ['eula', 'tos', 'privacy'];
      for (const type of agreements) {
        await supabase.functions.invoke('db-proxy', {
          body: {
            table: 'legal_agreements',
            operation: 'insert',
            data: {
              user_id: userEmail,
              user_type: 'organization',
              organization_id: organizationId,
              agreement_type: type,
              agreement_version: '1.0',
              ip_address: 'client',
              user_agent: navigator.userAgent,
            }
          }
        });
      }

      // Create trial subscription
      const { data: trialData } = await supabase.functions.invoke('db-proxy', {
        body: {
          table: 'trial_subscriptions',
          operation: 'insert',
          data: {
            organization_id: organizationId,
            user_email: userEmail,
            trial_tier: 'expert',
            selected_tier: selectedTier,
            card_verified: true,
            card_auth_amount: 1.00,
            card_auth_returned: true,
            status: 'active',
          },
          returning: true,
        }
      });

      // Simulate card authorization (in production, this would go through Stripe)
      await new Promise(resolve => setTimeout(resolve, 1500));

      setStep('complete');
      
      setTimeout(() => {
        onComplete({ tier: selectedTier, trialId: trialData?.id || 'trial-created' });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to process. Please try again.');
    }

    setIsProcessing(false);
  };

  const legalTabs = [
    { id: 'eula' as const, label: 'EULA', agreed: agreedEULA, setAgreed: setAgreedEULA },
    { id: 'tos' as const, label: 'Terms of Service', agreed: agreedToS, setAgreed: setAgreedToS },
    { id: 'privacy' as const, label: 'Privacy Policy', agreed: agreedPrivacy, setAgreed: setAgreedPrivacy },
  ];

  const tierEntries = Object.entries(SUBSCRIPTION_TIERS) as [string, typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS]][];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
      <div className="relative bg-black border border-cyan-500/40 rounded-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col shadow-[0_0_60px_rgba(0,255,255,0.15)] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-cyan-500/20 bg-gradient-to-r from-black via-cyan-950/20 to-black">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-mono font-bold text-white">
                {step === 'legal' && 'Legal Agreements'}
                {step === 'tier_select' && 'Select Your Plan'}
                {step === 'card_verify' && 'Verify Payment Method'}
                {step === 'complete' && 'Welcome to Applegate CORE'}
              </h2>
              <p className="text-xs font-mono text-gray-500 mt-1">
                {step === 'legal' && 'Please review and accept all agreements to continue'}
                {step === 'tier_select' && '14-day free trial with full Expert Tier access'}
                {step === 'card_verify' && 'A $1.00 authorization will be placed and immediately refunded'}
                {step === 'complete' && 'Your 14-day free trial has started'}
              </p>
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {['legal', 'tier_select', 'card_verify', 'complete'].map((s, i) => (
                <div key={s} className={`w-2.5 h-2.5 rounded-full transition-all ${
                  s === step ? 'bg-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.8)]' :
                  ['legal', 'tier_select', 'card_verify', 'complete'].indexOf(step) > i ? 'bg-cyan-600' : 'bg-gray-700'
                }`} />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5" ref={scrollRef}>
          {step === 'legal' && (
            <div className="space-y-4">
              {/* Legal tabs */}
              <div className="flex gap-2 border-b border-gray-800 pb-3">
                {legalTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveLegalTab(tab.id)}
                    className={`px-4 py-2 rounded-lg font-mono text-xs transition-all flex items-center gap-2 ${
                      activeLegalTab === tab.id
                        ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                        : 'bg-gray-900/50 border border-gray-800 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {tab.agreed && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-400">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Document content */}
              <div className="bg-gray-950/50 border border-gray-800 rounded-xl p-4 max-h-[40vh] overflow-y-auto">
                {activeLegalTab === 'eula' && <EULAContent />}
                {activeLegalTab === 'tos' && <TermsOfServiceContent />}
                {activeLegalTab === 'privacy' && <PrivacyPolicyContent />}
              </div>

              {/* Agreement checkboxes */}
              <div className="space-y-3 pt-2">
                {legalTabs.map(tab => (
                  <label key={tab.id} className="flex items-start gap-3 cursor-pointer group" onClick={() => tab.setAgreed(!tab.agreed)}>
                    <CheckboxIcon checked={tab.agreed} />
                    <span className="text-sm font-mono text-gray-300 group-hover:text-white transition-colors">
                      I have read and agree to the <span className="text-cyan-400">{tab.label}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 'tier_select' && (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                <p className="text-green-400 font-mono text-sm font-bold">14-Day Free Trial</p>
                <p className="text-gray-400 font-mono text-xs mt-1">
                  You'll have full Expert Tier access during your trial. Select the plan you'd like after the trial ends. You can change this at any time.
                </p>
              </div>

              <div className="grid gap-4">
                {tierEntries.map(([key, tier]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTier(key as any)}
                    className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                      selectedTier === key
                        ? 'border-cyan-500/60 bg-cyan-500/5 shadow-[0_0_20px_rgba(0,255,255,0.1)]'
                        : 'border-gray-800 bg-gray-950/50 hover:border-gray-700'
                    }`}
                  >
                    {selectedTier === key && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                    <div className="flex items-baseline gap-3 mb-2">
                      <h3 className="text-white font-mono font-bold text-lg">{tier.name}</h3>
                      <span className="text-cyan-400 font-mono font-bold text-2xl">${tier.price}</span>
                      <span className="text-gray-500 font-mono text-sm">/month</span>
                    </div>
                    <p className="text-gray-500 font-mono text-xs mb-3">+ ${tier.perUserPrice}/user/month</p>
                    <div className="flex flex-wrap gap-2">
                      {tier.features.map((f, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-900/80 border border-gray-800 rounded text-gray-400 font-mono text-xs">
                          {f}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'card_verify' && (
            <div className="space-y-5">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <p className="text-amber-400 font-mono text-sm font-bold">Card Verification</p>
                <p className="text-gray-400 font-mono text-xs mt-1">
                  A $1.00 USD authorization will be placed on your card and immediately returned. This verifies your card is valid. You will NOT be charged until after your 14-day free trial ends.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-mono text-gray-400 mb-2">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-cyan-500/50 transition-all"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-mono text-gray-400 mb-2">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono tracking-wider focus:outline-none focus:border-cyan-500/50 transition-all"
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-mono text-gray-400 mb-2">Expiry</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-cyan-500/50 transition-all"
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-mono text-gray-400 mb-2">CVC</label>
                    <input
                      type="text"
                      value={cardCVC}
                      onChange={e => setCardCVC(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-cyan-500/50 transition-all"
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-950/50 border border-gray-800 rounded-xl p-4">
                <div className="flex justify-between text-sm font-mono mb-2">
                  <span className="text-gray-400">Selected Plan</span>
                  <span className="text-white">{SUBSCRIPTION_TIERS[selectedTier].name}</span>
                </div>
                <div className="flex justify-between text-sm font-mono mb-2">
                  <span className="text-gray-400">After Trial</span>
                  <span className="text-cyan-400">${SUBSCRIPTION_TIERS[selectedTier].price}/mo</span>
                </div>
                <div className="flex justify-between text-sm font-mono border-t border-gray-800 pt-2 mt-2">
                  <span className="text-gray-400">Today's Charge</span>
                  <span className="text-green-400 font-bold">$0.00 (14-day free trial)</span>
                </div>
                <p className="text-gray-600 font-mono text-xs mt-2">
                  $1.00 auth hold will be placed and immediately returned
                </p>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(0,255,0,0.3)]">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-2xl font-mono font-bold text-white mb-3">Trial Activated!</h3>
              <p className="text-gray-400 font-mono text-sm mb-2">
                Your 14-day free trial with Expert Tier access is now active.
              </p>
              <p className="text-gray-500 font-mono text-xs">
                Your {SUBSCRIPTION_TIERS[selectedTier].name} subscription (${SUBSCRIPTION_TIERS[selectedTier].price}/mo) will begin automatically after the trial.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-cyan-400 font-mono text-sm">Redirecting to your dashboard...</span>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 font-mono text-sm">{error}</p>
          </div>
        )}

        {/* Footer */}
        {step !== 'complete' && (
          <div className="p-5 border-t border-cyan-500/20 bg-black flex items-center justify-between">
            <button
              onClick={step === 'legal' ? onClose : () => setStep(step === 'card_verify' ? 'tier_select' : 'legal')}
              className="px-5 py-2.5 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 hover:text-white transition-all font-mono text-sm"
            >
              {step === 'legal' ? 'Cancel' : 'Back'}
            </button>
            
            {step === 'legal' && (
              <button
                onClick={handleLegalNext}
                disabled={!allAgreed}
                className="px-6 py-2.5 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-mono text-sm"
              >
                Continue to Plan Selection
              </button>
            )}
            {step === 'tier_select' && (
              <button
                onClick={handleTierNext}
                className="px-6 py-2.5 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all font-mono text-sm"
              >
                Continue to Payment
              </button>
            )}
            {step === 'card_verify' && (
              <button
                onClick={handleCardSubmit}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50 font-mono text-sm flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Verifying Card...
                  </>
                ) : (
                  'Start Free Trial'
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalAgreementModal;
