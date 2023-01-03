import { PA } from './util/target.ts';
import { path } from './deps.ts';
import { exitError } from './util/exit.ts';

export interface LibraryMetaCompatible {
	pa:PA
	name:string,
	version?:string,
	debug?:boolean,
	inc?:string[],
	bin?:string[],
}
export enum LibraryMetaFilter {
	DEBUG_ONLY = 1,
	DEBUG_PREFER = 2,
	NDEBUG_ONLY = 4,
	NDEBUG_PREFER = 8,

	DYN_ONLY = 16,
	DYN_PREFER = 32,
	STA_ONLY = 64,
	STA_PREFER = 128,
}

export class LibraryMeta {
	pa:PA
	name:string
	version:string
	debug:boolean
	inc:string[]
	bin:string[]
	constructor (x:LibraryMetaCompatible) {
		this.pa = x.pa;
		this.name = x.name;
		this.version = x.version?x.version:"0.0.0";
		this.debug = x.debug === true;
		this.inc = x.inc?x.inc:[];
		this.bin = x.bin?x.bin:[];
	}
	reorderBin(...ops:({r:RegExp,t?:"inclusive"|"exclusive"})[]) {
		let o = this.bin as string[]; 
		const n = [] as string[];

		ops.forEach((op)=>{
			const reg = op.r;
			const exc = (op.t === "exclusive");

			o = o.filter((x)=>{
				const capture = exc != (reg.exec(x) !== null);
				if (capture) {
					n.push(x);
				}
				return !capture
			});
		})
		n.push(...o);
		this.bin = n;
		return this;
	}
	static multReorderBin(x:LibraryMeta[], ...ops:({r:RegExp,t?:"inclusive"|"exclusive"})[]) {
		return x.map((x)=>x.reorderBin(...ops));
	}
	getBinDynamics() {
		return this.bin.filter((x)=>{
			const xext = path.extname(x);
			return [".dylib",".so",".dll"].find((x)=>x==xext) != undefined;
		});
	}
	getBinLinkables() {
		return this.bin.filter((x)=>{
			const xext = path.extname(x);
			return [".dll"].find((x)=>x==xext) == undefined;
		});
	}
	static multSplitByName(x:LibraryMeta[]) {
		const tm = new Map<string, LibraryMeta[]>();
		x.forEach((x)=>{
			const k = tm.get(x.name);
			if (k == undefined)
				tm.set(x.name, [x]);
			else
				k.push(x);
		});
		return tm;
	}
	static multFilter(x:LibraryMeta[], req:{name:string, required:boolean, filter:LibraryMetaFilter}[]):LibraryMeta[] {
		const ns = this.multSplitByName(x);
		const r = [] as LibraryMeta[];
		req.forEach((f)=>{
			const v = ns.get(f.name);
			if (v == undefined) {
				if (f.required)
					throw exitError("Required library not found in arguments: "+f.name);
				return;
			}
			
			const rv = 
				v.map((x)=>({x,dyn:x.getBinDynamics().length})).filter((x)=>{
					if (filterHasBit(f.filter, LibraryMetaFilter.DEBUG_ONLY) && !x.x.debug)
						return false;
					if (filterHasBit(f.filter, LibraryMetaFilter.NDEBUG_ONLY) && x.x.debug)
						return false;
					if (filterHasBit(f.filter, LibraryMetaFilter.DYN_ONLY) && x.dyn == 0)
						return false;
					if (filterHasBit(f.filter, LibraryMetaFilter.STA_ONLY) && x.dyn > 0)
						return false;
				}).sort((a,b)=>{
					let wa = 0, wb = 0;
					if (filterHasBit(f.filter, LibraryMetaFilter.DEBUG_PREFER)) {
						wa += a.x.debug?1000:-1000;
						wb += b.x.debug?1000:-1000;
					} else if (filterHasBit(f.filter, LibraryMetaFilter.NDEBUG_PREFER)) {
						wa += a.x.debug?-1000:1000;
						wb += b.x.debug?-1000:1000;
					}
					if (filterHasBit(f.filter, LibraryMetaFilter.DYN_PREFER)) {
						wa += a.dyn;
						wb += b.dyn;
					} else if (filterHasBit(f.filter, LibraryMetaFilter.STA_PREFER)) {
						wa += -a.dyn;
						wb += -b.dyn;
					}
					return wb-wa;
				})[0];
			if (rv == undefined) {
				if (f.required)
					throw exitError("Required library found but not match requirements: "+f.name);
				return;
			}
			r.push(rv.x);
		});
		return r;
	}
}
function filterHasBit (x:LibraryMetaFilter, has:LibraryMetaFilter) {
	return ((x as number / has as number) % 2) == 1;
}