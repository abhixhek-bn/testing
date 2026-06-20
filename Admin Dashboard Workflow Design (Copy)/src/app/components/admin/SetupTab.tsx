import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, Cpu, Tag, CheckCircle, FileText,
  ToggleLeft, ToggleRight, ChevronDown, RefreshCw,
  ChevronRight, AlertTriangle, Trash2, PowerOff, RotateCcw, MapPin,
  Users, UserPlus, Eye, EyeOff,
} from 'lucide-react';
import { useT } from '../../ThemeContext';
import {
  assignTag,
  cancelCheckpoint,
  createCheckpoint,
  createUser,
  deployCheckpoint,
  getCheckpoint,
  getSettings,
  getStore,
  getStores,
  getTags,
  listUsers,
  registerTag,
  resetTags,
  saveSettings,
  setTagStatus,
  deleteTag,
  deleteUser,
  updateStoreConfig,
  updateUserShift,
  type NFCTag,
  type Settings,
  type StoreSummary,
  type UserRecord,
} from '../../api';
import { ReportModal } from '../shared/ReportModal';

interface Props {
  navigate: (view: string, params?: Record<string, unknown>) => void;
  goBack?: () => void;
  subView?: string;
  subParams?: Record<string, unknown>;
}

function TagRegistrationView({ goBack, navigate }: { goBack: () => void; navigate: (v: string, p?: Record<string, unknown>) => void }) {
  const t = useT();
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [storeId, setStoreId] = useState('');
  const [uid, setUid] = useState('');
  const [locationName, setLocationName] = useState('');
  const [registeredBy, setRegisteredBy] = useState('Admin User');
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [checkpointId, setCheckpointId] = useState('');

  useEffect(() => {
    getStores().then(items => {
      setStores(items);
      setStoreId(items[0]?.id ?? '');
    }).catch(() => setStores([]));
  }, []);

  const startScan = () => {
    setScanning(true);
    setError('');
    window.navigator.geolocation?.getCurrentPosition(
      pos => {
        setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setScanning(false);
        setScanDone(true);
      },
      () => {
        setGps({ lat: 0, lon: 0 });
        setScanning(false);
        setScanDone(true);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const [error, setError] = useState('');

  const canSubmit = scanDone && uid.trim() && locationName.trim() && storeId;

  const submit = async () => {
    if (!canSubmit || !gps) return;
    setError('');
    try {
      const checkpoint = await createCheckpoint({
        id: `cp-${Date.now()}`,
        store_id: storeId,
        name: locationName.trim(),
        nfc_tag_uid: uid.trim(),
        gps_lat: gps.lat,
        gps_lon: gps.lon,
        registered_by: registeredBy,
      });
      setCheckpointId(checkpoint.checkpoint.id);
      navigate('registration-review', { checkpointId: checkpoint.checkpoint.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register checkpoint.');
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto pb-6 ${t.page}`}>
      <div className={`px-4 py-3 border-b flex items-center gap-3 ${t.header}`}>
        <button onClick={goBack} className={`p-1.5 rounded-full ${t.hoverRow}`}>
          <ChevronLeft className="w-5 h-5 text-orange-500" />
        </button>
        <div>
          <h2 className={`font-semibold text-sm ${t.text}`}>NFC Tag Registration</h2>
          <p className={`text-xs ${t.textXs}`}>Scan a tag and assign it to a store location</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className={`rounded-2xl p-4 border shadow-sm ${t.card}`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${t.textXs}`}>Select Store</h3>
          <div className="relative">
            <select value={storeId} onChange={e => setStoreId(e.target.value)} className={`w-full appearance-none px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 pr-10 ${t.input}`}>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name} {s.storeNumber}</option>)}
            </select>
            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${t.textXs}`} />
          </div>
        </div>

        <div className={`rounded-2xl p-4 border shadow-sm ${t.card}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${scanDone ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>1</div>
            <h3 className={`text-sm font-semibold ${t.text}`}>Scan NFC Tag</h3>
            {scanDone && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full ml-auto">DETECTED</span>}
          </div>
          <div className={`border-2 border-dashed rounded-xl p-6 text-center mb-3 ${scanDone ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-orange-200 bg-orange-50 dark:bg-orange-900/20'}`}>
            <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center mx-auto mb-3 ${scanDone ? 'border-green-400 bg-green-100' : 'border-orange-300 bg-white dark:bg-gray-700'}`}>
              <Cpu className={`w-8 h-8 ${scanDone ? 'text-green-500' : 'text-orange-400'}`} />
            </div>
            {scanDone ? (
              <>
                <p className="text-sm font-medium text-green-700">Tag Detected!</p>
                <p className={`text-xs mt-1 font-mono ${t.textXs}`}>{uid || '—'}</p>
                <p className={`text-xs mt-0.5 ${t.textMuted}`}>Live browser location captured</p>
              </>
            ) : scanning ? (
              <p className={`text-sm animate-pulse ${t.textSm}`}>Listening for NFC tag...</p>
            ) : (
              <>
                <p className={`text-sm ${t.textSm}`}>Ready to Scan</p>
                <p className={`text-xs mt-0.5 ${t.textMuted}`}>Use the scan button to capture the tag and location.</p>
              </>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className={`block text-xs mb-1 ${t.textXs}`}>NFC Tag UID *</label>
              <input value={uid} onChange={e => setUid(e.target.value)} placeholder="04:A3:7F:2B:C1:88" className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 ${t.input}`} />
            </div>
            <button onClick={startScan} disabled={scanning} className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-orange-600 transition-colors">
              {scanning ? 'Scanning...' : 'Start Scanning'}
            </button>
          </div>
        </div>

        <div className={`rounded-2xl p-4 border shadow-sm ${scanDone ? 'opacity-100' : 'opacity-40'} ${t.card}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${scanDone ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-500'}`}>2</div>
            <h3 className={`text-sm font-semibold ${t.text}`}>GPS Anchor</h3>
            {scanDone && <span className="text-xs text-green-600 ml-auto">● Anchored</span>}
          </div>
          <div className={`rounded-xl p-3 text-center ${scanDone ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800' : `${t.surface} border ${t.borderGray}`}`}>
            <MapPin className={`w-5 h-5 mx-auto mb-1 ${scanDone ? 'text-orange-500' : 'text-gray-300'}`} />
            <p className={`text-xs ${scanDone ? 'text-green-600 font-medium' : t.textMuted}`}>
              {gps ? `${gps.lat.toFixed(4)}°, ${gps.lon.toFixed(4)}°` : 'Awaiting tag scan...'}
            </p>
          </div>
        </div>

        <div className={`rounded-2xl p-4 border shadow-sm ${scanDone ? 'opacity-100' : 'opacity-40'} ${t.card}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${scanDone ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-500'}`}>3</div>
            <h3 className={`text-sm font-semibold ${t.text}`}>Location Name</h3>
          </div>
          <label className={`block text-xs mb-1 ${t.textXs}`}>Location Name *</label>
          <input value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="e.g. Produce Section" disabled={!scanDone} className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:opacity-50 ${t.input}`} />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button onClick={submit} disabled={!canSubmit} className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-orange-600 transition-colors flex items-center justify-center gap-2">
          <Tag className="w-4 h-4" /> Register & Assign Tag
        </button>
        {!scanDone && <p className={`text-xs text-center ${t.textMuted}`}>Scan an NFC tag above to enable registration</p>}
        {scanDone && !locationName && <p className="text-xs text-center text-amber-500">Enter a location name to continue</p>}
      </div>
    </div>
  );
}

function RegistrationReviewView({ params, goBack }: { params: Record<string, unknown>; goBack: () => void }) {
  const t = useT();
  const [checkpoint, setCheckpoint] = useState<any>(null);
  const [deployed, setDeployed] = useState(false);
  const checkpointId = params.checkpointId as string | undefined;

  useEffect(() => {
    if (!checkpointId) return;
    getCheckpoint(checkpointId)
      .then(setCheckpoint)
      .catch(() => setCheckpoint(null));
  }, [checkpointId]);

  if (deployed) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center px-6 text-center ${t.page}`}>
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-9 h-9 text-green-600" />
        </div>
        <h2 className={`text-xl font-bold mb-1 ${t.text}`}>Tag Deployed!</h2>
        <p className={`text-sm mb-1 ${t.textXs}`}>{checkpoint?.nfc_tag_uid ?? 'NFC tag'} is now active at</p>
        <p className="text-sm font-medium text-orange-500 mb-6">{checkpoint?.name ?? 'Location'}</p>
        <button onClick={goBack} className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600">Back to Setup</button>
      </div>
    );
  }

  if (!checkpoint) {
    return <div className={`flex-1 overflow-y-auto pb-6 ${t.page}`} />;
  }

  return (
    <div className={`flex-1 overflow-y-auto pb-6 ${t.page}`}>
      <div className={`px-4 py-3 border-b flex items-center gap-3 ${t.header}`}>
        <button onClick={goBack} className={`p-1.5 rounded-full ${t.hoverRow}`}><ChevronLeft className="w-5 h-5 text-orange-500" /></button>
        <div>
          <h2 className={`font-semibold text-sm ${t.text}`}>Registration Review</h2>
          <p className={`text-xs ${t.textXs}`}>Confirm all details before finalising</p>
        </div>
      </div>
      <div className="px-4 pt-4 space-y-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">SETUP COMPLETE — Ready to Deploy</p>
          <div className="flex gap-2 flex-wrap">
            {['TAG REGISTERED', 'LOCATION ASSIGNED', 'GPS ANCHORED'].map(s => (
              <span key={s} className="flex items-center gap-1 text-xs bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 px-2 py-1 rounded-full border border-green-200 dark:border-green-700">
                <CheckCircle className="w-3 h-3" /> {s}
              </span>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border shadow-sm p-4 space-y-3 ${t.card}`}>
          <h4 className={`text-sm font-semibold ${t.text}`}>Checkpoint Details</h4>
          {[
            ['Checkpoint', checkpoint.name],
            ['UID', checkpoint.nfc_tag_uid],
            ['Registered by', checkpoint.registered_by],
            ['Registered', checkpoint.registered_at ? new Date(checkpoint.registered_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className={t.textXs}>{k}</span>
              <span className={`font-mono text-xs ${t.text}`}>{v}</span>
            </div>
          ))}
        </div>

        <div className={`rounded-2xl border shadow-sm p-4 space-y-3 ${t.card}`}>
          <h4 className={`text-sm font-semibold ${t.text}`}>Assigned Location</h4>
          <div className="flex justify-between text-sm"><span className={t.textXs}>Store</span><span className={t.text}>{checkpoint.store_id}</span></div>
          <div className="flex justify-between text-sm"><span className={t.textXs}>Name</span><span className={`font-medium ${t.text}`}>{checkpoint.name}</span></div>
          <div className="flex justify-between text-sm"><span className={t.textXs}>GPS</span><span className={t.text}>{checkpoint.gps_lat}, {checkpoint.gps_lon}</span></div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400"><span className="font-semibold">GPS Fraud Prevention Active</span> — Staff must physically be within 15 metres of this anchor point.</p>
        </div>

        <button onClick={() => deployCheckpoint(checkpoint.id).then(() => setDeployed(true))} className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" /> Complete Setup & Deploy
        </button>
        <button onClick={() => cancelCheckpoint(checkpoint.id).then(goBack)} className={`w-full py-3 border rounded-xl text-sm ${t.borderGray} ${t.textSm}`}>
          Cancel Registration
        </button>
      </div>
    </div>
  );
}

function RoundSetupView({ goBack, storeId }: { goBack: () => void; storeId?: string }) {
  const t = useT();
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState(storeId || '');
  const [numRounds, setNumRounds] = useState(3);
  const [roundDuration, setRoundDuration] = useState(90);
  const [dupWindow, setDupWindow] = useState(30);
  const [saved, setSaved] = useState(false);
  const [storeConfig, setStoreConfig] = useState<any>(null);
  const [customDuration, setCustomDuration] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    getStores().then(items => {
      setStores(items);
      setSelectedStoreId(prev => prev || items[0]?.id || '');
    }).catch(() => setStores([]));
  }, []);

  useEffect(() => {
    if (!selectedStoreId) return;
    getStore(selectedStoreId).then(setStoreConfig).catch(() => setStoreConfig(null));
  }, [selectedStoreId]);

  const durationOptions = [60, 90, 120];
  const dupOptions = [15, 30, 45, 60];

  const handleSave = async () => {
    if (!selectedStoreId || !storeConfig) return;
    await updateStoreConfig(selectedStoreId, {
      daily_rounds: numRounds,
      checkpoint_count: storeConfig.checkpoint_count ?? 1,
      round_duration_minutes: roundDuration,
      duplicate_window_minutes: dupWindow,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleDurationSelect = (val: number | 'custom') => {
    if (val === 'custom') setShowCustom(true);
    else {
      setShowCustom(false);
      setRoundDuration(val);
    }
  };

  const applyCustom = () => {
    const v = parseInt(customDuration);
    if (!isNaN(v) && v >= 10 && v <= 360) {
      setRoundDuration(v);
      setShowCustom(false);
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto pb-6 ${t.page}`}>
      <div className={`px-4 py-3 border-b flex items-center gap-3 ${t.header}`}>
        <button onClick={goBack} className={`p-1.5 rounded-full ${t.hoverRow}`}>
          <ChevronLeft className="w-5 h-5 text-orange-500" />
        </button>
        <div>
          <h2 className={`font-semibold text-sm ${t.text}`}>Round Setup</h2>
          <p className={`text-xs ${t.textXs}`}>Configure cleaning round parameters per store</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="relative">
          <select value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} className={`w-full appearance-none px-4 py-3 border-2 rounded-xl text-sm font-medium focus:outline-none focus:border-orange-400 pr-10 ${t.input}`}>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name} {s.storeNumber}</option>)}
          </select>
          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${t.textXs}`} />
        </div>

        <div className={`rounded-2xl border shadow-sm p-4 ${t.card}`}>
          <h3 className={`text-sm font-semibold mb-0.5 ${t.text}`}>Rounds Per Day</h3>
          <p className={`text-xs mb-4 ${t.textXs}`}>Total cleaning rounds configured for this store</p>
          <div className="flex items-center gap-3">
            <input type="number" min={1} max={99} value={numRounds} onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setNumRounds(Math.min(99, v)); }} className={`w-28 px-4 py-3 border-2 rounded-xl text-2xl font-bold text-center focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 text-orange-500 ${t.input}`} />
            <span className={`text-sm ${t.textSm}`}>{numRounds === 1 ? 'round per day' : 'rounds per day'}</span>
          </div>
        </div>

        <div className={`rounded-2xl border shadow-sm p-4 ${t.card}`}>
          <h3 className={`text-sm font-semibold mb-0.5 ${t.text}`}>Round Duration</h3>
          <p className={`text-xs mb-4 ${t.textXs}`}>Maximum time allowed to complete one round (minutes)</p>
          <div className="grid grid-cols-4 gap-2">
            {durationOptions.map(d => <button key={d} onClick={() => handleDurationSelect(d)} className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${roundDuration === d && !showCustom ? 'bg-orange-500 text-white border-orange-500' : `${t.input} border-gray-200 dark:border-gray-600 hover:border-orange-300`}`}>{d}m</button>)}
            <button onClick={() => handleDurationSelect('custom')} className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${showCustom ? 'bg-orange-500 text-white border-orange-500' : `${t.input} border-gray-200 dark:border-gray-600 hover:border-orange-300`}`}>Custom</button>
          </div>
          {showCustom && (
            <div className="mt-3 flex gap-2">
              <input type="number" min={10} max={360} value={customDuration} onChange={e => setCustomDuration(e.target.value)} placeholder="e.g. 75" className={`flex-1 px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 ${t.input}`} />
              <button onClick={applyCustom} className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors">Apply</button>
            </div>
          )}
        </div>

        <div className={`rounded-2xl border shadow-sm p-4 ${t.card}`}>
          <h3 className={`text-sm font-semibold mb-0.5 ${t.text}`}>Duplicate Scan Window</h3>
          <p className={`text-xs mb-4 ${t.textXs}`}>Flag a scan as duplicate if same checkpoint scanned within this window</p>
          <div className="grid grid-cols-4 gap-2">
            {dupOptions.map(d => <button key={d} onClick={() => setDupWindow(d)} className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${dupWindow === d ? 'bg-orange-500 text-white border-orange-500' : `${t.input} border-gray-200 dark:border-gray-600 hover:border-orange-300`}`}>{d}m</button>)}
          </div>
        </div>

        <div className={`rounded-2xl border shadow-sm p-4 ${t.card}`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${t.textXs}`}>Configuration Summary</h3>
          {[
            { label: 'Store', value: stores.find(s => s.id === selectedStoreId)?.name ?? '—' },
            { label: 'Rounds per day', value: `${numRounds} rounds` },
            { label: 'Round duration', value: `${roundDuration} min` },
            { label: 'Duplicate window', value: `${dupWindow} min` },
            { label: 'Maximum daily time', value: `${numRounds * roundDuration} min (${Math.round((numRounds * roundDuration) / 60 * 10) / 10} hrs)` },
          ].map((row, i) => (
            <div key={row.label} className={`flex items-center justify-between py-2 ${i > 0 ? `border-t ${t.borderGray}` : ''}`}>
              <span className={`text-xs ${t.textMuted}`}>{row.label}</span>
              <span className={`text-xs font-semibold ${t.text}`}>{row.value}</span>
            </div>
          ))}
        </div>

        <button onClick={handleSave} className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${saved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
          {saved ? <><CheckCircle className="w-4 h-4" /> Settings Saved!</> : 'Save Round Settings'}
        </button>
      </div>
    </div>
  );
}

function NfcRegistryView({ goBack, storeId }: { goBack: () => void; storeId?: string }) {
  const t = useT();
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState(storeId || '');
  const [tags, setTags] = useState<NFCTag[]>([]);
  const [expandedTagId, setExpandedTagId] = useState<string | null>(null);

  useEffect(() => {
    getStores().then(items => {
      setStores(items);
      setSelectedStoreId(prev => prev || items[0]?.id || '');
    }).catch(() => setStores([]));
  }, []);

  useEffect(() => {
    if (!selectedStoreId) return;
    getTags(selectedStoreId).then(setTags).catch(() => setTags([]));
  }, [selectedStoreId]);

  const activeTags = tags.filter(tg => tg.status === 'active').length;
  const errorTags = tags.filter(tg => tg.status === 'error').length;
  const visibleTags = tags;

  const resetAll = () => {
    if (!selectedStoreId) return;
    resetTags(selectedStoreId).then(() => setTags([]));
  };

  const statusCls: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    deactivated: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
    unassigned: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <div className={`flex-1 overflow-y-auto pb-6 ${t.page}`}>
      <div className={`px-4 py-3 border-b flex items-center gap-3 ${t.header}`}>
        <button onClick={goBack} className={`p-1.5 rounded-full ${t.hoverRow}`}><ChevronLeft className="w-5 h-5 text-orange-500" /></button>
        <div>
          <h2 className={`font-semibold text-sm ${t.text}`}>NFC Tag Registry</h2>
          <p className={`text-xs ${t.textXs}`}>Manage tags for selected store</p>
        </div>
      </div>
      <div className="px-4 pt-4 space-y-4">
        <div className="relative">
          <select value={selectedStoreId} onChange={e => { setSelectedStoreId(e.target.value); setExpandedTagId(null); }} className={`w-full appearance-none px-4 py-3 border-2 rounded-xl text-sm font-medium focus:outline-none focus:border-orange-400 pr-10 ${t.input}`}>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name} {s.storeNumber}</option>)}
          </select>
          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${t.textXs}`} />
        </div>

        <div className={`rounded-2xl border shadow-sm overflow-hidden ${t.card}`}>
          <div className={`px-4 py-3 border-b ${t.border} flex items-center justify-between`}>
            <div>
              <h3 className={`font-semibold text-sm ${t.text}`}>Tags</h3>
              <div className="flex gap-2 mt-1">
                <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">{activeTags} active</span>
                {errorTags > 0 && <span className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">{errorTags} error</span>}
              </div>
            </div>
            <button onClick={resetAll} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 dark:border-gray-600 px-2.5 py-1.5 rounded-lg hover:border-orange-300 hover:text-orange-500 transition-colors">
              <PowerOff className="w-3.5 h-3.5" /> Reset All
            </button>
          </div>
          <div className={`divide-y ${t.divide}`}>
            {visibleTags.map(tag => {
              const isOpen = expandedTagId === tag.id;
              return (
                <div key={tag.id}>
                  <button onClick={() => setExpandedTagId(isOpen ? null : tag.id)} className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${t.hoverRow}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tag.status === 'error' ? 'bg-red-100 dark:bg-red-900/30' : t.redLight}`}>
                        <Cpu className={`w-4 h-4 ${tag.status === 'error' ? 'text-red-500' : 'text-orange-500'}`} />
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${t.text}`}>{tag.location || tag.uid}</div>
                        <div className={`text-xs font-mono ${t.textMuted}`}>{tag.uid.substring(0, 11)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls[tag.status] ?? statusCls.active}`}>{tag.status}</span>
                      <ChevronRight className={`w-4 h-4 ${t.textMuted} transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className={`border-t ${t.border} px-4 py-4 space-y-3 bg-gray-50 dark:bg-gray-800/40`}>
                      <div className={`rounded-xl border ${t.borderGray} overflow-hidden`}>
                        {[
                          ['Full UID', tag.uid],
                          ['Zone', tag.zone || '—'],
                          ['Area', tag.area || '—'],
                          ['Floor', tag.floor || '—'],
                          ['Priority', tag.priority || '—'],
                          ['Last Scanned', tag.lastScanned ?? '—'],
                          ['Registered', tag.registeredAt ?? '—'],
                          ...(tag.notes ? [['Notes', tag.notes]] as [string, string][] : []),
                        ].map(([k, v], i, arr) => (
                          <div key={k} className={`flex items-start justify-between px-3 py-2 ${i < arr.length - 1 ? `border-b ${t.borderGray}` : ''}`}>
                            <span className={`text-xs ${t.textMuted} shrink-0 mr-4`}>{k}</span>
                            <span className={`text-xs font-medium text-right ${t.text} ${k === 'Full UID' ? 'font-mono' : ''}`}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setTagStatus(tag.id, selectedStoreId, 'active').then(updated => setTags(prev => prev.map(item => item.id === tag.id ? updated : item)))} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                          <RotateCcw className="w-4 h-4" /><span className="text-xs font-medium">Reset</span>
                        </button>
                        <button onClick={() => setTagStatus(tag.id, selectedStoreId, 'deactivated').then(updated => setTags(prev => prev.map(item => item.id === tag.id ? updated : item)))} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all border-amber-300 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                          <PowerOff className="w-4 h-4" /><span className="text-xs font-medium">Deactivate</span>
                        </button>
                        <button onClick={() => deleteTag(tag.id, selectedStoreId).then(() => setTags(prev => prev.filter(item => item.id !== tag.id)))} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                          <Trash2 className="w-4 h-4" /><span className="text-xs font-medium">Delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserCreationView({ goBack }: { goBack: () => void }) {
  const t = useT();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [newStore, setNewStore] = useState('');

  useEffect(() => {
    Promise.all([listUsers('cleaner'), getStores()])
      .then(([userList, storeList]) => {
        setUsers(userList);
        setStores(storeList);
        setNewStore(storeList[0]?.id ?? '');
      })
      .catch(() => {
        setUsers([]);
        setStores([]);
      });
  }, []);

  const canAdd = newName.trim() && newUsername.trim() && newPassword.trim();
  const storeName = (sid?: string | null) => stores.find(s => s.id === sid)?.name ?? '—';

  const addUser = async () => {
    if (!canAdd) return;
    const result = await createUser({
      name: newName.trim(),
      username: newUsername.trim(),
      password: newPassword,
      role: 'cleaner',
      store_id: newStore,
    });
    setUsers(prev => [...prev, result.user]);
    setNewName(''); setNewUsername(''); setNewPassword(''); setShowAdd(false);
  };

  return (
    <div className={`flex-1 overflow-y-auto pb-6 ${t.page}`}>
      <div className={`px-4 py-3 border-b flex items-center gap-3 ${t.header}`}>
        <button onClick={goBack} className={`p-1.5 rounded-full ${t.hoverRow}`}><ChevronLeft className="w-5 h-5 text-orange-500" /></button>
        <div>
          <h2 className={`font-semibold text-sm ${t.text}`}>User Management</h2>
          <p className={`text-xs ${t.textXs}`}>{users.length} users · {users.length} cleaners</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <button onClick={() => setShowAdd(v => !v)} className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border-2 transition-all ${showAdd ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : `border-transparent ${t.card} ${t.hoverRow}`}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <div className={`text-sm font-semibold ${t.text}`}>Add New User</div>
              <div className={`text-xs ${t.textXs}`}>Add a cleaner to a store</div>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-orange-400 transition-transform ${showAdd ? 'rotate-180' : ''}`} />
        </button>

        {showAdd && (
          <div className={`rounded-2xl border shadow-sm p-4 space-y-3 ${t.card}`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${t.textXs}`}>New User Details</h3>
            <div><label className={`block text-xs mb-1 ${t.textXs}`}>Full Name *</label><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. John Smith" className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 ${t.input}`} /></div>
            <div><label className={`block text-xs mb-1 ${t.textXs}`}>Username *</label><input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="e.g. john" className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 ${t.input}`} /></div>
            <div>
              <label className={`block text-xs mb-1 ${t.textXs}`}>Password *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Set a password" className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 pr-10 ${t.input}`} />
                <button onClick={() => setShowPass(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textMuted}`}>{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            <div>
              <label className={`block text-xs mb-1 ${t.textXs}`}>Assigned Store</label>
              <div className="relative">
                <select value={newStore} onChange={e => setNewStore(e.target.value)} className={`w-full appearance-none px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-orange-400 pr-8 ${t.input}`}>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name} {s.storeNumber}</option>)}
                </select>
                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${t.textXs}`} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowAdd(false)} className={`flex-1 py-2.5 border rounded-xl text-sm ${t.borderGray} ${t.textSm}`}>Cancel</button>
              <button onClick={addUser} disabled={!canAdd} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-orange-600 transition-colors">Create User</button>
            </div>
          </div>
        )}

        <div className={`rounded-2xl border shadow-sm overflow-hidden ${t.card}`}>
          <div className={`px-4 py-3 border-b ${t.border} flex items-center gap-2`}>
            <Users className="w-4 h-4 text-orange-500" />
            <h3 className={`font-semibold text-sm ${t.text}`}>Cleaners</h3>
            <span className={`text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 ${t.textXs}`}>{users.length}</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {users.length === 0 ? (
              <div className={`px-4 py-8 text-center text-xs ${t.textMuted}`}>No cleaners yet</div>
            ) : (
              <div className={`divide-y ${t.divide}`}>
                {users.map(u => (
                  <div key={u.user_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-white">{u.name.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${t.text}`}>{u.name}</div>
                      <div className={`text-xs ${t.textMuted}`}>@{u.username} · {storeName(u.store_id)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Cleaner</span>
                      <div className={`text-xs mt-0.5 ${t.textMuted}`}>Since {u.joined_at ? new Date(u.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}</div>
                    </div>
                    <button onClick={() => setDeleteId(u.user_id)} className={`p-1.5 rounded-lg ${t.hoverRow} ${t.textMuted} hover:text-red-500 transition-colors`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {deleteId && (
        <div className="absolute inset-0 bg-black/40 z-40 flex items-center justify-center px-6">
          <div className={`rounded-2xl p-5 w-full ${t.cardFlat}`}>
            <h3 className={`font-semibold mb-1 ${t.text}`}>Remove User?</h3>
            <p className={`text-sm mb-4 ${t.textSm}`}>This will remove the user account. They will no longer be able to sign in.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className={`flex-1 py-2.5 border rounded-xl text-sm ${t.borderGray} ${t.textSm}`}>Cancel</button>
              <button onClick={() => deleteUser(deleteId).then(() => setUsers(prev => prev.filter(u => u.user_id !== deleteId))).finally(() => setDeleteId(null))} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SetupTab({ navigate, goBack, subView, subParams }: Props) {
  const t = useT();
  const [showReport, setShowReport] = useState(false);
  const [selectedStore, setSelectedStore] = useState('');
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [fraudEnabled, setFraudEnabled] = useState(true);
  const [duplicateBlock, setDuplicateBlock] = useState(true);
  const [rushAlerts, setRushAlerts] = useState(true);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    getStores().then(items => {
      setStores(items);
      setSelectedStore(items[0]?.id ?? '');
    }).catch(() => setStores([]));
  }, []);

  useEffect(() => {
    if (!selectedStore) return;
    getSettings(selectedStore).then(setSettings).catch(() => setSettings(null));
  }, [selectedStore]);

  useEffect(() => {
    if (!settings) return;
    setGpsEnabled(settings.gps_required);
    setFraudEnabled(settings.fraud_detection);
    setDuplicateBlock(settings.duplicate_block);
    setRushAlerts(settings.push_alerts);
  }, [settings]);

  if (subView === 'tag-registration') return <TagRegistrationView goBack={goBack!} navigate={navigate} />;
  if (subView === 'registration-review') return <RegistrationReviewView params={subParams || {}} goBack={goBack!} />;
  if (subView === 'round-setup') return <RoundSetupView goBack={goBack!} storeId={subParams?.storeId as string} />;
  if (subView === 'nfc-registry') return <NfcRegistryView goBack={goBack!} storeId={subParams?.storeId as string} />;
  if (subView === 'user-creation') return <UserCreationView goBack={goBack!} />;

  const store = stores.find(s => s.id === selectedStore);

  const saveSettingsNow = () => {
    if (!selectedStore) return;
    saveSettings(selectedStore, {
      gps_required: gpsEnabled,
      fraud_detection: fraudEnabled,
      duplicate_block: duplicateBlock,
      push_alerts: rushAlerts,
      gps_tolerance_meters: settings?.gps_tolerance_meters ?? 15,
      duplicate_window_minutes: settings?.duplicate_window_minutes ?? 30,
    });
  };

  return (
    <div className={`flex-1 overflow-y-auto pb-6 ${t.page}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${t.header}`}>
        <h2 className={`font-semibold text-sm ${t.text}`}>Admin Setup</h2>
        <button onClick={() => setShowReport(true)} className="flex items-center gap-1.5 text-xs text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-3 py-1.5 rounded-full">
          <FileText className="w-3.5 h-3.5" /> Report
        </button>
      </div>
      <div className="px-4 pt-4 space-y-4">
        <div className={`rounded-2xl p-4 border shadow-sm ${t.card}`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${t.textXs}`}>Select Store</h3>
          <div className="relative">
            <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)} className={`w-full appearance-none px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-orange-400 pr-10 ${t.input}`}>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name} {s.storeNumber}</option>)}
            </select>
            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${t.textXs}`} />
          </div>
        </div>

        <div className={`rounded-2xl border shadow-sm overflow-hidden ${t.card}`}>
          {[
            { label: 'Register New NFC Tag', sub: 'Tap & assign to store location', icon: <Tag className="w-4 h-4 text-white" />, action: () => navigate('tag-registration') },
            { label: 'NFC Tag Registry', sub: 'View, manage & reset tags', icon: <Cpu className="w-4 h-4 text-white" />, action: () => navigate('nfc-registry', { storeId: selectedStore }) },
            { label: 'Round Setup', sub: 'Configure rounds, duration & duplicate window', icon: <RefreshCw className="w-4 h-4 text-white" />, action: () => navigate('round-setup', { storeId: selectedStore }) },
            { label: 'User Creation', sub: 'Add users & manage cleaner accounts', icon: <Users className="w-4 h-4 text-white" />, action: () => navigate('user-creation') },
          ].map((item, i, arr) => (
            <button key={item.label} onClick={item.action} className={`w-full flex items-center justify-between px-4 py-4 ${t.hoverRow} transition-colors ${i < arr.length - 1 ? `border-b ${t.border}` : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">{item.icon}</div>
                <div className="text-left">
                  <div className={`text-sm font-semibold ${t.text}`}>{item.label}</div>
                  <div className={`text-xs ${t.textXs}`}>{item.sub}</div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 -rotate-90 ${t.textMuted}`} />
            </button>
          ))}
        </div>

        <div className={`rounded-2xl border shadow-sm overflow-hidden ${t.card}`}>
          <div className={`px-4 py-3 border-b ${t.border}`}>
            <h3 className={`font-semibold text-sm ${t.text}`}>System Settings</h3>
          </div>
          {[
            { label: 'GPS Verification', sub: 'Require GPS on all scans', value: gpsEnabled, set: setGpsEnabled },
            { label: 'Fraud Detection', sub: 'Flag out-of-range scans', value: fraudEnabled, set: setFraudEnabled },
            { label: 'Duplicate Scan Block', sub: 'Block scans within interval', value: duplicateBlock, set: setDuplicateBlock },
            { label: 'Rush Alerts', sub: 'Immediate overdue notifications', value: rushAlerts, set: setRushAlerts },
          ].map((s, i) => (
            <div key={s.label} className={`px-4 py-3.5 flex items-center justify-between ${i > 0 ? `border-t ${t.borderGray}` : ''}`}>
              <div>
                <div className={`text-sm font-medium ${t.text}`}>{s.label}</div>
                <div className={`text-xs ${t.textXs}`}>{s.sub}</div>
              </div>
              <button onClick={() => s.set(!s.value)}>{s.value ? <ToggleRight className="w-7 h-7 text-orange-500" /> : <ToggleLeft className={`w-7 h-7 ${t.textMuted}`} />}</button>
            </div>
          ))}
          <div className="px-4 pb-4">
            <button onClick={saveSettingsNow} className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors">Save System Settings</button>
          </div>
        </div>
      </div>

      {showReport && <ReportModal title="Setup Report" context={store ? `Store: ${store.name} ${store.storeNumber}` : 'Setup overview'} onClose={() => setShowReport(false)} />}
    </div>
  );
}
