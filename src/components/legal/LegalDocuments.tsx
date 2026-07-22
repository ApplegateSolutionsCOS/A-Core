/**
 * Legal Documents - EULA, Terms of Service, Privacy Policy
 * Applegate Business Operating System (CORE)
 */

import React, { useState } from 'react';

const COMPANY_NAME = 'Applegate Solutions LLC';
const PRODUCT_NAME = 'Applegate CORE Business Operating System';
const EFFECTIVE_DATE = 'February 20, 2026';
const CONTACT_EMAIL = 'legal@applegate.solutions';
const WEBSITE = 'www.applegate.solutions';

// ─── EULA ─────────────────────────────────────────────────

export const EULAContent: React.FC = () => (
  <div className="prose prose-invert prose-sm max-w-none font-mono text-gray-300 space-y-4">
    <h2 className="text-cyan-400 text-lg font-bold">END USER LICENSE AGREEMENT</h2>
    <p className="text-gray-500 text-xs">Effective Date: {EFFECTIVE_DATE}</p>
    
    <p>This End User License Agreement ("Agreement") is a legal agreement between you ("User," "You") and {COMPANY_NAME} ("Company," "We," "Us") for the use of {PRODUCT_NAME} ("Software," "Platform," "Service").</p>
    
    <p className="font-bold text-white">BY CLICKING "I AGREE," CREATING AN ACCOUNT, OR USING THE SOFTWARE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THIS AGREEMENT.</p>

    <h3 className="text-cyan-300 font-bold">1. LICENSE GRANT</h3>
    <p>Subject to the terms of this Agreement and payment of applicable fees, Company grants You a limited, non-exclusive, non-transferable, revocable license to access and use the Software for your internal business operations during the subscription term.</p>

    <h3 className="text-cyan-300 font-bold">2. RESTRICTIONS</h3>
    <p>You shall not: (a) sublicense, sell, lease, or distribute the Software; (b) reverse engineer, decompile, or disassemble the Software; (c) modify or create derivative works; (d) use the Software to develop competing products; (e) circumvent any technical limitations or security measures; (f) use the Software for any unlawful purpose; (g) share login credentials with unauthorized parties; (h) attempt to access other users' data without authorization.</p>

    <h3 className="text-cyan-300 font-bold">3. INTELLECTUAL PROPERTY</h3>
    <p>The Software, including all code, algorithms, designs, interfaces, documentation, and proprietary encryption protocols (including but not limited to Q-CORE Digital Security, A-CORE Architecture, and all quantum-safe encryption implementations), are and remain the exclusive property of {COMPANY_NAME}. All rights not expressly granted are reserved.</p>

    <h3 className="text-cyan-300 font-bold">4. DATA OWNERSHIP</h3>
    <p>You retain all rights to the data you input into the Software ("Your Data"). Company does not claim ownership of Your Data. You grant Company a limited license to process Your Data solely for the purpose of providing the Service.</p>

    <h3 className="text-cyan-300 font-bold">5. SUBSCRIPTION & PAYMENT</h3>
    <p>5.1. <strong>Free Trial:</strong> New users receive a 14-day free trial with full Expert Tier access. A valid credit card is required. A small authorization charge (typically $1.00 USD) will be placed and refunded to verify card validity.</p>
    <p>5.2. <strong>Auto-Renewal:</strong> After the trial period, your subscription automatically converts to the selected tier and your card will be charged the applicable monthly fee unless cancelled before the trial ends.</p>
    <p>5.3. <strong>Pricing:</strong> Current pricing is available at {WEBSITE}. Company reserves the right to modify pricing with 30 days' written notice.</p>

    <h3 className="text-cyan-300 font-bold">6. TERMINATION</h3>
    <p>Either party may terminate this Agreement with 30 days' written notice. Company may terminate immediately for breach. Upon termination, your access ceases and data export is available for 30 days.</p>

    <h3 className="text-cyan-300 font-bold">7. WARRANTY DISCLAIMER</h3>
    <p className="uppercase text-xs">THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>

    <h3 className="text-cyan-300 font-bold">8. LIMITATION OF LIABILITY</h3>
    <p className="uppercase text-xs">IN NO EVENT SHALL COMPANY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY. COMPANY'S TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNTS PAID BY YOU IN THE 12 MONTHS PRECEDING THE CLAIM.</p>

    <h3 className="text-cyan-300 font-bold">9. INDEMNIFICATION</h3>
    <p>You agree to indemnify and hold harmless {COMPANY_NAME}, its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of the Software or violation of this Agreement.</p>

    <h3 className="text-cyan-300 font-bold">10. GOVERNING LAW</h3>
    <p>This Agreement shall be governed by the laws of the State of Florida, United States, without regard to conflict of law principles. Any disputes shall be resolved through binding arbitration in Hillsborough County, Florida.</p>

    <h3 className="text-cyan-300 font-bold">11. ENTIRE AGREEMENT</h3>
    <p>This Agreement, together with the Terms of Service and Privacy Policy, constitutes the entire agreement between You and Company regarding the Software.</p>

    <p className="text-gray-500 text-xs mt-6">Contact: {CONTACT_EMAIL} | {COMPANY_NAME}</p>
  </div>
);

