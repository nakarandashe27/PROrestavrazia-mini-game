/** Детерминированный генератор (mulberry32): одна и та же раскладка по одному seed. */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number) {
    return a + (b - a) * this.next();
  }
  int(a: number, b: number) {
    return Math.floor(this.range(a, b + 1));
  }
  chance(p: number) {
    return this.next() < p;
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

const SEED_KEY='archisbor.lastSeed';
let lastSeed=0,seedCounter=0;
/** Offline entropy; a blocked file: storage or crypto API never blocks play. */
export function newSeed():number {
 let stored=0;
 try { stored=Number(globalThis.localStorage?.getItem(SEED_KEY))>>>0; } catch { /* Private/file origins may deny storage. */ }
 let seed=0;
 try { const value=new Uint32Array(1);globalThis.crypto.getRandomValues(value);seed=value[0]; } catch {
  const stamp=Date.now()>>>0,clock=typeof performance==='undefined'?0:Math.floor(performance.now()*1000);
  seed=(stamp^clock^Math.floor(Math.random()*4294967296)^Math.imul(++seedCounter,0x9e3779b9))>>>0;
 }
 // Enforce a new identifier even if the entropy source repeats or is mocked.
 while(seed===0||seed===lastSeed||seed===stored)seed=(seed+0x9e3779b9)>>>0;
 lastSeed=seed;
 try {globalThis.localStorage?.setItem(SEED_KEY,String(seed));}catch { /* In-memory non-repetition still applies. */ }
 return seed;
}
