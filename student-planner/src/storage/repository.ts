import type { AppData } from '../domain/types';

/**
 * Storage abstraction. The app only talks to this interface, so the local
 * implementation can later be replaced (or combined) with a cloud one such as
 * Supabase without touching the UI. See docs/SUPABASE.md.
 */
export interface Repository {
  /** 'local' = this device only; 'cloud' = synced between devices. */
  readonly kind: 'local' | 'cloud';
  load(): Promise<LoadResult>;
  save(data: AppData): Promise<void>;
  /** Called when data was changed somewhere else (another tab / device). */
  subscribe?(onExternalChange: (data: AppData) => void): () => void;
}

export interface LoadResult {
  data: AppData;
  /** Problems found while loading. The app still works, but the user should know. */
  warnings: LoadWarning[];
}

export type LoadWarning =
  | { type: 'restored-from-backup' }
  | { type: 'corrupted-reset'; savedAs: string }
  | { type: 'dropped-records'; count: number }
  | { type: 'storage-unavailable' };

export class StorageError extends Error {
  readonly reason: 'quota' | 'unavailable' | 'unknown';
  constructor(reason: 'quota' | 'unavailable' | 'unknown', message: string) {
    super(message);
    this.name = 'StorageError';
    this.reason = reason;
  }
}
