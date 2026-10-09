import { LocalRepository } from './localRepository';
import type { Repository } from './repository';

/**
 * Single place that decides where data is stored.
 * Today: this browser only (localStorage).
 * Later: return a Supabase-backed repository here when the cloud database is
 * configured — see docs/SUPABASE.md. The rest of the app does not change.
 */
export function createRepository(): Repository {
  return new LocalRepository();
}
