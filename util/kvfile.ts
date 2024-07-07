import * as afs from './agnosticFS.ts';
import { path } from '../deps.ts';

export interface MarkProgressOpts {
	justdo?:boolean
}

export class KVFile {
	private f:()=>void;
	pairs:Map<string,string>;
	originalPath:string
	forceSave(){this.f();}
	constructor(p:string) {
		this.originalPath = p;
		p = path.resolve(p, 'kv.json');
		this.f = ()=>{
			//save
			const d = Array.from(this.pairs.entries());
			if (d.length == 0) {
				if (afs.exists(p))
					Deno.remove(p);
				return;
			}
			afs.writeTextFile(p, `[\n${
				d.map((x)=>JSON.stringify(x)).join(',\n')
			}\n]`, {ifdiff:true,mkdir:true});
		}
		addEventListener('unload', this.f);
		//load
		this.pairs = new Map<string,string>();
		if (afs.exists(p)) {
			try {
				(JSON.parse(afs.readTextFile(p)) as string[][]).forEach((skv)=>{
					this.pairs.set(skv[0], skv[1]);
				});
			// deno-lint-ignore no-empty
			} catch(_) {}
		}
	}
	dispose () {
		kvFiles.delete(this.originalPath);
		removeEventListener('unload', this.f);
		this.f();
	}
	//fast access
	set(key:string, value:string) {
		this.pairs.set(key, value);
		return this;
	}
	get(key:string) {
		return this.pairs.get(key);
	}
	//utils
	legacy_markProgress(pointUID:string, f:()=>void, opts?:MarkProgressOpts) {
		if (opts && opts.justdo) {
			f();
			return this;
		}
		const n = '[PP]'+pointUID;
		if (this.pairs.get(n))
			return this;
		f();
		this.pairs.set(n,"check");
		return this;
	}
	async legacy_markProgressAsync(pointUID:string, f:()=>Promise<void>, opts?:MarkProgressOpts) {
		if (opts && opts.justdo) {
			await f();
			return this;
		}
		const n = '[PP]'+pointUID;
		if (this.pairs.get(n))
			return this;
		await f();
		this.pairs.set(n,"check");
		return this;
	}
}

const kvFiles:Map<string, KVFile> = new Map<string,KVFile>();
export function unique(p:string) {
	const gkv = kvFiles.get(p);
	if (gkv) return gkv;
	const nkv = new KVFile(p);
	kvFiles.set(p, nkv);
	return nkv;
}