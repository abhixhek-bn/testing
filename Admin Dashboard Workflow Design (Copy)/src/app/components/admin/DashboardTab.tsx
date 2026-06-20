import { useEffect, useState } from 'react';
import {
  ChevronDown,
  AlertTriangle,
  Cpu,
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  MapPin,
  Copy,
  TrendingDown,
} from 'lucide-react';
import { ReportModal } from '../shared/ReportModal';
import { useT } from '../../ThemeContext';
import { getGlobalDashboard, loadStoreView, type ComplianceData, type Round, type Store, type StoreSummary } from '../../api';

interface Props {
  navigate: (view: string, params?: Record<string, unknown>) => void;
}

type GridSelection = 'alerts' | 'nfc' | 'compliance' | null;

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

function roundStatusTone(status?: string | null) {
  if (status === 'completed') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (status === 'active') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
}

function parseTime(t: string): number {
  if (!t || t === '—') return 0;
  const parts = t.split(' ');
  if (parts.length < 2) return 0;
  const [timePart, meridiem] = parts;
  let [h, m] = timePart.split(':').map(Number);
  if (meridiem === 'PM' && h !== 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

const alertBadge: Record<string, string> = {
  critical: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  fraud: 'bg-orange-600 text-white',
};

const alertCategoryLabel: Record<string, string> = {
  'missing-round': 'Missing Round',
  'duplicate-scan': 'Duplicate Scan',
  'gps-mismatch': 'GPS Mismatch',
  'low-compliance': 'Low Compliance',
  'too-quick': 'Round Too Quick',
};

const alertCategoryIcon = (category: string, size = 'w-4 h-4') => {
  if (category === 'missing-round') return <AlertTriangle className={`${size} text-red-500`} />;
  if (category === 'duplicate-scan') return <Copy className={`${size} text-amber-500`} />;
  if (category === 'gps-mismatch') return <MapPin className={`${size} text-orange-500`} />;
  if (category === 'too-quick') return <Clock className={`${size} text-amber-500`} />;
  return <TrendingDown className={`${size} text-amber-500`} />;
};

function StoreAlertDetail({ store, onBack }: { store: Store; onBack: () => void }) {
  const t = useT();
  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${t.card}`}>
      <button onClick={onBack} className={`w-full flex items-center gap-2 px-4 py-3 border-b ${t.border} ${t.hoverRow} transition-colors`}>
        <ChevronDown className="w-4 h-4 text-orange-500 shrink-0 rotate-90" />
        <span className="text-xs font-medium text-orange-500">Back to All Stores</span>
      </button>
      <div className={`px-4 py-3 border-b ${t.border} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h3 className={`font-semibold text-sm ${t.text}`}>{store.name} {store.storeNumber}</h3>
        </div>
        <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-full">{store.alerts.length}</span>
      </div>
      {store.alerts.length === 0 ? (
        <div className={`px-4 py-8 text-center text-xs ${t.textMuted}`}>No alerts for this store</div>
      ) : (
        <div className={`divide-y ${t.divide}`}>
          {[...store.alerts].reverse().map(a => (
            <div key={a.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className={`text-sm font-medium leading-tight ${t.text}`}>{a.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium uppercase ${alertBadge[a.type]}`}>{a.type}</span>
              </div>
              <p className={`text-xs ${t.textSm} mb-1`}>{a.description}</p>
              {a.location && <p className={`text-xs ${t.textMuted}`}>{a.location}</p>}
              <p className={`text-xs ${t.textXs} mt-0.5`}>{a.time}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AllStoresBreakdown({ selection, stores, onStoreClick }: { selection: GridSelection; stores: StoreSummary[]; onStoreClick: (storeId: string) => void }) {
  const t = useT();
  if (!selection) return null;

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${t.card}`}>
      <div className={`px-4 py-3 border-b ${t.border} flex items-center gap-2`}>
        {selection === 'alerts' && <AlertTriangle className="w-4 h-4 text-red-500" />}
        {selection === 'nfc' && <Cpu className="w-4 h-4 text-red-500" />}
        {selection === 'compliance' && <TrendingUp className="w-4 h-4 text-red-500" />}
        <h3 className={`font-semibold text-sm ${t.text}`}>
          {selection === 'alerts' && 'Total Alerts — Per Store'}
          {selection === 'nfc' && 'Total NFC Tags — Per Store'}
          {selection === 'compliance' && 'Compliance — Per Store'}
        </h3>
      </div>
      <div className={`divide-y ${t.divide}`}>
        {stores.map(store => {
          const value = selection === 'alerts' ? store.activeAlerts : selection === 'nfc' ? store.nfcCount : store.compliance;
          const maxValue = selection === 'alerts'
            ? Math.max(...stores.map(x => x.activeAlerts), 1)
            : selection === 'nfc'
              ? Math.max(...stores.map(x => x.nfcCount), 1)
              : 100;
          const barColor = selection === 'compliance'
            ? store.compliance >= 85 ? 'bg-green-500' : store.compliance >= 70 ? 'bg-amber-500' : 'bg-red-500'
            : 'bg-red-500';
          const subLabel = selection === 'alerts'
            ? (value === 1 ? 'alert' : 'alerts')
            : selection === 'nfc'
              ? (value === 1 ? 'tag' : 'tags')
              : value >= 85
                ? 'On Track'
                : value >= 70
                  ? 'At Risk'
                  : 'Critical';

          return (
            <button key={store.id} onClick={() => selection === 'alerts' && onStoreClick(store.id)} className={`w-full px-4 py-3.5 text-left ${selection === 'alerts' ? t.hoverRow : ''} transition-colors`}>
              <div className="flex items-center justify-between mb-2">
                <div className="min-w-0">
                  <span className={`text-sm font-medium ${t.text}`}>{store.name} {store.storeNumber}</span>
                  <span className={`text-xs ml-2 ${t.textMuted}`}>{store.location}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-sm font-bold ${t.text}`}>{selection === 'compliance' ? `${value}%` : value}</span>
                  <span className={`text-xs ${t.textMuted}`}>{subLabel}</span>
                  {selection === 'alerts' && <ChevronRight className={`w-3.5 h-3.5 ${t.textMuted}`} />}
                </div>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${(value / maxValue) * 100}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardTab({ navigate }: Props) {
  const t = useT();
  const [globalData, setGlobalData] = useState<Awaited<ReturnType<typeof getGlobalDashboard>> | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectedGrid, setSelectedGrid] = useState<GridSelection>('compliance');
  const [storeDrillId, setStoreDrillId] = useState<string | null>(null);
  const [storeDrill, setStoreDrill] = useState<Store | null>(null);

  useEffect(() => {
    getGlobalDashboard()
      .then(setGlobalData)
      .catch(() => setGlobalData(null));
  }, []);

  useEffect(() => {
    if (!selectedStoreId) {
      setSelectedStore(null);
      return;
    }
    loadStoreView(selectedStoreId)
      .then(setSelectedStore)
      .catch(() => setSelectedStore(null));
  }, [selectedStoreId]);

  useEffect(() => {
    if (!storeDrillId) {
      setStoreDrill(null);
      return;
    }
    loadStoreView(storeDrillId)
      .then(setStoreDrill)
      .catch(() => setStoreDrill(null));
  }, [storeDrillId]);

  const storeSummaries = globalData?.stores ?? [];
  const activeStore = selectedStore;
  const staleTime = activeStore?.lastSync && activeStore.lastSync !== 'just now' ? activeStore.lastSync : null;
  const staleStores = !activeStore ? storeSummaries.filter(s => s.lastSync && s.lastSync !== 'just now') : [];

  const displayAlerts = activeStore ? activeStore.activeAlerts : globalData?.stats.alerts ?? 0;
  const displayNFCs = activeStore ? activeStore.nfcCount : globalData?.stats.tags ?? 0;
  const displayCompliance = activeStore ? activeStore.compliance : globalData?.stats.compliance ?? 0;

  const toggleGrid = (grid: GridSelection) => setSelectedGrid(prev => (prev === grid ? null : grid));

  const selectedStoreAlerts = activeStore?.alerts ?? [];
  const selectedStoreRounds = activeStore?.rounds ?? [];
  const selectedStoreTags = activeStore?.tags ?? [];
  const selectedStoreNfcDetails = activeStore?.nfcDetails ?? [];
  const nfcDetailsToShow = selectedStoreNfcDetails.length > 0
    ? selectedStoreNfcDetails
    : selectedStoreTags.map(tag => ({
        id: tag.id,
        name: tag.location || tag.uid,
        requiredScanCount: activeStore?.dailyRounds ?? selectedStoreRounds.length ?? 0,
        completedScanCount: 0,
        checkpointNames: tag.location ? [tag.location] : [tag.uid],
        lastScanTime: tag.lastScanned ?? null,
        status: 'pending' as const,
      }));

  return (
    <div className={`flex-1 overflow-y-auto pb-6 ${t.page}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${t.header}`}>
        <span className={`text-xs ${t.textXs}`}>
          {activeStore ? `${activeStore.name} ${activeStore.storeNumber}` : `${storeSummaries.length} stores · Live overview`}
        </span>
        <button onClick={() => setShowReport(true)} className="flex items-center gap-1.5 text-xs text-orange-500 font-medium bg-orange-50 dark:bg-orange-900/30 px-3 py-1.5 rounded-full">
          <FileText className="w-3.5 h-3.5" /> Generate Report
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 border-2 rounded-xl text-sm font-medium transition-colors ${
              selectedStoreId ? 'border-orange-400' : 'border-orange-200'
            } ${t.cardFlat} ${t.text}`}
          >
            <span>{activeStore ? `${activeStore.name} ${activeStore.storeNumber}` : 'All Stores — Overview'}</span>
            <ChevronDown className={`w-4 h-4 text-red-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className={`absolute top-full left-0 right-0 mt-1 border rounded-xl shadow-xl z-20 overflow-hidden ${t.card}`}>
              <button
                onClick={() => { setSelectedStoreId(''); setSelectedGrid('compliance'); setDropdownOpen(false); }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${t.hoverRow} ${!selectedStoreId ? 'text-orange-500 font-medium' : t.text}`}
              >
                All Stores — Overview
              </button>
              {storeSummaries.map(store => (
                <button
                  key={store.id}
                  onClick={() => { setSelectedStoreId(store.id); setSelectedGrid('compliance'); setDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm border-t ${t.borderGray} ${t.hoverRow} transition-colors ${selectedStoreId === store.id ? 'text-orange-500 font-medium' : t.text}`}
                >
                  <div className="font-medium">{store.name} {store.storeNumber}</div>
                  <div className={`text-xs ${t.textMuted}`}>{store.location}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {staleTime && (
          <div className="flex items-start gap-3 bg-red-600 rounded-2xl p-4 text-white">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">No Scan Activity — {staleTime}</p>
              <p className="text-xs text-red-100 mt-0.5">No scan has been recorded at this store for over 60 consecutive minutes. Immediate action required.</p>
            </div>
          </div>
        )}

        {staleStores.map(store => (
          <div key={store.id} className="flex items-start gap-3 bg-red-600 rounded-2xl p-4 text-white">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">{store.name} {store.storeNumber} — No Scan Activity</p>
              <p className="text-xs text-red-100 mt-0.5">
                No scan recorded for <span className="font-semibold">{store.lastSync}</span>. Immediate action required.
              </p>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => toggleGrid('alerts')} className={`rounded-2xl p-3 border-2 shadow-sm text-left transition-colors ${t.hoverRow} ${selectedGrid === 'alerts' ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : `border-transparent ${t.card}`}`}>
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-500">{displayAlerts}</div>
            <div className={`text-xs leading-tight ${t.textXs}`}>Total Alerts</div>
          </button>

          <button onClick={() => toggleGrid('compliance')} className={`rounded-2xl p-3 border-2 shadow-sm text-left transition-colors ${t.hoverRow} ${selectedGrid === 'compliance' ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : `border-transparent ${t.card}`}`}>
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
            </div>
            <div className={`text-2xl font-bold ${t.text}`}>{displayCompliance}%</div>
            <div className={`text-xs leading-tight ${t.textXs}`}>Compliance</div>
            <div className="text-xs text-green-600 mt-1">Live data</div>
          </button>

          <button onClick={() => toggleGrid('nfc')} className={`rounded-2xl p-3 border-2 shadow-sm text-left transition-colors ${t.hoverRow} ${selectedGrid === 'nfc' ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : `border-transparent ${t.card}`}`}>
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-2">
              <Cpu className="w-4 h-4 text-orange-500" />
            </div>
            <div className={`text-2xl font-bold ${t.text}`}>{displayNFCs}</div>
            <div className={`text-xs leading-tight ${t.textXs}`}>Total NFCs</div>
            <div className="text-xs text-green-600 mt-1">● Active</div>
          </button>
        </div>

        {activeStore ? (
          <>
            {selectedGrid === 'compliance' && (
              <div className={`rounded-2xl border shadow-sm overflow-hidden ${t.card}`}>
                <div className={`px-4 py-3 border-b ${t.border}`}>
                  <h3 className={`font-semibold text-sm ${t.text}`}>Round Details</h3>
                </div>
                <div className={`divide-y ${t.divide}`}>
                  {selectedStoreRounds.map((round, index) => {
                    const roundNumber = round.roundNumber ?? index + 1;
                    const completedBy = round.completedBy ?? round.staff ?? '—';
                    const completionTime = formatDetailTime(round.completionTime ?? round.time ?? null);
                    const status = (round.status ?? (round.completedScans >= round.totalScans && round.totalScans > 0 ? 'completed' : 'pending')).toLowerCase();
                    return (
                      <div key={round.id} className="px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white ${status === 'completed' ? 'bg-green-500' : status === 'active' ? 'bg-amber-500' : 'bg-gray-400'}`}>
                              {roundNumber}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-sm font-semibold ${t.text}`}>Round {roundNumber}</div>
                              <div className={`text-xs ${t.textMuted}`}>{round.name}</div>
                              <div className={`text-xs mt-1 ${t.textSm}`}>Completed by {completedBy}</div>
                              <div className={`text-xs mt-0.5 ${t.textXs}`}>Completion time: {completionTime}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roundStatusTone(status)}`}>{status}</span>
                            <div className={`text-xs font-bold mt-2 ${t.text}`}>{round.compliance}%</div>
                            <div className={`text-xs ${t.textMuted}`}>{round.completedScans}/{round.totalScans} scans</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedGrid === 'alerts' && (
              <div className={`rounded-2xl border shadow-sm overflow-hidden ${t.card}`}>
                <div className={`px-4 py-3 border-b ${t.border}`}>
                  <h3 className={`font-semibold text-sm ${t.text}`}>Alerts</h3>
                </div>
                <div className={`divide-y ${t.divide}`}>
                  {selectedStoreAlerts.map(alert => (
                    <button key={alert.id} onClick={() => navigate('store-alert-detail', { storeId: activeStore.id, alertId: alert.id })} className={`w-full text-left px-4 py-3.5 ${t.hoverRow}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className={`text-sm font-medium ${t.text}`}>{alert.title}</div>
                          <div className={`text-xs ${t.textMuted}`}>{alert.description}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${alertBadge[alert.type]}`}>{alert.type}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedGrid === 'nfc' && (
              <div className={`rounded-2xl border shadow-sm overflow-hidden ${t.card}`}>
                <div className={`px-4 py-3 border-b ${t.border}`}>
                  <h3 className={`font-semibold text-sm ${t.text}`}>NFC Progress</h3>
                </div>
                <div className={`divide-y ${t.divide}`}>
                  {nfcDetailsToShow.map(detail => (
                    <div key={detail.id} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className={`text-sm font-semibold ${t.text}`}>{detail.name}</div>
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
            )}
          </>
        ) : (
          <>
            {selectedGrid === 'alerts' && storeDrill && <StoreAlertDetail store={storeDrill} onBack={() => setStoreDrillId(null)} />}
            {selectedGrid !== 'alerts' && <AllStoresBreakdown selection={selectedGrid} stores={storeSummaries} onStoreClick={setStoreDrillId} />}
          </>
        )}
      </div>

      {showReport && (
        <ReportModal
          title={activeStore ? `${activeStore.name} ${activeStore.storeNumber}` : 'Overall Dashboard'}
          context={activeStore ? `Compliance: ${activeStore.compliance}%` : `${storeSummaries.length} stores`}
          storeId={activeStore?.id}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
