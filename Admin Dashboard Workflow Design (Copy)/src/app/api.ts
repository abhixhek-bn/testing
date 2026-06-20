export type Role = 'admin' | 'cleaner';
export interface AppUser {
  role: Role;
  name: string;
  id: string;
  username?: string;
  storeId?: string;
  shiftStart?: string;
  shiftEnd?: string;
}

export interface ComplianceData {
  hour: string;
  done: number;
  missed: number;
}

export interface ScanLog {
  id: string;
  location: string;
  time: string;
  status: 'verified' | 'missed' | 'pending';
  nfcUid: string;
  staff: string;
  compliance: number;
}

export interface Round {
  id: string;
  storeId: string;
  name: string;
  time: string;
  staff: string;
  compliance: number;
  totalScans: number;
  completedScans: number;
  roundNumber?: number;
  completedBy?: string;
  completionTime?: string | null;
  status?: string;
  scans: ScanLog[];
}

export interface NFCTag {
  id: string;
  uid: string;
  location: string;
  area: string;
  floor: string;
  zone: string;
  priority: 'high' | 'medium' | 'low' | '';
  status: 'active' | 'error' | 'warning' | 'deactivated' | 'pending' | 'unassigned';
  storeId: string;
  lastScanned?: string;
  registeredAt?: string;
  notes?: string;
}

export type AlertType = 'critical' | 'warning' | 'fraud';
export type AlertCategory = 'missing-round' | 'duplicate-scan' | 'gps-mismatch' | 'low-compliance' | 'too-quick';

