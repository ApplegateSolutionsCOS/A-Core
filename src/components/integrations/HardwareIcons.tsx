import React from 'react';

// Zebra Technologies - Label/Barcode Printers
export const ZebraPrinterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#1A1A1A"/>
    <rect x="8" y="8" width="24" height="6" rx="2" fill="#FFFFFF"/>
    <rect x="8" y="16" width="24" height="6" rx="2" fill="#333"/>
    <rect x="8" y="24" width="24" height="6" rx="2" fill="#FFFFFF"/>
    <rect x="8" y="32" width="24" height="2" rx="1" fill="#333"/>
    <rect x="14" y="10" width="2" height="2" fill="#1A1A1A"/>
    <rect x="18" y="10" width="4" height="2" fill="#1A1A1A"/>
    <rect x="24" y="10" width="2" height="2" fill="#1A1A1A"/>
  </svg>
);

// Honeywell - Barcode Scanners & RFID
export const HoneywellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#E31937"/>
    <path d="M10 20 L15 12 L20 20 L25 12 L30 20" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 28 L15 20 L20 28 L25 20 L30 28" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Siemens SIMATIC - PLC/SCADA
export const SiemensIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#009999"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="monospace">S</text>
    <circle cx="20" cy="20" r="14" stroke="white" strokeWidth="2" fill="none"/>
    <line x1="6" y1="20" x2="34" y2="20" stroke="white" strokeWidth="1.5" opacity="0.4"/>
  </svg>
);

// Allen-Bradley / Rockwell Automation - PLC
export const RockwellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#CC0000"/>
    <rect x="8" y="10" width="24" height="20" rx="3" fill="none" stroke="white" strokeWidth="2"/>
    <rect x="12" y="14" width="6" height="4" rx="1" fill="#FFD700"/>
    <rect x="22" y="14" width="6" height="4" rx="1" fill="#00FF00"/>
    <rect x="12" y="22" width="6" height="4" rx="1" fill="#FF6600"/>
    <rect x="22" y="22" width="6" height="4" rx="1" fill="#00BFFF"/>
  </svg>
);

// Cisco Meraki - Network Infrastructure
export const CiscoMerakiIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#049FD9"/>
    <path d="M8 24 C8 24 14 14 20 14 C26 14 32 24 32 24" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <path d="M12 24 C12 24 16 18 20 18 C24 18 28 24 28 24" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <circle cx="20" cy="24" r="2.5" fill="white"/>
  </svg>
);

// Ubiquiti UniFi - Network Management
export const UniFiIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#0559C9"/>
    <circle cx="20" cy="20" r="12" stroke="white" strokeWidth="2" fill="none"/>
    <circle cx="20" cy="20" r="7" stroke="white" strokeWidth="1.5" fill="none"/>
    <circle cx="20" cy="20" r="3" fill="white"/>
    <line x1="20" y1="8" x2="20" y2="12" stroke="white" strokeWidth="1.5"/>
    <line x1="20" y1="28" x2="20" y2="32" stroke="white" strokeWidth="1.5"/>
  </svg>
);

// HID Global - Access Control
export const HIDGlobalIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#003B71"/>
    <rect x="10" y="12" width="20" height="16" rx="3" fill="none" stroke="white" strokeWidth="2"/>
    <circle cx="20" cy="18" r="3" fill="none" stroke="#00D4FF" strokeWidth="1.5"/>
    <rect x="17" y="22" width="6" height="3" rx="1" fill="#00D4FF"/>
    <line x1="10" y1="16" x2="30" y2="16" stroke="white" strokeWidth="1" opacity="0.3"/>
  </svg>
);

// Crestron - AV Control Systems
export const CrestronIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#1C1C1C"/>
    <rect x="8" y="12" width="24" height="16" rx="2" fill="none" stroke="#C0C0C0" strokeWidth="1.5"/>
    <rect x="10" y="14" width="20" height="10" rx="1" fill="#2A2A2A"/>
    <circle cx="15" cy="19" r="2" fill="#00FF88"/>
    <circle cx="20" cy="19" r="2" fill="#FFD700"/>
    <circle cx="25" cy="19" r="2" fill="#FF4444"/>
    <rect x="12" y="26" width="16" height="1" fill="#C0C0C0"/>
  </svg>
);

// Digi International - IoT Gateways
export const DigiIoTIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#00A651"/>
    <circle cx="20" cy="20" r="4" fill="white"/>
    <circle cx="20" cy="20" r="8" stroke="white" strokeWidth="1.5" fill="none" strokeDasharray="3 2"/>
    <circle cx="20" cy="20" r="12" stroke="white" strokeWidth="1" fill="none" strokeDasharray="3 2" opacity="0.6"/>
    <circle cx="12" cy="12" r="2" fill="white" opacity="0.8"/>
    <circle cx="28" cy="12" r="2" fill="white" opacity="0.8"/>
    <circle cx="12" cy="28" r="2" fill="white" opacity="0.8"/>
    <circle cx="28" cy="28" r="2" fill="white" opacity="0.8"/>
  </svg>
);

// Trimble - GPS/Fleet Tracking
export const TrimbleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#003D6B"/>
    <path d="M20 8 L20 14" stroke="#00BFFF" strokeWidth="2"/>
    <path d="M20 26 L20 32" stroke="#00BFFF" strokeWidth="2"/>
    <path d="M8 20 L14 20" stroke="#00BFFF" strokeWidth="2"/>
    <path d="M26 20 L32 20" stroke="#00BFFF" strokeWidth="2"/>
    <circle cx="20" cy="20" r="6" stroke="white" strokeWidth="2" fill="none"/>
    <circle cx="20" cy="20" r="2" fill="#00BFFF"/>
    <path d="M20 10 L22 14 L18 14 Z" fill="#FFD700"/>
  </svg>
);

