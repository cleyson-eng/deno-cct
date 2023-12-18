import { PA } from '../util/target.ts';
import { path } from '../deps.ts';
import { exitError } from '../util/exit.ts';
import { BuildType } from '../util/target.ts';
import { writeTextFile } from '../util/agnosticFS.ts';

export interface LibraryMetaCompatible {
	pa:PA
	name:string,
	version?:string,
	btype:BuildType,
	inc?:string[],
	bin?:string[],
	defs?:Record<string,any>;
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
export interface LibraryMetaFilterALib {
	name:string
	required:boolean
	filter:LibraryMetaFilter
}

export class LibraryMeta {
	pa:PA
	name:string
	version:string
	btype:BuildType
	debug:boolean
	inc:string[]
	bin:string[]
	defs:Record<string,any>;
	constructor (x:LibraryMetaCompatible) {
		this.pa = x.pa;
		this.name = x.name;
		this.version = x.version?x.version:"0.0.0";
		this.btype = x.btype;
		this.debug = x.btype == BuildType.DEBUG || x.btype == BuildType.DEBUG_COVERAGE;
		this.inc = x.inc?x.inc:[];
		this.bin = x.bin?x.bin:[];
		this.defs = x.defs?x.defs:{};
		this.defs['HAS_'+x.name] = 1;
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
	static multFilter(x:LibraryMeta[], req:LibraryMetaFilterALib[]):LibraryMeta[] {
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
					return true;
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
	static multFilterOne(x:LibraryMeta[], req:LibraryMetaFilterALib):LibraryMeta|undefined {
		return this.multFilter(x, [req])[0];
	}
	cmakeDefs():string {
		const r = 
`set(CCT_${this.name}_VERSION ${this.version})
set(CCT_${this.name}_INC ${this.inc.map((x)=>JSON.stringify(x)).join(' ')})
set(CCT_${this.name}_BIN ${this.getBinLinkables().map((x)=>JSON.stringify(x)).join(' ')})
set(CCT_${this.name}_CPY ${this.getBinDynamics().map((x)=>JSON.stringify(x)).join(' ')})
set(CCT_${this.name}_DEFS ${Object.keys(this.defs).map((k)=>`${k}=${this.defs[k]}`).join(' ')})`;
		return r;
	}
	static multCmakeDefs(fpath:string, libs: LibraryMeta[], collapse?:string) {
		let r = libs.map((x)=>x.cmakeDefs()).join('\n');
		if (collapse) {
			r +=`
set(${collapse}_INC ${libs.map((x)=>`\${CCT_${x.name}_INC}`).join(' ')})
set(${collapse}_BIN ${libs.map((x)=>`\${CCT_${x.name}_BIN}`).join(' ')})
set(${collapse}_CPY ${libs.map((x)=>`\${CCT_${x.name}_CPY}`).join(' ')})
set(${collapse}_DEFS ${libs.map((x)=>`\${CCT_${x.name}_DEFS}`).join(' ')})`;
		}
		writeTextFile(fpath, r, {
			ifdiff:true,
			mkdir:true,
		})
	}
	merge(x:LibraryMeta, opts?:{inc:boolean, bin:boolean, defs:boolean}) {
		if (opts == undefined || opts.inc)
			this.inc.push(...x.inc);
		if (opts == undefined || opts.bin)
			this.bin.push(...x.bin);
		if (opts == undefined || opts.defs)
			Object.keys(x.defs).forEach((k)=>this.defs[k] = x.defs[k])
	}
	normalize() {
		this.inc = this.inc.filter((x, xi, xarr)=>xi==xarr.findIndex((sx)=>sx == x));
		this.bin = this.bin.filter((x, xi, xarr)=>xi==xarr.findIndex((sx)=>sx == x));
	}
}
function filterHasBit (x:LibraryMetaFilter, has:LibraryMetaFilter) {
	return ((x as number / has as number) % 2) == 1;
}