export interface Alert {
  id: string;
  storeId: string;
  type: AlertType;
  category: AlertCategory;
  title: string;
  description: string;
  time: string;
  location?: string;
  staff?: string;
  reviewed?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Store {
  id: string;
  name: string;
  storeNumber: string;
  location: string;
  manager: string;
  compliance: number;
  nfcCount: number;
  activeAlerts: number;
  lastSync: string;
  dailyRounds?: number;
  checkpointCount?: number;
  roundDurationMinutes?: number;
  duplicateWindowMinutes?: number;
  tags: NFCTag[];
  alerts: Alert[];
  rounds: Round[];
  nfcDetails: NFCDetail[];
  complianceHistory: ComplianceData[];
}

export interface StoreSummary {
  id: string;
  name: string;
  storeNumber: string;
  location: string;
  manager: string;
  compliance: number;
  nfcCount: number;
  activeAlerts: number;
  lastSync: string | null;
  dailyRounds?: number;
  checkpointCount?: number;
  roundDurationMinutes?: number;
  duplicateWindowMinutes?: number;
}

export interface NFCDetail {
  id: string;
  name: string;
  requiredScanCount: number;
  completedScanCount: number;
  checkpointNames: string[];
  lastScanTime: string | null;
  status: 'completed' | 'pending';
}

export interface DashboardStats {
  stores: number;
  tags: number;
  alerts: number;
  compliance: number;
}

export interface GlobalDashboardResponse {
  stats: DashboardStats;
  stores: StoreSummary[];
  alert_summary: AlertSummary;
  compliance_history: ComplianceData[];
  recent_alerts: Alert[];
}

export interface AlertSummary {
  critical: number;
  warning: number;
  fraud: number;
  reviewed: number;
  unread: number;
}

export interface StoreDashboardResponse {
  store: StoreSummary & {
    daily_rounds?: number;
    checkpoint_count?: number;
    round_duration_minutes?: number;
    duplicate_window_minutes?: number;
  };
  tag_stats: { registered: number; unregistered: number; errors: number; deactivated: number };
  scan_stats: { total_scans: number; verified_scans: number; duplicate_scans: number; fraud_scans: number; pending_scans: number };
  alert_summary: AlertSummary;
  compliance_history: ComplianceData[];
  rounds: Array<{
    id: string;
    name: string;
    time: string;
    staff: string;
    compliance: number;
    totalScans: number;
    completedScans: number;
    isActive?: boolean;
    status?: string;
    round_number?: number;
    completed_by?: string;
    completion_time?: string | null;
    checkpointItems: Array<{
      id: string;
      location: string;
      zone?: string;
      uid?: string;
      status: 'verified' | 'missed' | 'pending' | 'error';
      scannedAt?: string;
    }>;
  }>;
  nfc_details: Array<{
    id: string;
    name: string;
    required_scan_count: number;
    completed_scan_count: number;
    checkpoint_names: string[];
    last_scan_time: string | null;
    status?: 'completed' | 'pending';
  }>;
  daily_rounds?: number;
  completed_rounds_count?: number;
  remaining_rounds?: number;
  alerts: Alert[];
  stale_time?: string | null;
}

export interface CleanerDashboardResponse {
  user: {
    user_id: string;
    name: string;
    username?: string;
    role: Role;
    store_id?: string | null;
    shift_start?: string | null;
    shift_end?: string | null;
    joined_at?: string | null;
  };
  store?: StoreSummary | null;
  current_round?: StoreDashboardResponse['rounds'][number] | null;
  completed_rounds: StoreDashboardResponse['rounds'][number][];
  completed_rounds_count?: number;
  daily_rounds?: number;
  remaining_rounds?: number;
  compliance_history: ComplianceData[];
  stats: {
    today_scans: number;
    today_compliance: number;
    active_alerts: number;
    completed_rounds: number;
    configured_rounds?: number;
    required_checkpoints?: number;
    remaining_rounds?: number;
    current_round_number?: number | null;
  };
  alerts: Alert[];
}

export interface LoginResult {
  user: AppUser;
  message: string;
}

export interface ReportRecord {
  id: string;
  title: string;
  context?: string;
  format: 'pdf' | 'csv';
  start_date: string;
  end_date: string;
  report_types: string[];
  download_url: string;
  generated_at: string;
  store_id?: string | null;
}

export interface Settings {
  id: string;
  gps_required: boolean;
  fraud_detection: boolean;
  duplicate_block: boolean;
  push_alerts: boolean;
  gps_tolerance_meters: number;
  duplicate_window_minutes: number;
}

export interface UserRecord {
  user_id: string;
  name: string;
  username?: string;
  role: Role;
  store_id?: string | null;
  email?: string | null;
  shift_start?: string | null;
  shift_end?: string | null;
  joined_at?: string | null;
}

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://127.0.0.1:8010';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    ...init,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => '');

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'detail' in payload
      ? String((payload as { detail?: unknown }).detail)
      : typeof payload === 'string' && payload
        ? payload
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

function pick<T>(value: T | null | undefined, fallback: T): T {
  return value == null ? fallback : value;
}

export function normalizeAlert(alert: any): Alert {
  return {
    id: String(alert.id),
    storeId: String(alert.store_id ?? alert.storeId ?? ''),
    type: alert.type,
    category: alert.category,
    title: alert.title,
    description: alert.description,
    time: alert.time,
    location: alert.location ?? undefined,
    staff: alert.staff ?? undefined,
    reviewed: Boolean(alert.reviewed),
    reviewedBy: alert.reviewed_by ?? undefined,
    reviewedAt: alert.reviewed_at ?? undefined,
  };
}

export function normalizeTag(tag: any): NFCTag {
  return {
    id: String(tag.id),
    storeId: String(tag.store_id ?? tag.storeId ?? ''),
    uid: String(tag.nfc_tag_uid ?? tag.uid ?? ''),
    location: tag.location ?? '',
    area: tag.area ?? '',
    floor: tag.floor ?? '',
    zone: tag.zone ?? '',
    priority: (tag.priority ?? '') as NFCTag['priority'],
    status: (tag.status ?? 'unassigned') as NFCTag['status'],
    lastScanned: tag.last_scanned_at ?? tag.lastScanned ?? undefined,
    registeredAt: tag.registered_at ?? tag.registeredAt ?? undefined,
    notes: tag.notes ?? undefined,
  };
}

function normalizeScan(scan: any): ScanLog {
  return {
    id: String(scan.id),
    location: scan.location ?? scan.checkpoint_name ?? scan.tag_location ?? '',
    time: scan.time ?? scan.server_timestamp ?? '',
    status: scan.status ?? scan.scan_status ?? 'pending',
    nfcUid: scan.nfcUid ?? scan.nfc_tag_uid ?? '',
    staff: scan.staff ?? scan.employee_name ?? '',
    compliance: Number(scan.compliance ?? (scan.scan_status === 'verified' ? 100 : 0)),
  };
}

function normalizeRound(round: any): Round {
  return {
    id: String(round.id),
    storeId: String(round.store_id ?? round.storeId ?? ''),
    name: round.name ?? '',
    time: round.time ?? '',
    staff: round.staff ?? round.employee_name ?? '',
    compliance: Number(round.compliance ?? 0),
    totalScans: Number(round.totalScans ?? round.total ?? round.scans?.length ?? 0),
    completedScans: Number(round.completedScans ?? round.scanned ?? 0),
    scans: Array.isArray(round.scans)
      ? round.scans.map(normalizeScan)
      : Array.isArray(round.checkpointItems)
        ? round.checkpointItems.map((item: any) => ({
            id: String(item.id),
            location: item.location ?? '',
            time: item.scannedAt ?? '',
            status: item.status === 'verified' ? 'verified' : item.status === 'missed' ? 'missed' : 'pending',
            nfcUid: item.uid ?? '',
            staff: round.staff ?? '',
            compliance: item.status === 'verified' ? 100 : 0,
          }))
        : [],
  };
}

function normalizeCompliance(history: any[]): ComplianceData[] {
  return (history || []).map(item => ({
    hour: String(item.hour ?? ''),
    done: Number(item.done ?? 0),
    missed: Number(item.missed ?? 0),
  }));
}

function normalizeStoreSummary(store: any): StoreSummary {
  return {
    id: String(store.id),
    name: store.name ?? '',
    storeNumber: store.storeNumber ?? '',
    location: store.location ?? '',
    manager: store.manager ?? '',
    compliance: Number(store.compliance ?? 0),
    nfcCount: Number(store.nfcCount ?? 0),
    activeAlerts: Number(store.activeAlerts ?? 0),
    lastSync: store.lastSync ?? null,
    dailyRounds: store.daily_rounds ?? store.dailyRounds ?? undefined,
    checkpointCount: store.checkpoint_count ?? store.checkpointCount ?? undefined,
    roundDurationMinutes: store.round_duration_minutes ?? store.roundDurationMinutes ?? undefined,
    duplicateWindowMinutes: store.duplicate_window_minutes ?? store.duplicateWindowMinutes ?? undefined,
  };
}

function normalizeNfcDetail(item: any): NFCDetail {
  return {
    id: String(item.id),
    name: item.name ?? '',
    requiredScanCount: Number(item.required_scan_count ?? 0),
    completedScanCount: Number(item.completed_scan_count ?? 0),
    checkpointNames: Array.isArray(item.checkpoint_names) ? item.checkpoint_names.map((value: any) => String(value)) : [],
    lastScanTime: item.last_scan_time ?? null,
    status: item.status === 'completed' ? 'completed' : 'pending',
  };
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const users = await listUsers();
  const match = users.find(user => (user.username || user.user_id).toLowerCase() === username.trim().toLowerCase());
  if (!match) {
    throw new Error('Invalid username or password.');
  }

  const payload = await request<{ status: string; message: string; user?: UserRecord }>('/login', {
    method: 'POST',
    body: JSON.stringify({
      user_id: match.user_id,
      password,
      role: match.role,
    }),
  });

  if (!payload.user) {
    throw new Error(payload.message || 'Login failed.');
  }

  return {
    message: payload.message,
    user: {
      id: payload.user.user_id,
      name: payload.user.name,
      role: payload.user.role,
      username: match.username ?? payload.user.username,
      storeId: payload.user.store_id ?? undefined,
      shiftStart: payload.user.shift_start ?? undefined,
      shiftEnd: payload.user.shift_end ?? undefined,
    },
  };
}

export async function listUsers(role?: Role, storeId?: string): Promise<UserRecord[]> {
  const query = new URLSearchParams();
  if (role) query.set('role', role);
  if (storeId) query.set('store_id', storeId);
  const data = await request<UserRecord[]>(`/users${query.toString() ? `?${query.toString()}` : ''}`);
  return data;
}

export async function getUser(userId: string): Promise<UserRecord | null> {
  try {
    return await request<UserRecord>(`/users/${encodeURIComponent(userId)}`);
  } catch {
    return null;
  }
}

export async function createUser(payload: {
  name: string;
  username: string;
  password: string;
  role?: Role;
  store_id?: string;
  email?: string;
  shift_start?: string;
  shift_end?: string;
  user_id?: string;
}) {
  return request(`/users`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      role: payload.role ?? 'cleaner',
    }),
  });
}

