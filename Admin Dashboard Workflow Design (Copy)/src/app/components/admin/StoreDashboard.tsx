import { useEffect, useState } from 'react';
import { ChevronLeft, CheckCircle, XCircle, AlertCircle, ChevronRight, FileText, X, Clock } from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import { ReportModal } from '../shared/ReportModal';
import { useT } from '../../ThemeContext';
import { loadStoreView, type Store } from '../../api';

interface Props {
  storeId: string;
  goBack: () => void;
  navigate: (view: string, params?: Record<string, unknown>) => void;
}

function formatTime(time: string): string {
  return time || '—';
}

function formatDetailTime(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function ScanLogModal({ round, onClose }: { round: Store['rounds'][number]; onClose: () => void }) {
  const t = useT();
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className={`w-full rounded-t-2xl max-h-[80vh] flex flex-col ${t.cardFlat}`}>
        <div className={`flex items-center justify-between px-4 py-4 border-b ${t.border}`}>
        <div>
            <h3 className={`font-semibold ${t.text}`}>Round {round.roundNumber ?? '—'} · {round.name}</h3>
            <p className={`text-xs ${t.textXs}`}>
              Completed by {round.completedBy ?? round.staff ?? '—'} · {formatDetailTime(round.completionTime ?? round.time ?? null)} · {round.compliance}% compliance
            </p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-full ${t.hoverRow}`}><X className={`w-4 h-4 ${t.textSm}`} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {round.scans.map(scan => (
            <div key={scan.id} className={`flex items-center justify-between p-3 rounded-xl border ${
              scan.status === 'verified' ? 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800' :
              scan.status === 'missed' ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800' :
              `${t.surface} ${t.borderGray}`
            }`}>
              <div className="flex items-center gap-3">
                {scan.status === 'verified' && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                {scan.status === 'missed' && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                {scan.status === 'pending' && <AlertCircle className={`w-4 h-4 shrink-0 ${t.textMuted}`} />}
                <div>
                  <div className={`text-sm font-medium ${t.text}`}>{scan.location}</div>
                  <div className={`text-xs font-mono ${t.textMuted}`}>NFC: {scan.nfcUid}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs ${t.textSm}`}>{formatTime(scan.time)}</div>
                <div className={`text-xs font-medium capitalize ${scan.status === 'verified' ? 'text-green-600' : scan.status === 'missed' ? 'text-red-600' : t.textMuted}`}>{scan.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StoreDashboard({ storeId, goBack, navigate }: Props) {
  const t = useT();
  const [store, setStore] = useState<Store | null>(null);
  const [activeRound, setActiveRound] = useState<Store['rounds'][number] | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    loadStoreView(storeId)
      .then(setStore)
      .catch(() => setStore(null));
  }, [storeId]);

  if (!store) {
    return <div className={`flex-1 overflow-y-auto pb-6 ${t.page}`} />;
  }

  const tagStatusCount = {
    active: store.tags.filter(tag => tag.status === 'active').length,
    pending: store.tags.filter(tag => tag.status === 'pending' || tag.status === 'unassigned').length,
    error: store.tags.filter(tag => tag.status === 'error' || tag.status === 'warning').length,
  };
  const nfcDetailsToShow = store.nfcDetails.length > 0
    ? store.nfcDetails
    : store.tags.map(tag => ({
        id: tag.id,
        name: tag.location || tag.uid,
        requiredScanCount: store.dailyRounds ?? store.rounds.length ?? 0,
        completedScanCount: tag.lastScanned ? 1 : 0,
        checkpointNames: tag.location ? [tag.location] : [tag.uid],
        lastScanTime: tag.lastScanned ?? null,
        status: tag.lastScanned ? 'completed' as const : 'pending' as const,
      }));

  const pieData = [
    { value: store.compliance, color: '#dc2626' },
    { value: 100 - store.compliance, color: '#fca5a5' },
  ];

  return (
    <div className={`flex-1 overflow-y-auto pb-6 ${t.page}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${t.header}`}>
        <div className="flex items-center gap-3">
          <button onClick={goBack} className={`p-1.5 rounded-full ${t.hoverRow}`}>
            <ChevronLeft className="w-5 h-5 text-red-600" />
          </button>
          <div>
            <h2 className={`font-semibold text-sm ${t.text}`}>{store.name} {store.storeNumber}</h2>
            <p className={`text-xs ${t.textXs}`}>{store.location}</p>
          </div>
        </div>
        <button onClick={() => setShowReport(true)} className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 dark:bg-red-900/30 px-3 py-1.5 rounded-full">
          <FileText className="w-3.5 h-3.5" /> Report
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className={`rounded-2xl p-4 border shadow-sm ${t.card}`}>
          <h3 className={`font-semibold text-sm mb-3 ${t.text}`}>Compliance Analysis</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0">
              <PieChart width={80} height={80}>
                <Pie data={pieData} cx={35} cy={35} innerRadius={28} outerRadius={38} startAngle={90} endAngle={-270} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-red-600">{store.compliance}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs"><span className={t.textXs}>Green - On Track</span><span className="font-medium text-green-600">≥85%</span></div>
              <div className="flex items-center justify-between text-xs"><span className={t.textXs}>Amber - At Risk</span><span className="font-medium text-amber-600">70-84%</span></div>
              <div className="flex items-center justify-between text-xs"><span className={t.textXs}>Red - Critical</span><span className="font-medium text-red-600">&lt;70%</span></div>
              <div className={`flex items-center justify-between text-xs pt-1 border-t ${t.borderGray}`}>
                <span className={t.textXs}>Active Alerts</span>
                <button onClick={() => navigate('storewise-alerts', { storeId })} className="font-medium text-red-600 flex items-center gap-0.5">
                  {store.activeAlerts} <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border shadow-sm overflow-hidden ${t.card}`}>
          <div className={`px-4 py-3 border-b ${t.border} flex items-center justify-between`}>
            <h3 className={`font-semibold text-sm ${t.text}`}>NFC Progress</h3>
            <div className="flex gap-2 text-xs">
              <span className="text-green-600">{tagStatusCount.active} active</span>
              <span className="text-amber-500">{tagStatusCount.pending} pending</span>
              {tagStatusCount.error > 0 && <span className="text-red-500">{tagStatusCount.error} error</span>}
            </div>
          </div>
          <div className={`divide-y ${t.divide}`}>
            {nfcDetailsToShow.map(detail => (
              <div key={detail.id} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`text-sm font-medium ${t.text}`}>{detail.name}</div>
                    <div className={`text-xs ${t.textMuted}`}>Required scans: {detail.requiredScanCount}</div>
                    <div className={`text-xs ${t.textSm}`}>Completed scans: {detail.completedScanCount}</div>
                    <div className={`text-xs mt-1 ${t.textMuted}`}>Checkpoints:</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {detail.checkpointNames.map(name => (
                        <span key={name} className="text-[11px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300">
                          {name}
                        </span>
                      ))}
                    </div>
                    <div className={`text-xs mt-2 ${t.textXs}`}>Last scan: {formatDetailTime(detail.lastScanTime)}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${detail.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                    {detail.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border shadow-sm overflow-hidden ${t.card}`}>
          <div className={`px-4 py-3 border-b ${t.border}`}>
            <h3 className={`font-semibold text-sm ${t.text}`}>Round Details</h3>
            <p className={`text-xs ${t.textXs}`}>Tap a round to view scan log</p>
          </div>
          {store.rounds.length === 0 ? (
            <div className={`px-4 py-8 text-center text-sm ${t.textMuted}`}>No rounds yet.</div>
          ) : (
            store.rounds.map((round, i) => (
              <button key={round.id} onClick={() => setActiveRound(round)} className={`w-full px-4 py-4 flex items-center justify-between ${t.hoverRow} text-left transition-colors ${i > 0 ? `border-t ${t.borderGray}` : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white ${round.compliance >= 85 ? 'bg-green-500' : round.compliance >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}>
                    {round.roundNumber ?? i + 1}
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${t.text}`}>Round {round.roundNumber ?? i + 1}</div>
                    <div className={`text-xs ${t.textXs}`}>{round.name}</div>
                    <div className={`text-xs mt-0.5 ${t.textMuted}`}>Completed by {round.completedBy ?? round.staff ?? '—'}</div>
                    <div className={`flex items-center gap-1 text-xs mt-0.5 ${t.textMuted}`}>
                      <Clock className="w-3 h-3" />
                      {formatDetailTime(round.completionTime ?? round.time ?? null)}
                    </div>
                    <div className={`text-xs mt-0.5 ${t.textXs}`}>{round.completedScans}/{round.totalScans} scans · {round.status ?? 'pending'}</div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 ${t.textMuted}`} />
              </button>
            ))
          )}
        </div>
      </div>

      {activeRound && <ScanLogModal round={activeRound} onClose={() => setActiveRound(null)} />}
      {showReport && (
        <ReportModal
          title={`${store.name} ${store.storeNumber}`}
          context={`Compliance: ${store.compliance}% · ${store.nfcCount} NFC tags`}
          storeId={store.id}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
