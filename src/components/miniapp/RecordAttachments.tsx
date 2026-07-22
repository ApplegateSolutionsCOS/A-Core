import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Inline icons
const UploadCloudIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
);
const FileTextIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
);
const ImageIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
);
const TrashIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
);
const DownloadIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);
const XIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const PaperclipIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
);

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface RecordAttachmentsProps {
  recordId: string;
  miniAppId: string;
  wsColor: { primary: string; rgb: string };
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  compact?: boolean;
}

const BUCKET = 'user-uploads';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageType = (type: string): boolean => {
  return type.startsWith('image/');
};

const getFileIcon = (type: string) => {
  if (isImageType(type)) return ImageIcon;
  return FileTextIcon;
};

const getFileColor = (type: string): string => {
  if (isImageType(type)) return '#22c55e';
  if (type.includes('pdf')) return '#ef4444';
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return '#22c55e';
  if (type.includes('document') || type.includes('word')) return '#3b82f6';
  if (type.includes('presentation') || type.includes('powerpoint')) return '#f59e0b';
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return '#a855f7';
  return '#6b7280';
};

const RecordAttachments: React.FC<RecordAttachmentsProps> = ({
  recordId, miniAppId, wsColor, attachments, onAttachmentsChange, compact = false,
}) => {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = user ? (user as any).id || (user as any).email || 'anonymous' : 'anonymous';

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);

  const uploadFile = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be under 50MB');
      return;
    }
    setIsUploading(true);
    setUploadProgress(10);
    setError(null);

    try {
      const ext = file.name.split('.').pop() || 'bin';
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `records/${miniAppId}/${recordId}/${Date.now()}_${safeName}`;

      setUploadProgress(30);

      const { data, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      setUploadProgress(70);

      // Get public URL
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl || '';

      setUploadProgress(90);

      const newAttachment: Attachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        path: filePath,
        url: publicUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userId,
      };

      const updated = [...attachments, newAttachment];
      onAttachmentsChange(updated);
      setUploadProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) uploadFile(files[0]);
  }, [attachments, recordId, miniAppId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`Delete "${attachment.name}"?`)) return;
    try {
      // Delete from storage
      await supabase.storage.from(BUCKET).remove([attachment.path]);
      // Update attachments list
      const updated = attachments.filter(a => a.id !== attachment.id);
      onAttachmentsChange(updated);
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.message || 'Delete failed');
    }
  };

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PaperclipIcon size={14} style={{ color: wsColor.primary }} />
            <span className="text-xs font-mono text-gray-400">Attachments ({attachments.length})</span>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-2 py-1 rounded text-[10px] font-mono transition-all disabled:opacity-50"
            style={{ background: `rgba(${wsColor.rgb}, 0.1)`, border: `1px solid rgba(${wsColor.rgb}, 0.3)`, color: wsColor.primary }}
          >
            {isUploading ? 'Uploading...' : '+ Attach'}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        </div>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map(att => {
              const FileIconComp = getFileIcon(att.type);
              const color = getFileColor(att.type);
              return (
                <div key={att.id} className="group relative flex items-center gap-2 px-2 py-1.5 bg-gray-900/60 border border-gray-800 rounded-lg hover:border-gray-700 transition-all">
                  {isImageType(att.type) ? (
                    <img src={att.url} alt={att.name} className="w-6 h-6 rounded object-cover" />
                  ) : (
                    <FileIconComp size={14} style={{ color }} />
                  )}
                  <span className="text-[10px] font-mono text-gray-300 max-w-[100px] truncate">{att.name}</span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button onClick={() => handleDownload(att)} className="p-0.5 text-gray-500 hover:text-blue-400"><DownloadIcon size={10} /></button>
                    <button onClick={() => handleDelete(att)} className="p-0.5 text-gray-500 hover:text-red-400"><TrashIcon size={10} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {error && <p className="text-red-400 text-[10px] font-mono">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PaperclipIcon size={16} style={{ color: wsColor.primary }} />
          <h4 className="text-sm font-mono font-medium" style={{ color: wsColor.primary }}>
            Attachments
          </h4>
          <span className="text-[10px] text-gray-600 font-mono">({attachments.length})</span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-opacity-80 bg-opacity-10'
            : 'border-gray-700 hover:border-opacity-50'
        }`}
        style={{
          borderColor: isDragging ? wsColor.primary : undefined,
          backgroundColor: isDragging ? `rgba(${wsColor.rgb}, 0.05)` : undefined,
        }}
      >
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        {isUploading ? (
          <div className="space-y-2">
            <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)`, borderTopColor: wsColor.primary }} />
            <p className="text-xs font-mono" style={{ color: wsColor.primary }}>Uploading...</p>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden max-w-[200px] mx-auto">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%`, background: `linear-gradient(90deg, ${wsColor.primary}80, ${wsColor.primary})` }} />
            </div>
          </div>
        ) : (
          <>
            <UploadCloudIcon size={24} className={isDragging ? '' : 'text-gray-600'} style={isDragging ? { color: wsColor.primary } : {}} />
            <p className="text-xs font-mono text-gray-500 mt-1">
              {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-[10px] font-mono text-gray-700">Max 50MB per file</p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <XIcon size={12} className="text-red-400" />
          <p className="text-red-400 text-xs font-mono">{error}</p>
        </div>
      )}

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map(att => {
            const FileIconComp = getFileIcon(att.type);
            const color = getFileColor(att.type);
            const isImage = isImageType(att.type);

            return (
              <div
                key={att.id}
                className="group flex items-center gap-3 p-3 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-gray-700 transition-all"
              >
                {/* Thumbnail / Icon */}
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ border: `1px solid ${color}30`, background: `${color}10` }}>
                  {isImage ? (
                    <img
                      src={att.url}
                      alt={att.name}
                      className="w-full h-full object-cover rounded-lg cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setPreviewUrl(att.url); }}
                    />
                  ) : (
                    <FileIconComp size={20} style={{ color }} />
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-white truncate">{att.name}</p>
                  <p className="text-[10px] font-mono text-gray-600">
                    {formatFileSize(att.size)} &middot; {new Date(att.uploadedAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isImage && (
                    <button
                      onClick={() => setPreviewUrl(att.url)}
                      className="p-1.5 text-gray-500 hover:text-white rounded transition-colors"
                      title="Preview"
                    >
                      <ImageIcon size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(att)}
                    className="p-1.5 text-gray-500 hover:text-blue-400 rounded transition-colors"
                    title="Download"
                  >
                    <DownloadIcon size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(att)}
                    className="p-1.5 text-gray-500 hover:text-red-400 rounded transition-colors"
                    title="Delete"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-black border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <XIcon size={16} />
            </button>
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-xl object-contain"
              style={{ border: `1px solid rgba(${wsColor.rgb}, 0.3)`, boxShadow: `0 0 40px rgba(${wsColor.rgb}, 0.15)` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordAttachments;