export async function updateUserShift(userId: string, shiftStart: string, shiftEnd: string) {
  return request<UserRecord>(`/users/${encodeURIComponent(userId)}/shift`, {
    method: 'PUT',
    body: JSON.stringify({ shift_start: shiftStart, shift_end: shiftEnd }),
  });
}

export async function deleteUser(userId: string) {
  return request<{ message: string }>(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

export async function getGlobalDashboard(): Promise<GlobalDashboardResponse> {
  const data = await request<any>('/dashboard/global');
  return {
    stats: data.stats,
    stores: (data.stores || []).map(normalizeStoreSummary),
    alert_summary: data.alert_summary,
    compliance_history: normalizeCompliance(data.compliance_history || []),
    recent_alerts: (data.recent_alerts || []).map(normalizeAlert),
  };
}

export async function getStoreDashboard(storeId: string): Promise<StoreDashboardResponse> {
  const data = await request<any>(`/dashboard/stores/${encodeURIComponent(storeId)}`);
  return {
    store: normalizeStoreSummary(data.store),
    tag_stats: data.tag_stats,
    scan_stats: data.scan_stats,
    alert_summary: data.alert_summary,
    compliance_history: normalizeCompliance(data.compliance_history || []),
    rounds: (data.rounds || []).map(normalizeRound).map(round => ({
      ...round,
      totalScans: round.totalScans,
      completedScans: round.completedScans,
      isActive: Boolean((data.rounds || []).find((item: any) => item.id === round.id)?.isActive),
      status: (data.rounds || []).find((item: any) => item.id === round.id)?.status ?? 'completed',
      round_number: (data.rounds || []).find((item: any) => item.id === round.id)?.round_number,
      completed_by: (data.rounds || []).find((item: any) => item.id === round.id)?.completed_by,
      completion_time: (data.rounds || []).find((item: any) => item.id === round.id)?.completion_time ?? null,
      checkpointItems: (data.rounds || []).find((item: any) => item.id === round.id)?.checkpointItems || [],
    })),
    nfc_details: (data.nfc_details || []).map(normalizeNfcDetail),
    daily_rounds: data.daily_rounds,
    completed_rounds_count: data.completed_rounds_count,
    remaining_rounds: data.remaining_rounds,
    alerts: (data.alerts || []).map(normalizeAlert),
    stale_time: data.stale_time ?? null,
  };
}

export async function getCleanerDashboard(userId: string): Promise<CleanerDashboardResponse> {
  const data = await request<any>(`/dashboard/cleaner/${encodeURIComponent(userId)}`);
  return {
    user: data.user,
    store: data.store ? normalizeStoreSummary(data.store) : null,
    current_round: data.current_round ? normalizeRound(data.current_round) : null,
    completed_rounds: (data.completed_rounds || []).map(normalizeRound),
    completed_rounds_count: data.completed_rounds_count,
    daily_rounds: data.daily_rounds,
    remaining_rounds: data.remaining_rounds,
    compliance_history: normalizeCompliance(data.compliance_history || []),
    stats: data.stats,
    alerts: (data.alerts || []).map(normalizeAlert),
  };
}

export async function getStores(): Promise<StoreSummary[]> {
  const data = await request<any[]>('/stores');
  return data.map(normalizeStoreSummary);
}

export async function getStore(storeId: string): Promise<StoreSummary | null> {
  try {
    const data = await request<any>(`/stores/${encodeURIComponent(storeId)}`);
    return normalizeStoreSummary(data);
  } catch {
    return null;
  }
}

export async function createStore(payload: { id: string; name: string; storeNumber: string; location: string; manager?: string }) {
  return request(`/stores`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteStore(storeId: string) {
  return request<{ message: string }>(`/stores/${encodeURIComponent(storeId)}`, { method: 'DELETE' });
}

export async function updateStoreConfig(storeId: string, payload: {
  daily_rounds: number;
  checkpoint_count: number;
  round_duration_minutes?: number;
  duplicate_window_minutes?: number;
}) {
  return request(`/stores/${encodeURIComponent(storeId)}/config`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateRoundConfig(storeId: string, payload: {
  daily_rounds: number;
  round_duration_minutes: number;
  duplicate_window_minutes: number;
}) {
  return request(`/stores/${encodeURIComponent(storeId)}/round-config`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getTags(storeId: string): Promise<NFCTag[]> {
  const query = new URLSearchParams({ store_id: storeId });
  const data = await request<any[]>(`/tags/?${query.toString()}`);
  return data.map(normalizeTag);
}

export async function getTag(tagId: string, storeId?: string): Promise<NFCTag | null> {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  try {
    const data = await request<any>(`/tags/${encodeURIComponent(tagId)}${query}`);
    return normalizeTag(data);
  } catch {
    return null;
  }
}

export async function registerTag(storeId: string, nfcTagUid: string) {
  return request<NFCTag>(`/tags/register`, {
    method: 'POST',
    body: JSON.stringify({ store_id: storeId, nfc_tag_uid: nfcTagUid }),
  });
}

export async function assignTag(tagId: string, payload: {
  store_id: string;
  location: string;
  area?: string;
  floor?: string;
  zone?: string;
  priority?: 'high' | 'medium' | 'low';
  notes?: string;
}) {
  return request<NFCTag>(`/tags/${encodeURIComponent(tagId)}/assign`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function setTagStatus(tagId: string, storeId: string, status: NFCTag['status']) {
  return request<NFCTag>(`/tags/${encodeURIComponent(tagId)}/status?store_id=${encodeURIComponent(storeId)}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function deleteTag(tagId: string, storeId: string) {
  return request<{ message: string }>(`/tags/${encodeURIComponent(tagId)}?store_id=${encodeURIComponent(storeId)}`, {
    method: 'DELETE',
  });
}

export async function resetTags(storeId: string) {
  return request<{ message: string }>(`/tags/reset/${encodeURIComponent(storeId)}`, { method: 'DELETE' });
}

export async function getTagStats(storeId: string) {
  return request<{ registered: number; unregistered: number; errors: number; deactivated: number }>(`/tags/stats/${encodeURIComponent(storeId)}`);
}

export async function createCheckpoint(payload: {
  id: string;
  store_id: string;
  name: string;
  nfc_tag_uid: string;
  gps_lat: number;
  gps_lon: number;
  registered_by: string;
  area?: string;
  zone?: string;
  floor?: string;
  priority?: 'high' | 'medium' | 'low';
}) {
  return request(`/checkpoints/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCheckpoints(storeId?: string) {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  return request<any[]>(`/checkpoints/${query}`);
}

export async function getCheckpoint(checkpointId: string, storeId?: string) {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  return request<any>(`/checkpoints/${encodeURIComponent(checkpointId)}${query}`);
}

export async function getRegistrationReview(checkpointId: string) {
  return request<any>(`/reviews/registration-review/${encodeURIComponent(checkpointId)}`);
}

export async function deployCheckpoint(checkpointId: string) {
  return request(`/reviews/deploy-checkpoint/${encodeURIComponent(checkpointId)}`, { method: 'POST' });
}

export async function cancelCheckpoint(checkpointId: string) {
  return request(`/reviews/cancel-checkpoint/${encodeURIComponent(checkpointId)}`, { method: 'POST' });
}

export async function getSettings(storeId: string): Promise<Settings> {
  return request<Settings>(`/settings/${encodeURIComponent(storeId)}`);
}

export async function saveSettings(storeId: string, payload: Omit<Settings, 'id'>) {
  return request(`/settings/${encodeURIComponent(storeId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getAlerts(storeId?: string, reviewed?: boolean): Promise<Alert[]> {
  const query = new URLSearchParams();
  if (storeId) query.set('store_id', storeId);
  if (reviewed !== undefined) query.set('reviewed', reviewed ? 'true' : 'false');
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const data = await request<any[]>(`/alerts${suffix}`);
  return data.map(normalizeAlert);
}

export async function getAlert(alertId: string, storeId?: string): Promise<Alert | null> {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  try {
    const data = await request<any>(`/alerts/${encodeURIComponent(alertId)}${query}`);
    return normalizeAlert(data);
  } catch {
    return null;
  }
}

export async function getAlertSummary(storeId?: string): Promise<AlertSummary> {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  return request<AlertSummary>(`/alerts/summary${query}`);
}

export async function reviewAlert(alertId: string, reviewedBy?: string, storeId?: string) {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  return request<Alert>(`/alerts/${encodeURIComponent(alertId)}/review${query}`, {
    method: 'POST',
    body: JSON.stringify({ reviewed_by: reviewedBy ?? null }),
  });
}

export async function reviewAllAlerts(storeId: string, reviewedBy?: string) {
  return request<{ message: string; count: number }>(`/alerts/review-all/${encodeURIComponent(storeId)}`, {
    method: 'POST',
    body: JSON.stringify({ reviewed_by: reviewedBy ?? null }),
  });
}

export async function getAuditLogs(storeId?: string, entityType?: string) {
  const query = new URLSearchParams();
  if (storeId) query.set('store_id', storeId);
  if (entityType) query.set('entity_type', entityType);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<any[]>(`/audit${suffix}`);
}

export async function getReports(storeId?: string) {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  return request<ReportRecord[]>(`/reports${query}`);
}

export async function generateReport(payload: {
  title: string;
  context?: string;
  report_types: string[];
  format: 'pdf' | 'csv';
  start_date: string;
  end_date: string;
  store_id?: string;
}) {
  return request<ReportRecord>(`/reports/generate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function processScan(payload: {
  nfc_tag_uid: string;
  device_timestamp: string;
  gps_lat: number;
  gps_lon: number;
  gps_accuracy: number;
  shift_date: string;
  employee_id?: string;
  employee_name?: string;
  store_id?: string;
}) {
  return request(`/scan`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getScanHistory(storeId: string) {
  return request<any[]>(`/scan/history/${encodeURIComponent(storeId)}`);
}

export async function getScanStats(storeId: string) {
  return request(`/scan/stats/${encodeURIComponent(storeId)}`);
}

export async function loadStoreView(storeId: string): Promise<Store> {
  const [dashboard, tags] = await Promise.all([getStoreDashboard(storeId), getTags(storeId)]);
  return {
    id: dashboard.store.id,
    name: dashboard.store.name,
    storeNumber: dashboard.store.storeNumber,
    location: dashboard.store.location,
    manager: dashboard.store.manager,
    compliance: dashboard.store.compliance,
    nfcCount: dashboard.store.nfcCount,
    activeAlerts: dashboard.store.activeAlerts,
    lastSync: dashboard.store.lastSync ?? '—',
    dailyRounds: dashboard.store.dailyRounds ?? dashboard.store.daily_rounds ?? undefined,
    checkpointCount: dashboard.store.checkpointCount ?? dashboard.store.checkpoint_count ?? undefined,
    roundDurationMinutes: dashboard.store.roundDurationMinutes ?? dashboard.store.round_duration_minutes ?? undefined,
    duplicateWindowMinutes: dashboard.store.duplicateWindowMinutes ?? dashboard.store.duplicate_window_minutes ?? undefined,
    tags: tags.map(tag => ({
      ...tag,
      storeId,
      uid: tag.uid,
      lastScanned: tag.lastScanned,
      registeredAt: tag.registeredAt,
    })),
    alerts: dashboard.alerts,
    rounds: dashboard.rounds.map(round => ({
      id: round.id,
      storeId,
      name: round.name,
      time: round.time ?? '',
      staff: round.staff ?? '',
      compliance: round.compliance,
      totalScans: round.totalScans,
      completedScans: round.completedScans,
      roundNumber: round.round_number,
      completedBy: round.completed_by,
      completionTime: round.completion_time ?? null,
      status: round.status,
      scans: round.checkpointItems.map(item => ({
        id: item.id,
        location: item.location,
        time: item.scannedAt ?? '—',
        status: item.status === 'error' ? 'pending' : item.status,
        nfcUid: item.uid ?? '',
        staff: round.staff,
        compliance: item.status === 'verified' ? 100 : 0,
      })),
    })),
    nfcDetails: (dashboard.nfc_details || []).map(normalizeNfcDetail),
    complianceHistory: dashboard.compliance_history,
  };
}

export async function loadGlobalStoreViews(): Promise<Store[]> {
  const dashboard = await getGlobalDashboard();
  const stores = await Promise.all(dashboard.stores.map(async store => loadStoreView(store.id)));
  return stores;
}

export function todayIsoDate() {
  return new Date().toISOString().split('T')[0];
}

export function currentTimestamp() {
  return new Date().toISOString();
}

export function formatClockLabel(value: string) {
  return value;
}

export function safeLabel(value?: string | null) {
  return pick(value, '—');
}