// Schneider Electric - Power Management/UPS
export const SchneiderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#3DCD58"/>
    <path d="M16 8 L24 8 L22 18 L28 18 L18 34 L20 22 L14 22 Z" fill="white"/>
  </svg>
);

// Genetec - Video Management System
export const GenetecIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#2B2D42"/>
    <circle cx="16" cy="16" r="5" fill="none" stroke="#00D4FF" strokeWidth="1.5"/>
    <circle cx="16" cy="16" r="2" fill="#00D4FF"/>
    <circle cx="28" cy="16" r="5" fill="none" stroke="#FF6B6B" strokeWidth="1.5"/>
    <circle cx="28" cy="16" r="2" fill="#FF6B6B"/>
    <rect x="8" y="26" width="24" height="6" rx="2" fill="none" stroke="white" strokeWidth="1.5"/>
    <rect x="10" y="28" width="4" height="2" fill="#00D4FF"/>
    <rect x="16" y="28" width="4" height="2" fill="#FFD700"/>
    <rect x="22" y="28" width="4" height="2" fill="#FF6B6B"/>
  </svg>
);

// FLIR / Teledyne - Thermal Cameras
export const FlirIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#1A1A2E"/>
    <defs>
      <linearGradient id="thermal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#0000FF"/>
        <stop offset="33%" stopColor="#00FF00"/>
        <stop offset="66%" stopColor="#FFFF00"/>
        <stop offset="100%" stopColor="#FF0000"/>
      </linearGradient>
    </defs>
    <circle cx="20" cy="18" r="9" fill="url(#thermal)" opacity="0.8"/>
    <circle cx="20" cy="18" r="9" stroke="white" strokeWidth="1.5" fill="none"/>
    <circle cx="20" cy="18" r="3" stroke="white" strokeWidth="1" fill="none"/>
    <line x1="20" y1="9" x2="20" y2="11" stroke="white" strokeWidth="1"/>
    <line x1="20" y1="25" x2="20" y2="27" stroke="white" strokeWidth="1"/>
    <text x="50%" y="92%" dominantBaseline="middle" textAnchor="middle" fill="#FF4444" fontSize="5" fontWeight="bold">FLIR</text>
  </svg>
);

// Motorola Solutions - Two-way Radios / Body Cameras
export const MotorolaSolIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#003B5C"/>
    <rect x="14" y="6" width="12" height="22" rx="3" fill="none" stroke="white" strokeWidth="1.5"/>
    <rect x="16" y="10" width="8" height="6" rx="1" fill="#00BFFF" opacity="0.6"/>
    <circle cx="20" cy="22" r="2" fill="white"/>
    <line x1="20" y1="6" x2="20" y2="2" stroke="white" strokeWidth="1.5"/>
    <line x1="18" y1="2" x2="22" y2="2" stroke="white" strokeWidth="1.5"/>
    <path d="M10 30 L14 28 L14 34 L10 32 Z" fill="white" opacity="0.5"/>
    <path d="M30 30 L26 28 L26 34 L30 32 Z" fill="white" opacity="0.5"/>
    <text x="50%" y="95%" dominantBaseline="middle" textAnchor="middle" fill="#00BFFF" fontSize="4">MOTO</text>
  </svg>
);

// Eaton - Power Distribution / UPS
export const EatonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#005EB8"/>
    <rect x="10" y="10" width="20" height="20" rx="3" fill="none" stroke="white" strokeWidth="2"/>
    <path d="M16 14 L20 14 L18 20 L22 20 L16 28 L18 22 L14 22 Z" fill="#FFD700"/>
    <rect x="12" y="12" width="2" height="2" fill="#00FF88"/>
  </svg>
);

// Bosch Security - Intrusion/Fire Detection
export const BoschSecurityIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#E20015"/>
    <circle cx="20" cy="20" r="12" fill="none" stroke="white" strokeWidth="2"/>
    <circle cx="20" cy="20" r="8" fill="none" stroke="white" strokeWidth="1.5"/>
    <circle cx="20" cy="20" r="4" fill="white"/>
    <line x1="20" y1="8" x2="20" y2="12" stroke="white" strokeWidth="1.5"/>
    <line x1="20" y1="28" x2="20" y2="32" stroke="white" strokeWidth="1.5"/>
    <line x1="8" y1="20" x2="12" y2="20" stroke="white" strokeWidth="1.5"/>
    <line x1="28" y1="20" x2="32" y2="20" stroke="white" strokeWidth="1.5"/>
  </svg>
);

// Emerson / Fisher - Process Control Valves
export const EmersonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#6B2D8B"/>
    <path d="M12 26 L20 10 L28 26 Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
    <line x1="16" y1="22" x2="24" y2="22" stroke="white" strokeWidth="1.5"/>
    <circle cx="20" cy="18" r="2" fill="white"/>
    <rect x="18" y="26" width="4" height="6" fill="white"/>
    <rect x="16" y="32" width="8" height="2" rx="1" fill="white"/>
  </svg>
);

// ABB - Industrial Robotics / Automation
export const ABBIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#FF000F"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="monospace">ABB</text>
  </svg>
);
