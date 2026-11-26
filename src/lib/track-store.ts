export type Track = { id: string; styleId: string; styleName: string; bpm: number; distortion: number; prompt: string; createdAt: number; blob: Blob };

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open("hardcore-forge", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("tracks", { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const req = fn(d.transaction("tracks", mode).objectStore("tracks"));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
export const saveTrack = (t: Track) => tx("readwrite", (s) => s.put(t));
export const deleteTrack = (id: string) => tx("readwrite", (s) => s.delete(id));
export const listTracks = async () => ((await tx("readonly", (s) => s.getAll())) as Track[]).sort((a, b) => b.createdAt - a.createdAt);
