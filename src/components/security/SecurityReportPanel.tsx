import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ReportSummary {
  totalAccessLogs: number;
  uniqueIps: number;
  suspiciousCount: number;
  totalNotifications: number;
  totalScans: number;
  cleanScans: number;
  blockedScans: number;
  blocklistCount: number;
  securityScore: number;
  topThreatCount: number;
  recommendationCount: number;
}

interface Report {
  id: string;
  report_id: string;
  report_type: string;
  title: string;
  period_start: string;
  period_end: string;
  status: string;
  summary: ReportSummary;
  report_html?: string;
  generated_by: string;
  emailed_to: string[];
  email_sent_at: string | null;
  created_at: string;
}

interface Schedule {
  id: string;
  schedule_name: string;
  frequency: string;
  is_enabled: boolean;
  recipient_emails: string[];
  last_run_at: string | null;
  next_run_at: string | null;
  created_by: string;
  created_at: string;
}

// Inline SVG Icons
const FileTextIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);
const CalendarIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);
const MailIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
);
const ClockIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const PlusIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const TrashIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);
const EyeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);
const DownloadIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const RefreshIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
);
const XIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const SecurityReportPanel: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'generate' | 'history' | 'schedules'>('generate');
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  // Generate form state
  const [periodDays, setPeriodDays] = useState(7);
  const [reportTitle, setReportTitle] = useState('Security Audit Report');
  const [emailTo, setEmailTo] = useState('');
  const [shouldEmail, setShouldEmail] = useState(false);

  // Schedule form
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [schedName, setSchedName] = useState('Weekly Security Report');
  const [schedFreq, setSchedFreq] = useState('weekly');
  const [schedEmails, setSchedEmails] = useState('');

  const fetchReports = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('generate-security-report', { body: { action: 'list', limit: 50 } });
      if (data?.reports) setReports(data.reports);
    } catch (e) {}
  }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('generate-security-report', { body: { action: 'get_schedules' } });
      if (data?.schedules) setSchedules(data.schedules);
    } catch (e) {}
  }, []);

  useEffect(() => {
    Promise.all([fetchReports(), fetchSchedules()]).then(() => setIsLoading(false));
  }, [fetchReports, fetchSchedules]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    toast.info('Generating security report...', { duration: 3000 });
    try {
      const emailList = shouldEmail && emailTo ? emailTo.split(',').map(e => e.trim()).filter(Boolean) : [];
      const { data } = await supabase.functions.invoke('generate-security-report', {
        body: { action: 'generate', period_days: periodDays, title: reportTitle, email_to: emailList, generated_by: 'admin' }
      });
      if (data?.success) {
        toast.success('Report generated: ' + data.reportId, { duration: 5000 });
        if (emailList.length > 0) toast.success('Report emailed to ' + emailList.length + ' recipient(s)');
        fetchReports();
      } else {
        toast.error('Failed to generate report');
      }
    } catch (e: any) {
      toast.error('Error: ' + (e.message || 'Unknown'));
    }
    setIsGenerating(false);
  };

  const handleViewReport = async (report: Report) => {
    if (report.report_html) {
      setViewingReport(report);
      return;
    }
    try {
      const { data } = await supabase.functions.invoke('generate-security-report', { body: { action: 'get', report_id: report.report_id } });
      if (data?.report) setViewingReport(data.report);
    } catch (e) { toast.error('Failed to load report'); }
  };

  const handleDownloadReport = (report: Report) => {
    if (!report.report_html) return;
    const blob = new Blob([report.report_html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${report.report_id}.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleSaveSchedule = async () => {
    const emails = schedEmails.split(',').map(e => e.trim()).filter(Boolean);
    try {
      const { data } = await supabase.functions.invoke('generate-security-report', {
        body: { action: 'save_schedule', schedule_name: schedName, frequency: schedFreq, recipient_emails: emails, is_enabled: true, created_by: 'admin' }
      });
      if (data?.success) {
        toast.success('Schedule created');
        setShowScheduleForm(false);
        fetchSchedules();
      }
    } catch (e) { toast.error('Failed to create schedule'); }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await supabase.functions.invoke('generate-security-report', { body: { action: 'delete_schedule', id } });
      toast.success('Schedule deleted');
      fetchSchedules();
    } catch (e) { toast.error('Failed to delete'); }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      completed: { bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-400', label: 'COMPLETED' },
      generating: { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400', label: 'GENERATING' },
      failed: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', label: 'FAILED' },
    };
    const s = map[status] || { bg: 'bg-gray-500/10 border-gray-500/30', text: 'text-gray-400', label: status?.toUpperCase() || 'UNKNOWN' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  if (viewingReport) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setViewingReport(null)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 hover:text-white font-mono text-sm">
            <XIcon size={14} /> Back to Reports
          </button>
          <button onClick={() => handleDownloadReport(viewingReport)} className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/40 text-orange-400 rounded-lg hover:bg-orange-500/20 font-mono text-sm">
            <DownloadIcon size={14} /> Download HTML
          </button>
        </div>
        <div className="rounded-xl border border-orange-500/30 bg-black overflow-hidden">
          <iframe srcDoc={viewingReport.report_html || '<p>No content</p>'} className="w-full border-0" style={{ height: '80vh', background: '#000' }} title="Security Report" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileTextIcon size={22} className="text-orange-400" />
            <div>
              <h3 className="text-white font-mono font-bold text-lg">Security Audit Reports</h3>
              <p className="text-gray-500 font-mono text-xs">Generate, schedule, and manage comprehensive security reports</p>
            </div>
          </div>
          <button onClick={() => { fetchReports(); fetchSchedules(); }} className="p-2 text-gray-500 hover:text-orange-400 transition-colors">
            <RefreshIcon size={16} />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-2">
          {[
            { id: 'generate' as const, label: 'Generate Report', icon: <FileTextIcon size={14} /> },
            { id: 'history' as const, label: `Report History (${reports.length})`, icon: <ClockIcon size={14} /> },
            { id: 'schedules' as const, label: `Schedules (${schedules.length})`, icon: <CalendarIcon size={14} /> },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveSubTab(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${activeSubTab === t.id ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400' : 'bg-gray-900/30 border border-gray-800 text-gray-500 hover:text-gray-300'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Tab */}
      {activeSubTab === 'generate' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
            <h4 className="text-white font-mono font-bold mb-4">Report Configuration</h4>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 font-mono text-xs uppercase block mb-1">Report Title</label>
                <input type="text" value={reportTitle} onChange={e => setReportTitle(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500/50" />
              </div>
              <div>
                <label className="text-gray-400 font-mono text-xs uppercase block mb-1">Time Period</label>
                <div className="grid grid-cols-4 gap-2">
                  {[{ d: 1, l: '24h' }, { d: 7, l: '7 Days' }, { d: 14, l: '14 Days' }, { d: 30, l: '30 Days' }].map(p => (
                    <button key={p.d} onClick={() => setPeriodDays(p.d)}
                      className={`px-3 py-2 rounded-lg font-mono text-xs font-bold border transition-all ${periodDays === p.d ? 'bg-orange-500/15 border-orange-500/40 text-orange-400' : 'bg-gray-900/50 border-gray-700 text-gray-500 hover:text-gray-300'}`}>
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={shouldEmail} onChange={e => setShouldEmail(e.target.checked)} className="rounded" />
                  <span className="text-gray-400 font-mono text-xs">Email report to recipients</span>
                </label>
                {shouldEmail && (
                  <input type="text" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="email@example.com, email2@example.com"
                    className="w-full mt-2 bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500/50 placeholder-gray-600" />
                )}
              </div>
              <button onClick={handleGenerate} disabled={isGenerating}
                className="w-full py-3 bg-orange-500/20 border border-orange-500/50 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-all font-mono font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {isGenerating ? (
                  <><RefreshIcon size={16} className="animate-spin" /> Generating Report...</>
                ) : (
                  <><FileTextIcon size={16} /> Generate Security Report</>
                )}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
            <h4 className="text-white font-mono font-bold mb-4">Report Sections</h4>
            <div className="space-y-2">
              {[
                { name: 'Executive Summary', desc: 'Key metrics: access logs, unique IPs, threats, scans', color: 'text-orange-400' },
                { name: 'Top Threat Actors', desc: 'IPs with most suspicious activity + IpInfo geolocation', color: 'text-red-400' },
                { name: 'Attack Timeline', desc: 'Chronological view of critical/high severity events', color: 'text-yellow-400' },
                { name: 'Rate Limit Violations', desc: 'IPs exceeding request thresholds', color: 'text-purple-400' },
                { name: 'File Scan Results', desc: 'Scan statistics by category, clean vs blocked', color: 'text-blue-400' },
                { name: 'Blocklist Activity', desc: 'Currently blocked IPs with reasons and geo data', color: 'text-red-400' },
                { name: 'Recommended Actions', desc: 'AI-generated security recommendations', color: 'text-green-400' },
              ].map((section, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${section.color.replace('text-', 'bg-')}`} />
                  <div className="flex-1">
                    <p className={`font-mono text-sm font-medium ${section.color}`}>{section.name}</p>
                    <p className="text-gray-600 font-mono text-xs">{section.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeSubTab === 'history' && (
        <div className="rounded-xl border border-orange-500/30 bg-black/80 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center"><RefreshIcon size={24} className="text-orange-400 animate-spin mx-auto mb-2" /><p className="text-gray-500 font-mono text-sm">Loading reports...</p></div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center"><FileTextIcon size={32} className="text-gray-700 mx-auto mb-2" /><p className="text-gray-600 font-mono text-sm">No reports generated yet</p></div>
          ) : (
            <div className="divide-y divide-gray-800">
              {reports.map((report) => (
                <div key={report.id} className="p-4 hover:bg-orange-500/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileTextIcon size={18} className="text-orange-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-mono text-sm font-medium truncate">{report.title}</p>
                          {getStatusBadge(report.status)}
                          <span className="text-gray-600 font-mono text-[10px]">{report.report_id}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-gray-500 font-mono text-xs">
                            {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                          </span>
                          <span className="text-gray-600 font-mono text-[10px]">
                            {report.report_type === 'scheduled' ? 'Scheduled' : 'Manual'}
                          </span>
                          {report.email_sent_at && (
                            <span className="flex items-center gap-1 text-green-400/60 font-mono text-[10px]">
                              <MailIcon size={10} /> Emailed
                            </span>
                          )}
                        </div>
                        {report.summary && (
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-orange-400/60 font-mono text-[10px]">{report.summary.totalAccessLogs || 0} logs</span>
                            <span className="text-red-400/60 font-mono text-[10px]">{report.summary.suspiciousCount || 0} suspicious</span>
                            <span className="text-blue-400/60 font-mono text-[10px]">{report.summary.totalScans || 0} scans</span>
                            <span className="text-green-400/60 font-mono text-[10px]">Score: {report.summary.securityScore || 100}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button onClick={() => handleViewReport(report)} className="p-2 text-gray-500 hover:text-orange-400 transition-colors" title="View Report">
                        <EyeIcon size={16} />
                      </button>
                      <button onClick={() => handleDownloadReport(report)} className="p-2 text-gray-500 hover:text-green-400 transition-colors" title="Download">
                        <DownloadIcon size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedules Tab */}
      {activeSubTab === 'schedules' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowScheduleForm(!showScheduleForm)}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/40 text-orange-400 rounded-lg hover:bg-orange-500/20 font-mono text-sm">
              <PlusIcon size={14} /> New Schedule
            </button>
          </div>

          {showScheduleForm && (
            <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
              <h4 className="text-white font-mono font-bold mb-4">Create Report Schedule</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 font-mono text-xs uppercase block mb-1">Schedule Name</label>
                  <input type="text" value={schedName} onChange={e => setSchedName(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500/50" />
                </div>
                <div>
                  <label className="text-gray-400 font-mono text-xs uppercase block mb-1">Frequency</label>
                  <select value={schedFreq} onChange={e => setSchedFreq(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500/50">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-gray-400 font-mono text-xs uppercase block mb-1">Recipient Emails (comma-separated)</label>
                  <input type="text" value={schedEmails} onChange={e => setSchedEmails(e.target.value)} placeholder="admin@example.com, security@example.com"
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500/50 placeholder-gray-600" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveSchedule} className="px-4 py-2 bg-orange-500/20 border border-orange-500/50 text-orange-400 rounded-lg hover:bg-orange-500/30 font-mono text-sm font-bold">
                  Create Schedule
                </button>
                <button onClick={() => setShowScheduleForm(false)} className="px-4 py-2 bg-gray-900 border border-gray-700 text-gray-400 rounded-lg hover:text-white font-mono text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-800 bg-black/80 overflow-hidden">
            {schedules.length === 0 ? (
              <div className="p-12 text-center"><CalendarIcon size={32} className="text-gray-700 mx-auto mb-2" /><p className="text-gray-600 font-mono text-sm">No schedules configured</p></div>
            ) : (
              <div className="divide-y divide-gray-800">
                {schedules.map(sched => (
                  <div key={sched.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CalendarIcon size={18} className={sched.is_enabled ? 'text-green-400' : 'text-gray-600'} />
                      <div>
                        <p className="text-white font-mono text-sm">{sched.schedule_name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-orange-400/70 font-mono text-xs uppercase">{sched.frequency}</span>
                          <span className="text-gray-600 font-mono text-[10px]">{sched.recipient_emails?.length || 0} recipients</span>
                          {sched.next_run_at && <span className="text-gray-500 font-mono text-[10px]">Next: {new Date(sched.next_run_at).toLocaleDateString()}</span>}
                          {sched.last_run_at && <span className="text-green-400/50 font-mono text-[10px]">Last: {new Date(sched.last_run_at).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${sched.is_enabled ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-gray-500/10 text-gray-500 border-gray-600'}`}>
                        {sched.is_enabled ? 'ACTIVE' : 'PAUSED'}
                      </span>
                      <button onClick={() => handleDeleteSchedule(sched.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityReportPanel;
