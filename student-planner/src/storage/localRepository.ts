import { emptyData, type AppData } from '../domain/types';
import { sanitizeAppData } from '../domain/validation';
import { StorageError, type LoadResult, type LoadWarning, type Repository } from './repository';

export const STORAGE_KEY = 'student-life-planner:data:v1';
export const BACKUP_KEY = 'student-life-planner:backup:v1';
const CORRUPT_PREFIX = 'student-life-planner:corrupt:';

/** Minimal subset of the Web Storage API, so tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function tryParse(raw: string | null): ReturnType<typeof sanitizeAppData> {
  if (raw === null) return null;
  try {
    return sanitizeAppData(JSON.parse(raw));
  } catch {
    return null;
  }
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22)
  );
}

/**
 * Saves data in the browser's localStorage (on this device only).
 * - Every successful save also keeps the previous version as a backup.
 * - Broken data is never silently deleted: it is copied to a separate key.
 */
export class LocalRepository implements Repository {
  readonly kind = 'local' as const;
  private readonly store: KeyValueStore | null;

  constructor(store?: KeyValueStore | null) {
    if (store !== undefined) {
      this.store = store;
    } else {
      try {
        this.store = typeof window !== 'undefined' ? window.localStorage : null;
      } catch {
        this.store = null; // e.g. storage blocked by browser settings
      }
    }
  }

  async load(): Promise<LoadResult> {
    const warnings: LoadWarning[] = [];
    if (!this.store) {
      return { data: emptyData(), warnings: [{ type: 'storage-unavailable' }] };
    }
    let raw: string | null;
    try {
      raw = this.store.getItem(STORAGE_KEY);
    } catch {
      return { data: emptyData(), warnings: [{ type: 'storage-unavailable' }] };
    }
    if (raw === null) return { data: emptyData(), warnings };

    let parsed = tryParse(raw);
    if (!parsed) {
      const savedAs = `${CORRUPT_PREFIX}${Date.now()}`;
      try {
        this.store.setItem(savedAs, raw);
      } catch {
        /* keep going even if we cannot copy the broken data */
      }
      parsed = tryParse(this.safeGet(BACKUP_KEY));
      if (parsed) warnings.push({ type: 'restored-from-backup' });
      else {
        warnings.push({ type: 'corrupted-reset', savedAs });
        return { data: emptyData(), warnings };
      }
    }
    if (parsed.dropped > 0) warnings.push({ type: 'dropped-records', count: parsed.dropped });
    return { data: parsed.data, warnings };
  }

  async save(data: AppData): Promise<void> {
    if (!this.store) throw new StorageError('unavailable', 'Local storage is not available');
    const json = JSON.stringify(data);
    try {
      const previous = this.store.getItem(STORAGE_KEY);
      if (previous !== null && previous !== json && tryParse(previous)) {
        this.store.setItem(BACKUP_KEY, previous);
      }
    } catch {
      /* the backup is best-effort; the main save below matters most */
    }
    try {
      this.store.setItem(STORAGE_KEY, json);
    } catch (e) {
      if (isQuotaError(e)) throw new StorageError('quota', 'Storage is full');
      throw new StorageError('unknown', e instanceof Error ? e.message : String(e));
    }
  }

  subscribe(onExternalChange: (data: AppData) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      const parsed = tryParse(e.newValue);
      if (parsed) onExternalChange(parsed.data);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }

  private safeGet(key: string): string | null {
    try {
      return this.store?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
}

/** Asks the browser not to evict our data under storage pressure (best-effort). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    /* not supported */
  }
  return false;
}