// ─── TERMS OF SERVICE ─────────────────────────────────────

export const TermsOfServiceContent: React.FC = () => (
  <div className="prose prose-invert prose-sm max-w-none font-mono text-gray-300 space-y-4">
    <h2 className="text-cyan-400 text-lg font-bold">TERMS OF SERVICE</h2>
    <p className="text-gray-500 text-xs">Effective Date: {EFFECTIVE_DATE}</p>
    
    <p>These Terms of Service ("Terms") govern your access to and use of {PRODUCT_NAME} provided by {COMPANY_NAME}.</p>

    <h3 className="text-cyan-300 font-bold">1. ACCOUNT REGISTRATION</h3>
    <p>1.1. You must provide accurate, complete information when creating an account.</p>
    <p>1.2. You are responsible for maintaining the confidentiality of your account credentials.</p>
    <p>1.3. You must be at least 18 years old or have legal authority to enter into this agreement on behalf of your organization.</p>
    <p>1.4. One Organization Admin account is required per organization. Additional users are added at the per-user rate.</p>

    <h3 className="text-cyan-300 font-bold">2. SERVICE DESCRIPTION</h3>
    <p>{PRODUCT_NAME} is a comprehensive business operating system providing workspace management, mini-application building, team collaboration, security monitoring, and data management tools. The Service includes quantum-safe encryption for data protection.</p>

    <h3 className="text-cyan-300 font-bold">3. SUBSCRIPTION TIERS</h3>
    <p>3.1. <strong>Basic ($249/mo):</strong> 6 default workspaces, all preset mini apps, up to 60 mini apps per workspace.</p>
    <p>3.2. <strong>Pro ($499/mo):</strong> Up to 30 workspaces, custom workspace creation, priority support.</p>
    <p>3.3. <strong>Expert ($899/mo):</strong> Up to 12 organizations, 30 workspaces per org, dedicated support, multi-org management.</p>
    <p>3.4. Additional users: $19/month per user across all tiers.</p>

    <h3 className="text-cyan-300 font-bold">4. FREE TRIAL</h3>
    <p>4.1. New organizations receive a 14-day free trial with full Expert Tier features.</p>
    <p>4.2. A valid credit card must be provided. A small verification charge (approximately $1.00 USD) will be authorized and immediately refunded.</p>
    <p>4.3. If not cancelled before the trial ends, your selected tier subscription begins automatically.</p>
    <p>4.4. You may cancel at any time during the trial without charge.</p>

    <h3 className="text-cyan-300 font-bold">5. ACCEPTABLE USE</h3>
    <p>You agree not to: (a) use the Service for illegal activities; (b) transmit malware or harmful code; (c) attempt to gain unauthorized access to other accounts; (d) use the Service to store or transmit content that infringes intellectual property rights; (e) interfere with or disrupt the Service; (f) use automated systems to access the Service beyond normal usage.</p>

    <h3 className="text-cyan-300 font-bold">6. DATA & SECURITY</h3>
    <p>6.1. All data is encrypted using our proprietary hybrid encryption (AES-256-GCM + ML-KEM-1024 post-quantum cryptography).</p>
    <p>6.2. We maintain industry-standard security practices and regular security audits.</p>
    <p>6.3. You are responsible for the security of your account credentials and any activity under your account.</p>

    <h3 className="text-cyan-300 font-bold">7. SUPPORT</h3>
    <p>7.1. Support is provided based on your subscription tier.</p>
    <p>7.2. {COMPANY_NAME} support personnel will only access your organization's data when explicitly invited by your Organization Admin for support purposes.</p>
    <p>7.3. All support access is logged in the audit trail.</p>

    <h3 className="text-cyan-300 font-bold">8. SERVICE AVAILABILITY</h3>
    <p>We target 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be communicated in advance. The offline-capable features allow continued use during connectivity interruptions.</p>

    <h3 className="text-cyan-300 font-bold">9. MODIFICATIONS</h3>
    <p>We may modify these Terms with 30 days' notice. Continued use after modifications constitutes acceptance.</p>

    <h3 className="text-cyan-300 font-bold">10. CANCELLATION & REFUNDS</h3>
    <p>10.1. You may cancel your subscription at any time from your Organization Admin panel.</p>
    <p>10.2. Cancellation takes effect at the end of the current billing period.</p>
    <p>10.3. No refunds for partial billing periods unless required by applicable law.</p>
    <p>10.4. Upon cancellation, you have 30 days to export your data before it is permanently deleted.</p>

    <p className="text-gray-500 text-xs mt-6">Contact: {CONTACT_EMAIL} | {COMPANY_NAME}</p>
  </div>
);

