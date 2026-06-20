import { useEffect, useMemo, useState } from 'react';
import {
  Shield, Bell, Scan, LayoutDashboard, Home, MapPin,
  CheckCircle, XCircle, Clock, LogOut, User, TrendingUp,
  AlertTriangle, X, Calendar, Award, Sun, Moon, AlertCircle, ChevronRight,
} from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme, useT } from '../../ThemeContext';
import { getCleanerDashboard, processScan, updateUserShift, type AppUser, type Alert, type ComplianceData, type Round } from '../../api';

type TabType = 'scan' | 'dashboard' | 'home';
type ScanStatus = 'idle' | 'scanning' | 'verified' | 'error';

type Checkpoint = {
  id: string;
  uid: string;
  location: string;
  area: string;
  zone: string;
  priority: 'high' | 'medium' | 'low' | '';
  status: 'pending' | 'scanning' | 'verified' | 'error';
  scannedAt?: string;
};

interface Props {
  user: AppUser;
  onLogout: () => void;
}

function formatTime(value: string) {
  if (!value) return '—';
  return value;
}

function AlertsPanel({ alerts, onClose }: { alerts: Alert[]; onClose: () => void }) {
  const t = useT();
  return (
    <div className="absolute inset-0 z-30 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className={`w-[85%] max-w-sm h-full shadow-2xl flex flex-col ${t.cardFlat}`}>
        <div className={`flex items-center justify-between px-4 py-4 border-b ${t.border}`}>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-500" />
            <h3 className={`font-semibold ${t.text}`}>Notifications</h3>
            <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">{alerts.length}</span>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-full ${t.hoverRow}`}><X className={`w-4 h-4 ${t.textSm}`} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {alerts.length === 0 ? (
            <div className={`py-8 text-center text-xs ${t.textMuted}`}>No alerts</div>
          ) : (
            alerts.map(a => (
              <div key={a.id} className={`p-3.5 rounded-xl border ${a.type === 'critical' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : a.type === 'warning' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : `${t.surface} ${t.borderGray}`}`}>
                <div className="flex items-start justify-between mb-1.5">
                  <span className={`text-sm font-semibold leading-tight pr-2 ${t.text}`}>{a.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 uppercase ${a.type === 'critical' ? 'bg-red-600 text-white' : a.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}`}>{a.type}</span>
                </div>
                <p className={`text-xs mb-1 ${t.textSm}`}>{a.description}</p>
                <div className={`flex items-center gap-1 text-xs ${t.textMuted}`}><Clock className="w-3 h-3" />{a.time}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StoreHeader({ storeName, alertCount, onAlerts }: { storeName: string; alertCount: number; onAlerts: () => void }) {
  const t = useT();
  return (
    <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${t.header}`}>
      <div>
        <div className={`font-semibold text-sm ${t.text}`}>{storeName}</div>
        <div className={`text-xs ${t.textXs}`}>Live cleaner dashboard</div>
      </div>
      <button onClick={onAlerts} className={`relative w-8 h-8 rounded-full flex items-center justify-center ${t.badge}`}>
        <Bell className="w-4 h-4" />
        {alertCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full text-xs text-white flex items-center justify-center font-bold">{alertCount}</span>}
      </button>
    </div>
  );
}

function ScanTab({ checkpoints, scanStatus, onScan, onAlerts, alertCount, storeName, configuredRounds, completedRounds, allWorkCompleted }: {
  checkpoints: Checkpoint[];
  scanStatus: ScanStatus;
  onScan: () => void;
  onAlerts: () => void;
  alertCount: number;
  storeName: string;
  configuredRounds: number;
  completedRounds: number;
  allWorkCompleted: boolean;
}) {
  const t = useT();
  const scannedCount = checkpoints.filter(c => c.status === 'verified').length;
  const errorCount = checkpoints.filter(c => c.status === 'error').length;
  const pendingCount = checkpoints.filter(c => c.status === 'pending' || c.status === 'scanning').length;
  const compliance = checkpoints.length ? Math.round((scannedCount / checkpoints.length) * 100) : 0;
  const hasConfiguredRounds = configuredRounds > 0;
  const hasCheckpointWork = checkpoints.length > 0;
  const currentRoundComplete = hasCheckpointWork && pendingCount === 0 && errorCount === 0 && scannedCount === checkpoints.length;
  const allDone = allWorkCompleted || (hasConfiguredRounds && completedRounds >= configuredRounds && currentRoundComplete);
  const scanLabel = allDone ? 'ALL DONE' : hasCheckpointWork ? 'TAP TO SCAN' : 'WAITING FOR FIRST SCAN';
  const scanDisabled = scanStatus === 'scanning' || allDone || !hasCheckpointWork;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <StoreHeader storeName={storeName} alertCount={alertCount} onAlerts={onAlerts} />
      <div className={`shrink-0 px-4 pt-3 pb-3 border-b ${t.header} space-y-2`}>
        <div className="flex items-center justify-center gap-5">
          {[
            ['IDLE', 'bg-gray-300 dark:bg-gray-600', 'text-gray-500'],
            ['SCANNING', scanStatus === 'scanning' ? 'bg-orange-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600', scanStatus === 'scanning' ? 'text-orange-500' : t.textMuted],
            ['VERIFIED', scanStatus === 'verified' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600', scanStatus === 'verified' ? 'text-green-600' : t.textMuted],
            ['ERROR', scanStatus === 'error' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600', scanStatus === 'error' ? 'text-red-500' : t.textMuted],
          ].map(([label, dotCls, txtCls]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
              <span className={`text-xs font-semibold tracking-wide ${txtCls}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`shrink-0 flex flex-col items-center gap-4 pt-5 pb-4 px-4 ${t.page}`}>
        <button onClick={onScan} disabled={scanDisabled} className={`w-52 h-52 rounded-full flex items-center justify-center relative transition-all duration-200 select-none shadow-2xl ${scanStatus === 'scanning' ? 'bg-orange-400' : scanStatus === 'verified' ? 'bg-green-500' : scanStatus === 'error' ? 'bg-red-600' : scanDisabled ? 'bg-orange-400' : 'bg-orange-500 hover:bg-orange-400 active:scale-95'}`}>
          <div className="absolute inset-5 rounded-full border-[2px] border-dashed border-white/50 pointer-events-none" />
          {scanStatus === 'scanning' ? (
            <span className="w-14 h-14 border-[5px] border-white border-t-transparent rounded-full animate-spin" />
          ) : scanStatus === 'verified' ? (
            <div className="flex flex-col items-center gap-1"><CheckCircle className="w-16 h-16 text-white" /><span className="text-white font-bold text-sm tracking-widest">VERIFIED</span></div>
          ) : scanStatus === 'error' ? (
            <div className="flex flex-col items-center gap-1"><XCircle className="w-16 h-16 text-white" /><span className="text-white font-bold text-sm tracking-widest">ERROR</span></div>
          ) : (
            <div className="flex flex-col items-center">
              <svg viewBox="0 0 60 60" width="68" height="68" fill="none" className="mb-1">
                <circle cx="30" cy="38" r="6" fill="white" />
                <path d="M18 30 a 14 14 0 0 1 24 0" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M8 22 a 24 24 0 0 1 44 0" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.6" />
              </svg>
              <span className="text-white font-bold text-sm tracking-widest uppercase text-center px-6 leading-tight">{scanLabel}</span>
            </div>
          )}
        </button>

        <div className={`w-full rounded-2xl border shadow-sm overflow-hidden ${t.card}`}>
          <div className={`px-4 py-3 border-b ${t.border}`}>
            <div className={`font-semibold text-sm ${t.text}`}>Current Round</div>
            <div className={`text-xs ${t.textXs}`}>{checkpoints.length} checkpoints</div>
          </div>
          <div className={`divide-y ${t.divide}`}>
            {checkpoints.map((cp, index) => (
              <div key={cp.id} className={`flex items-center gap-3 px-4 py-3 border-b ${t.borderGray}`}>
                <span className={`text-xs w-5 shrink-0 text-center ${t.textMuted}`}>{index + 1}</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${cp.priority === 'high' ? 'bg-red-500' : cp.priority === 'medium' ? 'bg-amber-400' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${t.text}`}>{cp.location}</div>
                  <div className="flex items-center gap-1.5 mt-0.5"><span className={`text-xs font-mono ${t.textMuted}`}>{cp.uid}</span></div>
                </div>
                <div className="shrink-0 text-right">
                  {cp.status === 'pending' && <span className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-gray-600 inline-flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" /></span>}
                  {cp.status === 'scanning' && <span className="w-5 h-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin inline-flex" />}
                  {cp.status === 'verified' && <div className="flex flex-col items-end gap-0.5"><CheckCircle className="w-5 h-5 text-green-500" /><span className={`text-xs ${t.textMuted}`}>{cp.scannedAt}</span></div>}
                  {cp.status === 'error' && <div className="flex flex-col items-end gap-0.5"><XCircle className="w-5 h-5 text-red-500" /><span className="text-xs text-red-400">Error</span></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardTab({ checkpoints, onAlerts, alertCount, storeName, currentRound, completedRounds, complianceHistory, stats }: {
  checkpoints: Checkpoint[];
  onAlerts: () => void;
  alertCount: number;
  storeName: string;
  currentRound?: Round | null;
  completedRounds: Round[];
  complianceHistory: ComplianceData[];
  stats: { today_scans: number; today_compliance: number; active_alerts: number; completed_rounds: number };
}) {
  const t = useT();
  const myComp = stats.today_compliance || 0;
  const myRoundsDone = completedRounds.length;
  const myRoundsTotal = completedRounds.length + (currentRound ? 1 : 0);
  const activeScanned = checkpoints.filter(cp => cp.status === 'verified').length;
  const allRounds = [
    currentRound ? { ...currentRound, isActive: true } : null,
    ...completedRounds.map(r => ({ ...r, isActive: false })),
  ].filter(Boolean) as (Round & { isActive: boolean })[];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <StoreHeader storeName={storeName} alertCount={alertCount} onAlerts={onAlerts} />
      <div className={`flex-1 overflow-y-auto pb-6 ${t.page}`}>
        <div className="px-4 pt-4 space-y-4">
          <div className={`rounded-2xl p-4 border shadow-sm ${t.card}`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${t.textXs}`}>Today's Compliance</h3>
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <ResponsiveContainer width={90} height={90}>
                  <LineChart data={complianceHistory} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Line type="monotone" dataKey="done" stroke="#f97316" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-bold text-orange-500">{myComp}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {[
                  { label: 'All rounds today', val: `${stats.completed_rounds + (currentRound ? 1 : 0)} / ${myRoundsTotal || 1}`, cls: t.text, sub: 'done / planned' },
                  { label: 'My rounds', val: `${myRoundsTotal}`, cls: 'text-orange-500', sub: `${myRoundsDone} done · ${currentRound ? '1 active' : '0 active'}` },
                  { label: 'Store compliance', val: `${myComp}%`, cls: myComp >= 85 ? 'text-green-600' : myComp >= 70 ? 'text-amber-500' : 'text-red-500', sub: 'all staff today' },
                  { label: 'My compliance', val: `${myComp}%`, cls: myComp >= 85 ? 'text-green-600' : myComp >= 70 ? 'text-amber-500' : 'text-orange-500', sub: 'my rounds today' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className={`text-xs ${t.textXs}`}>{s.label}</span>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${s.cls}`}>{s.val}</span>
                      <div className={`text-[10px] ${t.textMuted}`}>{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border shadow-sm overflow-hidden ${t.card}`}>
            <div className={`px-4 py-3 border-b ${t.border} flex items-center gap-2`}>
              <Clock className="w-4 h-4 text-orange-500" />
              <h3 className={`font-semibold text-sm ${t.text}`}>Round Details</h3>
              <span className={`text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 ${t.textXs}`}>{allRounds.length} rounds · newest first</span>
            </div>
            <div className={`divide-y ${t.divide}`}>
              {allRounds.map(round => (
                <div key={round.id}>
                  <div className={`w-full px-4 py-3.5 text-left flex items-start justify-between gap-3 ${t.hoverRow} transition-colors`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm font-semibold ${t.text}`}>{round.name}</span>
                        {round.isActive && <span className="text-xs bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded-full">Active</span>}
                      </div>
                      <div className={`text-xs ${t.textMuted} mb-0.5`}>{round.staff}</div>
                      <div className={`text-xs ${t.textMuted} mb-1.5`}>{round.time}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div className={`h-full ${round.compliance >= 85 ? 'bg-green-500' : round.compliance >= 70 ? 'bg-amber-500' : 'bg-orange-500'} rounded-full`} style={{ width: `${round.compliance}%` }} />
                        </div>
                        <span className={`text-xs font-bold shrink-0 ${round.compliance >= 85 ? 'text-green-600' : round.compliance >= 70 ? 'text-amber-500' : 'text-orange-500'}`}>{round.compliance}% · {round.completedScans}/{round.totalScans}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeTab({ user, storeName, alerts, currentShift, onEditShift, onAlerts, alertCount, complianceHistory, stats }: {
  user: AppUser;
  storeName: string;
  alerts: Alert[];
  currentShift: { start: string; end: string };
  onEditShift: (start: string, end: string) => Promise<void>;
  onAlerts: () => void;
  alertCount: number;
  complianceHistory: ComplianceData[];
  stats: { today_scans: number; today_compliance: number; active_alerts: number; completed_rounds: number };
}) {
  const t = useT();
  const [editingShift, setEditingShift] = useState(false);
  const [shiftStart, setShiftStart] = useState(currentShift.start);
  const [shiftEnd, setShiftEnd] = useState(currentShift.end);
  const avgCompliance = complianceHistory.length ? Math.round(complianceHistory.reduce((s, d) => s + (d.done + d.missed > 0 ? Math.round((d.done / (d.done + d.missed)) * 100) : 0), 0) / complianceHistory.length) : 0;

  useEffect(() => {
    setShiftStart(currentShift.start);
    setShiftEnd(currentShift.end);
  }, [currentShift.start, currentShift.end]);

  const fmt24 = (v: string) => {
    if (!v) return '—';
    const [h, m] = v.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const shiftLabel = `${fmt24(shiftStart)} – ${fmt24(shiftEnd)}`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <StoreHeader storeName={storeName} alertCount={alertCount} onAlerts={onAlerts} />
      <div className={`flex-1 overflow-y-auto pb-6 ${t.page}`}>
        <div className="px-4 pt-4 space-y-4">
          <div className={`rounded-2xl p-4 border shadow-sm ${t.card}`}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-white">{user.name.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-bold ${t.text}`}>{user.name}</div>
                <div className="text-xs text-orange-500 font-medium">Cleaner</div>
                <div className={`text-xs mt-0.5 ${t.textMuted}`}>ID: {user.id}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-xs ${t.textMuted} mb-0.5`}>Shift</div>
                {editingShift ? (
                  <div className="flex flex-col gap-1 items-end">
                    <input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)} className={`w-24 text-xs px-2 py-1 border rounded-lg focus:outline-none focus:border-orange-400 ${t.input}`} />
                    <input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} className={`w-24 text-xs px-2 py-1 border rounded-lg focus:outline-none focus:border-orange-400 ${t.input}`} />
                    <button onClick={async () => { await onEditShift(shiftStart, shiftEnd); setEditingShift(false); }} className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded-lg mt-0.5 hover:bg-orange-600 transition-colors">Save</button>
                  </div>
                ) : (
                  <div>
                    <div className={`text-xs font-medium ${t.textSm}`}>{fmt24(shiftStart)}</div>
                    <div className={`text-xs ${t.textXs}`}>– {fmt24(shiftEnd)}</div>
                    <button onClick={() => setEditingShift(true)} className="text-xs text-orange-500 mt-1 hover:underline">Edit shift</button>
                  </div>
                )}
              </div>
            </div>
            <div className={`grid grid-cols-3 gap-2 mt-4 pt-4 border-t ${t.borderGray}`}>
              {[['Store', storeName], ['Avg Score', `${avgCompliance}%`], ['Active Alerts', `${stats.active_alerts}`]].map(([k, v], i) => (
                <div key={k} className={`text-center ${i === 1 ? `border-x ${t.borderGray}` : ''}`}>
                  <div className={`text-xs ${t.textMuted}`}>{k}</div>
                  <div className={`text-xs font-semibold ${k === 'Avg Score' ? 'text-green-600' : t.textSm}`}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl p-4 border shadow-sm ${t.card}`}>
            <h3 className={`text-sm font-semibold mb-3 ${t.text}`}>Performance Analysis</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Weekly Avg', val: `${avgCompliance}%`, sub: 'compliance', bg: 'bg-yellow-50 border-yellow-100 dark:bg-yellow-900/20' },
                { label: 'Total Scans', val: `${stats.today_scans}`, sub: 'today', bg: 'bg-green-50 border-green-100 dark:bg-green-900/20' },
                { label: 'Today\'s Compliance', val: `${stats.today_compliance}%`, sub: 'completed rounds', bg: t.redLight },
                { label: 'Days Active', val: 'Live', sub: 'this session', bg: 'bg-blue-50 border-blue-100 dark:bg-blue-900/20' },
              ].map(m => (
                <div key={m.label} className={`rounded-xl p-3 border ${m.bg}`}>
                  <div className="flex items-center gap-1.5 mb-1"><Award className="w-4 h-4 text-yellow-500" /><span className={`text-xs ${t.textXs}`}>{m.label}</span></div>
                  <div className={`font-bold ${t.text}`}>{m.val}</div>
                  <div className={`text-xs ${t.textMuted}`}>{m.sub}</div>
                </div>
              ))}
            </div>
            <div className={`text-xs font-medium mb-2 ${t.textSm}`}>This Week's Compliance</div>
            <ResponsiveContainer width="100%" height={75}>
              <LineChart data={complianceHistory} margin={{ top: 0, right: 5, left: -35, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ background: t.isDark ? '#1f2937' : '#fff', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 10 }} />
                <Line type="monotone" dataKey="done" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CleanerApp({ user, onLogout }: Props) {
  const { isDark, toggle } = useTheme();
  const t = useT();
  const [activeTab, setActiveTab] = useState<TabType>('scan');
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getCleanerDashboard>> | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getCleanerDashboard(user.id)
      .then(setDashboard)
      .catch(() => setDashboard(null));
  }, [user.id, refreshKey]);

  const checkpoints = useMemo<Checkpoint[]>(() => {
    const current = dashboard?.current_round?.checkpointItems || [];
    return current.map((cp, index) => ({
      id: cp.id || `${index}`,
      uid: cp.uid || '',
      location: cp.location || '',
      area: '',
      zone: cp.zone || '',
      priority: 'medium',
      status: (cp.status === 'verified' ? 'verified' : cp.status === 'error' ? 'error' : cp.status === 'missed' ? 'error' : 'pending'),
      scannedAt: cp.scannedAt,
    }));
  }, [dashboard]);

  const nextCheckpoint = checkpoints.find(cp => cp.status === 'pending');
  const storeName = dashboard?.store ? `${dashboard.store.name} ${dashboard.store.storeNumber}` : 'CleanCheck';
  const alertCount = dashboard?.alerts.length ?? 0;
  const configuredRounds = dashboard?.stats.configured_rounds ?? dashboard?.store?.dailyRounds ?? 0;
  const completedRounds = dashboard?.stats.completed_rounds ?? dashboard?.completed_rounds.length ?? 0;
  const completedRoundItems = dashboard?.completed_rounds ?? [];
  const allCompletedRoundsHaveRequiredScans = completedRoundItems.length > 0
    && completedRoundItems.every(round => round.totalScans > 0 && round.completedScans >= round.totalScans);
  const allWorkCompleted = configuredRounds > 0
    && completedRounds >= configuredRounds
    && allCompletedRoundsHaveRequiredScans;

  const handleScan = async () => {
    if (!dashboard?.store || !nextCheckpoint || scanStatus === 'scanning') return;
    setScanStatus('scanning');
    try {
      const position = await new Promise<{ lat: number; lon: number }>((resolve) => {
        window.navigator.geolocation?.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          () => resolve({ lat: 0, lon: 0 }),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });

      const result = await processScan({
        nfc_tag_uid: nextCheckpoint.uid,
        device_timestamp: new Date().toISOString(),
        gps_lat: position.lat,
        gps_lon: position.lon,
        gps_accuracy: 15,
        shift_date: new Date().toISOString().split('T')[0],
        employee_id: user.id,
        employee_name: user.name,
        store_id: dashboard.store.id,
      });

      setScanStatus(result.status === 'success' ? 'verified' : 'error');
      setRefreshKey(v => v + 1);
      setTimeout(() => setScanStatus('idle'), 1200);
    } catch {
      setScanStatus('error');
      setTimeout(() => setScanStatus('idle'), 1200);
    }
  };

  const editShift = async (start: string, end: string) => {
    await updateUserShift(user.id, start, end);
    setRefreshKey(v => v + 1);
  };

  return (
    <div className={`min-h-screen flex flex-col max-w-md mx-auto relative overflow-hidden ${t.surface}`}>
      <div className={`px-4 pt-10 pb-3 flex items-center justify-between shrink-0 border-b ${t.header}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className={`font-semibold text-sm ${t.text}`}>CleanCheck</div>
            <div className={`text-xs ${t.textXs}`}>NFC Compliance</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">ONLINE</span>
          </div>
          <button onClick={toggle} className={`w-8 h-8 rounded-full flex items-center justify-center ${t.badge} hover:opacity-80 transition-opacity`} title="Toggle theme">
            {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-500" />}
          </button>
          <button onClick={onLogout} className={`w-8 h-8 rounded-full flex items-center justify-center ${t.badge} hover:opacity-80 transition-opacity`}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'scan' && (
          <ScanTab
            checkpoints={checkpoints}
            scanStatus={scanStatus}
            onScan={handleScan}
            onAlerts={() => setAlertsOpen(true)}
            alertCount={alertCount}
            storeName={storeName}
            configuredRounds={configuredRounds}
            completedRounds={completedRounds}
            allWorkCompleted={allWorkCompleted}
          />
        )}
        {activeTab === 'dashboard' && dashboard && <DashboardTab checkpoints={checkpoints} onAlerts={() => setAlertsOpen(true)} alertCount={alertCount} storeName={storeName} currentRound={dashboard.current_round} completedRounds={dashboard.completed_rounds} complianceHistory={dashboard.compliance_history} stats={dashboard.stats} />}
        {activeTab === 'home' && dashboard && <HomeTab user={user} storeName={storeName} alerts={dashboard.alerts} currentShift={{ start: user.shiftStart || '06:00', end: user.shiftEnd || '14:00' }} onEditShift={editShift} onAlerts={() => setAlertsOpen(true)} alertCount={alertCount} complianceHistory={dashboard.compliance_history} stats={dashboard.stats} />}
      </div>

      <div className={`flex shrink-0 border-t ${t.tabBar}`}>
        {[
          { id: 'scan' as const, label: 'Scan', Icon: Scan },
          { id: 'dashboard' as const, label: 'Dashboard', Icon: LayoutDashboard },
          { id: 'home' as const, label: 'Home', Icon: Home },
        ].map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${activeTab === id ? 'text-orange-500' : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      {alertsOpen && dashboard && <AlertsPanel alerts={dashboard.alerts} onClose={() => setAlertsOpen(false)} />}
    </div>
  );
}
