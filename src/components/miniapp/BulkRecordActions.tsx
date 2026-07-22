import React, { useState, useRef } from 'react';
import {
  TrashIcon, EditIcon, CloseIcon, CheckIcon,
} from '@/components/icons/Icons';

// Inline printer icon
const PrinterIcon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 16, className = '', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <polyline points="6,9 6,2 18,2 18,9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

interface BulkRecordActionsProps {
  selectedRecords: Array<Record<string, any>>;
  columns: string[];
  onMassEdit: (fieldName: string, newValue: string) => Promise<void>;
  onMassDelete: () => Promise<void>;
  onClearSelection: () => void;
  wsColor: { primary: string; rgb: string };
  appName: string;
}

const BulkRecordActions: React.FC<BulkRecordActionsProps> = ({
  selectedRecords, columns, onMassEdit, onMassDelete, onClearSelection, wsColor: wc, appName,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editField, setEditField] = useState(columns[0] || '');
  const [editValue, setEditValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  const count = selectedRecords.length;
  if (count === 0) return null;

  // Mass Edit
  const handleMassEdit = async () => {
    if (!editField) return;
    setIsProcessing(true);
    try {
      await onMassEdit(editField, editValue);
      setShowEditModal(false);
      setEditValue('');
    } catch (err) {
      console.error('Mass edit error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Mass Delete
  const handleMassDelete = async () => {
    setIsProcessing(true);
    try {
      await onMassDelete();
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Mass delete error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Mass Print
  const handleMassPrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${appName} - ${count} Records</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; color: #1a1a1a; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .meta { font-size: 11px; color: #666; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f0f0f0; text-align: left; padding: 6px 8px; border: 1px solid #ccc; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
          td { padding: 5px 8px; border: 1px solid #ddd; }
          tr:nth-child(even) { background: #fafafa; }
          .record-card { border: 1px solid #ccc; border-radius: 6px; padding: 12px; margin-bottom: 12px; page-break-inside: avoid; }
          .record-card h3 { font-size: 14px; margin: 0 0 8px 0; border-bottom: 1px solid #eee; padding-bottom: 4px; }
          .record-card .field { display: flex; gap: 8px; margin-bottom: 4px; font-size: 12px; }
          .record-card .field-label { font-weight: 600; min-width: 100px; color: #555; }
          .record-card .field-value { color: #111; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${appName}</h1>
        <div class="meta">${count} record${count > 1 ? 's' : ''} &bull; Printed ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
        
        ${count <= 20 ? `
          <!-- Card view for smaller sets -->
          ${selectedRecords.map(record => `
            <div class="record-card">
              <h3>${record.name || record.id || 'Record'}</h3>
              ${columns.map(col => `
                <div class="field">
                  <span class="field-label">${col}:</span>
                  <span class="field-value">${record[col] ?? ''}</span>
                </div>
              `).join('')}
            </div>
          `).join('')}
        ` : `
          <!-- Table view for larger sets -->
          <table>
            <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
            <tbody>
              ${selectedRecords.map(record => `
                <tr>${columns.map(col => `<td>${record[col] ?? ''}</td>`).join('')}</tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </body>
      </html>
    `;

    // Use hidden iframe for printing
    let iframe = printFrameRef.current;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      document.body.appendChild(iframe);
      printFrameRef.current = iframe;
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printContent);
      doc.close();
      setTimeout(() => {
        iframe?.contentWindow?.print();
      }, 250);
    }
  };

  return (
    <>
      {/* Floating bulk action bar */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[55] flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-2xl backdrop-blur-xl"
        style={{
          background: 'rgba(0,0,0,0.9)',
          borderColor: `rgba(${wc.rgb}, 0.4)`,
          boxShadow: `0 0 30px rgba(${wc.rgb}, 0.15), 0 8px 32px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Count */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/10">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold font-mono" style={{ background: `rgba(${wc.rgb}, 0.2)`, color: wc.primary }}>
            {count}
          </div>
          <span className="text-sm font-medium text-white font-mono">record{count > 1 ? 's' : ''}</span>
        </div>

        {/* Mass Edit */}
        <button
          onClick={() => setShowEditModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-all"
          style={{ color: wc.primary }}
          onMouseEnter={e => { e.currentTarget.style.background = `rgba(${wc.rgb}, 0.15)`; }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; }}
        >
          <EditIcon size={14} />
          Mass Edit
        </button>

        {/* Mass Print */}
        <button
          onClick={handleMassPrint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-all"
          style={{ color: wc.primary }}
          onMouseEnter={e => { e.currentTarget.style.background = `rgba(${wc.rgb}, 0.15)`; }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; }}
        >
          <PrinterIcon size={14} />
          Mass Print
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-white/10" />

        {/* Mass Delete */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
        >
          <TrashIcon size={14} />
          Mass Delete
        </button>

        {/* Clear */}
        <button
          onClick={onClearSelection}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          title="Clear Selection"
        >
          <CloseIcon size={14} />
        </button>
      </div>

      {/* ─── Mass Edit Modal ─── */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-black/95 backdrop-blur-2xl rounded-xl w-full max-w-md mx-4 overflow-hidden" style={{ border: `1px solid rgba(${wc.rgb}, 0.4)`, boxShadow: `0 0 40px rgba(${wc.rgb}, 0.15)` }}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <EditIcon size={18} style={{ color: wc.primary }} />
                  <h3 className="text-white font-semibold font-mono">Mass Edit {count} Record{count > 1 ? 's' : ''}</h3>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-1 text-slate-500 hover:text-white"><CloseIcon size={18} /></button>
              </div>

              <p className="text-xs text-slate-400 font-mono mb-4">
                Set a new value for a field across all {count} selected record{count > 1 ? 's' : ''}.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 font-mono mb-1 uppercase">Field to update</label>
                  <select
                    value={editField}
                    onChange={(e) => setEditField(e.target.value)}
                    className="w-full bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none"
                    style={{ borderColor: `rgba(${wc.rgb}, 0.3)` }}
                  >
                    {columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 font-mono mb-1 uppercase">New value</label>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none"
                    style={{ borderColor: `rgba(${wc.rgb}, 0.3)` }}
                    placeholder="Enter new value..."
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 font-mono text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMassEdit}
                  disabled={isProcessing || !editField}
                  className="flex-1 py-2 rounded-lg font-mono text-sm font-medium transition-all disabled:opacity-40"
                  style={{ background: wc.primary, color: '#000' }}
                >
                  {isProcessing ? 'Updating...' : `Update ${count} Record${count > 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Mass Delete Confirmation ─── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-black/95 backdrop-blur-2xl rounded-xl w-full max-w-sm mx-4 overflow-hidden border border-red-500/40 shadow-2xl">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                  <TrashIcon size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold font-mono">Delete {count} Record{count > 1 ? 's' : ''}?</h3>
                  <p className="text-[10px] text-slate-500 font-mono">This action cannot be undone</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15 mb-4">
                <p className="text-xs text-slate-300 font-mono">
                  You are about to permanently delete <span className="text-red-400 font-bold">{count}</span> record{count > 1 ? 's' : ''} from <span className="text-white font-bold">{appName}</span>. All data in these records will be lost.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 font-mono text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMassDelete}
                  disabled={isProcessing}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-mono text-sm font-medium transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Deleting...' : `Delete ${count}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkRecordActions;