// ─── PRIVACY POLICY ─────────────────────────────────────

export const PrivacyPolicyContent: React.FC = () => (
  <div className="prose prose-invert prose-sm max-w-none font-mono text-gray-300 space-y-4">
    <h2 className="text-cyan-400 text-lg font-bold">PRIVACY POLICY</h2>
    <p className="text-gray-500 text-xs">Effective Date: {EFFECTIVE_DATE}</p>
    
    <p>{COMPANY_NAME} ("Company," "We," "Us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use {PRODUCT_NAME}.</p>

    <h3 className="text-cyan-300 font-bold">1. INFORMATION WE COLLECT</h3>
    <p><strong>1.1. Account Information:</strong> Name, email address, organization name, domain, and billing information when you register.</p>
    <p><strong>1.2. Usage Data:</strong> Login timestamps, feature usage analytics, device information, and IP addresses for security monitoring.</p>
    <p><strong>1.3. Your Business Data:</strong> Any data you input into the platform including contacts, records, documents, and communications within your organization's workspaces.</p>

    <h3 className="text-cyan-300 font-bold">2. HOW WE USE YOUR INFORMATION</h3>
    <p>2.1. To provide, maintain, and improve the Service.</p>
    <p>2.2. To process payments and manage subscriptions.</p>
    <p>2.3. To send service-related communications (not marketing).</p>
    <p>2.4. To detect, prevent, and address security threats.</p>
    <p>2.5. To comply with legal obligations.</p>

    <h3 className="text-cyan-300 font-bold text-white bg-cyan-500/10 p-2 rounded">3. WE DO NOT ACCESS YOUR DATA</h3>
    <p className="font-bold text-white">3.1. {COMPANY_NAME} does NOT read, view, analyze, or access your organization's messages, communications, records, or any business data stored within the platform.</p>
    <p className="font-bold text-white">3.2. Your data is encrypted end-to-end using quantum-safe encryption protocols. We cannot and do not decrypt your data for any purpose other than providing the Service.</p>
    <p className="font-bold text-white">3.3. The ONLY circumstance under which {COMPANY_NAME} personnel may access your organization's data is when your Organization Admin explicitly invites our support team into the organization for the specific purpose of providing technical support.</p>
    <p className="font-bold text-white">3.4. All support access is: (a) initiated only by your Organization Admin; (b) limited to the scope of the support request; (c) fully logged in the audit trail; (d) revocable at any time by the Organization Admin.</p>
    <p className="font-bold text-white">3.5. We do not sell, rent, or share your business data with any third parties.</p>

    <h3 className="text-cyan-300 font-bold">4. DATA ENCRYPTION & SECURITY</h3>
    <p>4.1. All data at rest is encrypted using AES-256-GCM.</p>
    <p>4.2. All data in transit is encrypted using TLS 1.3.</p>
    <p>4.3. Key exchange uses ML-KEM-1024 (NIST Level 5 post-quantum cryptography).</p>
    <p>4.4. We maintain SOC 2 Type II compliance standards.</p>
    <p>4.5. Regular third-party security audits are conducted.</p>

    <h3 className="text-cyan-300 font-bold">5. DATA RETENTION</h3>
    <p>5.1. Your data is retained for the duration of your subscription.</p>
    <p>5.2. Upon cancellation, data is available for export for 30 days, then permanently deleted.</p>
    <p>5.3. Audit logs are retained for 7 years for compliance purposes.</p>
    <p>5.4. Backup data is encrypted and automatically purged after 90 days.</p>

    <h3 className="text-cyan-300 font-bold">6. YOUR RIGHTS</h3>
    <p>You have the right to: (a) access your personal data; (b) correct inaccurate data; (c) export your data at any time; (d) request deletion of your data; (e) restrict processing of your data; (f) object to data processing; (g) data portability.</p>

    <h3 className="text-cyan-300 font-bold">7. COOKIES & TRACKING</h3>
    <p>We use essential cookies only for authentication and session management. We do not use advertising cookies or third-party tracking pixels. Analytics are collected in aggregate form only.</p>

    <h3 className="text-cyan-300 font-bold">8. THIRD-PARTY SERVICES</h3>
    <p>We use the following third-party services: (a) Stripe for payment processing; (b) SendGrid for transactional emails; (c) Twilio for SMS verification. These services have their own privacy policies and are bound by data processing agreements.</p>

    <h3 className="text-cyan-300 font-bold">9. CHILDREN'S PRIVACY</h3>
    <p>The Service is not intended for use by individuals under 18 years of age. We do not knowingly collect information from children.</p>

    <h3 className="text-cyan-300 font-bold">10. INTERNATIONAL DATA TRANSFERS</h3>
    <p>Data is stored in the United States. If you are located outside the US, your data will be transferred to and processed in the US in accordance with applicable data protection laws.</p>

    <h3 className="text-cyan-300 font-bold">11. CHANGES TO THIS POLICY</h3>
    <p>We may update this Privacy Policy with 30 days' notice. Material changes will be communicated via email and in-app notification.</p>

    <h3 className="text-cyan-300 font-bold">12. CONTACT</h3>
    <p>For privacy-related inquiries: {CONTACT_EMAIL}</p>
    <p>Data Protection Officer: privacy@applegate.solutions</p>
    <p>{COMPANY_NAME} | Tampa, Florida, United States</p>
  </div>
);

// ─── Tabbed Legal Viewer ─────────────────────────────────

interface LegalViewerProps {
  initialTab?: 'eula' | 'tos' | 'privacy';
  className?: string;
}

export const LegalViewer: React.FC<LegalViewerProps> = ({ initialTab = 'eula', className = '' }) => {
  const [activeTab, setActiveTab] = useState<'eula' | 'tos' | 'privacy'>(initialTab);

  const tabs = [
    { id: 'eula' as const, label: 'EULA' },
    { id: 'tos' as const, label: 'Terms of Service' },
    { id: 'privacy' as const, label: 'Privacy Policy' },
  ];

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex gap-2 mb-4 border-b border-gray-800 pb-3">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-mono text-xs transition-all ${
              activeTab === tab.id
                ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                : 'bg-gray-900/50 border border-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto pr-2">
        {activeTab === 'eula' && <EULAContent />}
        {activeTab === 'tos' && <TermsOfServiceContent />}
        {activeTab === 'privacy' && <PrivacyPolicyContent />}
      </div>
    </div>
  );
};

export default LegalViewer;
