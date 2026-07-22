import React, { useState, useRef, useCallback } from 'react';
import {
  secureFileUpload,
  formatFileSize,
  getThreatLevelColor,
  type QCoreScanResult,
} from '@/lib/qcoreSecurity';

// Inline icons
const UploadIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);
const FileIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);
const ShieldCheckIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
  </svg>
);
const ShieldXIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
  </svg>
);
const XIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const STAGES = ['Validating', 'Hashing', 'Q-CORE Scanning', 'Uploading', 'Complete'];

const getFileTypeIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return '🖼';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📑';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦';
  return '📎';
};

interface SecureFileUploadProps {
  uploaderId: string;
  uploaderName?: string;
  uploaderEmail?: string;
  workspace?: string;
  organizationId?: string;
  channel?: string;
  onUploadComplete?: (result: { fileUrl: string; fileName: string; scanResult: QCoreScanResult }) => void;
  onClose?: () => void;
}

const SecureFileUpload: React.FC<SecureFileUploadProps> = ({
  uploaderId,
  uploaderName,
  uploaderEmail,
  workspace,
  organizationId,
  channel,
  onUploadComplete,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStage, setCurrentStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [scanResult, setScanResult] = useState<QCoreScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setError(null);
      setScanResult(null);
      setUploadSuccess(false);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setError(null);
      setScanResult(null);
      setUploadSuccess(false);
    }
  };

  const mapProgressToStage = (stage: string, pct: number) => {
    if (stage.includes('Validat')) { setCurrentStage('Validating'); setProgress(10); }
    else if (stage.includes('hash') || stage.includes('Hash')) { setCurrentStage('Hashing'); setProgress(25); }
    else if (stage.includes('Q-CORE') || stage.includes('scan') || stage.includes('Scan')) { setCurrentStage('Q-CORE Scanning'); setProgress(45); }
    else if (stage.includes('Upload') || stage.includes('upload')) { setCurrentStage('Uploading'); setProgress(70); }
    else if (stage.includes('Final') || stage.includes('Record')) { setCurrentStage('Uploading'); setProgress(85); }
    else if (stage.includes('Complete')) { setCurrentStage('Complete'); setProgress(100); }
    else { setProgress(pct); }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    setScanResult(null);
    setUploadSuccess(false);
    setCurrentStage('Validating');
    setProgress(5);

    const result = await secureFileUpload({
      file: selectedFile,
      uploaderId,
      uploaderName,
      uploaderEmail,
      workspace,
      organizationId,
      channel,
      onProgress: mapProgressToStage,
    });

    if (result.scanResult) setScanResult(result.scanResult);

    if (result.success) {
      setUploadSuccess(true);
      setCurrentStage('Complete');
      setProgress(100);
      onUploadComplete?.({
        fileUrl: result.fileUrl || '',
        fileName: selectedFile.name,
        scanResult: result.scanResult!,
      });
    } else {
      setError(result.error || 'Upload failed');
      if (!result.scanResult) {
        setCurrentStage('');
        setProgress(0);
      }
    }

    setIsUploading(false);
  };

  const getStageIndex = () => STAGES.indexOf(currentStage);

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-black/90 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon size={18} className="text-cyan-400" />
          <span className="text-white font-mono text-sm font-bold">Q-CORE Secure Upload</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition-colors">
            <XIcon size={16} />
          </button>
        )}
      </div>

      {/* Drop Zone */}
      {!selectedFile && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(0,255,255,0.2)]'
              : 'border-gray-700 hover:border-cyan-500/50 hover:bg-cyan-500/5'
          }`}
        >
          <UploadIcon size={32} className={`mx-auto mb-3 ${isDragging ? 'text-cyan-400' : 'text-gray-500'}`} />
          <p className="text-gray-400 font-mono text-sm">
            {isDragging ? 'Drop file here' : 'Drag & drop a file or click to browse'}
          </p>
          <p className="text-gray-600 font-mono text-xs mt-1">Max 300MB - All files scanned by Q-CORE</p>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        </div>
      )}

      {/* Selected File */}
      {selectedFile && (
        <div className="flex items-center gap-3 p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
          <span className="text-2xl">{getFileTypeIcon(selectedFile.type)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-mono text-sm truncate">{selectedFile.name}</p>
            <p className="text-gray-500 font-mono text-xs">{formatFileSize(selectedFile.size)} &middot; {selectedFile.type || 'unknown'}</p>
          </div>
          {!isUploading && !uploadSuccess && (
            <button
              onClick={() => { setSelectedFile(null); setError(null); setScanResult(null); }}
              className="p-1 text-gray-500 hover:text-red-400 transition-colors"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>
      )}

      {/* Progress Stages */}
      {(isUploading || uploadSuccess || (error && scanResult)) && (
        <div className="space-y-3">
          <div className="flex items-center gap-1">
            {STAGES.map((stage, i) => {
              const stageIdx = getStageIndex();
              const isActive = i === stageIdx;
              const isDone = i < stageIdx || (uploadSuccess && i <= 4);
              const isFailed = error && i === stageIdx;
              return (
                <React.Fragment key={stage}>
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold border transition-all ${
                      isFailed ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                      isDone ? 'bg-green-500/20 border-green-500/50 text-green-400' :
                      isActive ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 animate-pulse' :
                      'bg-gray-900 border-gray-700 text-gray-600'
                    }`}>
                      {isDone ? '\u2713' : isFailed ? '!' : i + 1}
                    </div>
                    <span className={`text-[9px] font-mono mt-1 text-center ${
                      isFailed ? 'text-red-400' : isDone ? 'text-green-400' : isActive ? 'text-cyan-400' : 'text-gray-600'
                    }`}>{stage}</span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={`h-0.5 flex-1 rounded ${isDone ? 'bg-green-500/50' : 'bg-gray-800'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${error ? 'bg-red-500' : uploadSuccess ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-fuchsia-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Scan Results */}
      {scanResult && (
        <div className={`rounded-lg border p-3 ${
          scanResult.status === 'clean' ? 'border-green-500/30 bg-green-500/5' :
          'border-red-500/30 bg-red-500/5'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {scanResult.status === 'clean' ? (
              <ShieldCheckIcon size={18} className="text-green-400" />
            ) : (
              <ShieldXIcon size={18} className="text-red-400" />
            )}
            <span className={`font-mono text-sm font-bold ${scanResult.status === 'clean' ? 'text-green-400' : 'text-red-400'}`}>
              {scanResult.status === 'clean' ? 'File Passed Security Scan' : 'File Blocked'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-gray-500">Scan ID:</span>
              <span className="text-gray-300 ml-1 truncate">{scanResult.scanId?.slice(0, 20)}...</span>
            </div>
            <div>
              <span className="text-gray-500">Engine:</span>
              <span className="text-gray-300 ml-1">{scanResult.engine}</span>
            </div>
            <div>
              <span className="text-gray-500">Threat:</span>
              <span className={`ml-1 ${getThreatLevelColor(scanResult.threatLevel).text}`}>{scanResult.threatLevel?.toUpperCase()}</span>
            </div>
            <div>
              <span className="text-gray-500">Signatures:</span>
              <span className="text-gray-300 ml-1">{scanResult.signatures?.toLocaleString()}</span>
            </div>
          </div>
          {scanResult.threats && scanResult.threats.length > 0 && (
            <div className="mt-2 space-y-1">
              {scanResult.threats.map((t, i) => (
                <div key={i} className="text-xs font-mono text-red-400 bg-red-500/10 rounded px-2 py-1">
                  {t.description}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && !scanResult && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
          <div className="flex items-center gap-2">
            <ShieldXIcon size={18} className="text-red-400" />
            <span className="text-red-400 font-mono text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && !isUploading && !uploadSuccess && (
        <button
          onClick={handleUpload}
          className="w-full py-3 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:shadow-[0_0_20px_rgba(0,255,255,0.2)] transition-all font-mono font-bold"
        >
          Scan & Upload Securely
        </button>
      )}

      {/* Success */}
      {uploadSuccess && (
        <div className="text-center py-2">
          <p className="text-green-400 font-mono text-sm font-bold">File uploaded successfully!</p>
        </div>
      )}
    </div>
  );
};

export default SecureFileUpload;
