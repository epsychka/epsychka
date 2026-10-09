import { describe, expect, it } from 'vitest';
import { BACKUP_KEY, LocalRepository, STORAGE_KEY, type KeyValueStore } from './localRepository';
import { emptyData } from '../domain/types';
import { makeEvent, makeTask } from '../domain/testUtils';

class MemoryStore implements KeyValueStore {
  map = new Map<string, string>();
  failWith: Error | null = null;
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.failWith) throw this.failWith;
    this.map.set(k, v);
  }
}

describe('LocalRepository', () => {
  it('returns empty data on first launch', async () => {
    const repo = new LocalRepository(new MemoryStore());
    const { data, warnings } = await repo.load();
    expect(data.events).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('saves and loads data (survives a page reload)', async () => {
    const store = new MemoryStore();
    const data = { ...emptyData(), events: [makeEvent({ id: 'e1' })], tasks: [makeTask({ id: 't1' })] };
    await new LocalRepository(store).save(data);
    const loaded = await new LocalRepository(store).load();
    expect(loaded.data).toEqual(data);
  });

  it('keeps the previous version as a backup and restores it if the main copy is corrupted', async () => {
    const store = new MemoryStore();
    const repo = new LocalRepository(store);
    const v1 = { ...emptyData(), tasks: [makeTask({ id: 'v1' })] };
    await repo.save(v1);
    await repo.save({ ...emptyData(), tasks: [makeTask({ id: 'v2' })] });
    expect(store.getItem(BACKUP_KEY)).toBe(JSON.stringify(v1));

    store.map.set(STORAGE_KEY, '{ broken json');
    const { data, warnings } = await repo.load();
    expect(data.tasks.map((t) => t.id)).toEqual(['v1']);
    expect(warnings).toEqual([{ type: 'restored-from-backup' }]);
    // the broken copy is kept, not deleted
    expect([...store.map.keys()].some((k) => k.includes('corrupt'))).toBe(true);
  });

  it('drops invalid records but keeps valid ones', async () => {
    const store = new MemoryStore();
    store.map.set(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        settings: { language: 'ru', theme: 'nonsense' },
        events: [makeEvent({ id: 'ok' }), { title: 'no dates' }, makeEvent({ id: 'bad', startTime: '12:00', endTime: '11:00' })],
        tasks: [makeTask({ id: 'ok' }), 42],
      }),
    );
    const { data, warnings } = await new LocalRepository(store).load();
    expect(data.events.map((e) => e.id)).toEqual(['ok']);
    expect(data.tasks.map((t) => t.id)).toEqual(['ok']);
    expect(data.settings.language).toBe('ru');
    expect(data.settings.theme).toBe('system');
    expect(warnings).toEqual([{ type: 'dropped-records', count: 3 }]);
  });

  it('reports a clear error when storage is full', async () => {
    const store = new MemoryStore();
    store.failWith = new DOMException('full', 'QuotaExceededError');
    await expect(new LocalRepository(store).save(emptyData())).rejects.toMatchObject({ reason: 'quota' });
  });

  it('works (with a warning) when storage is unavailable', async () => {
    const { data, warnings } = await new LocalRepository(null).load();
    expect(data).toEqual(emptyData());
    expect(warnings).toEqual([{ type: 'storage-unavailable' }]);
  });
});
