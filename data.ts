import * as afs from './util/agnosticFS.ts';
import { path } from './deps.ts';
import * as target from './util/target.ts';

/*
FS:
{CWD}/build/
	kv.json (global level)
	host-{host platform}/
		kv.json (host level)
		{target platform}/
			kv.json (target(cur) level)
			[PROJECT]
		[PROJECT]
	[PROJECT]

PROJECT:
	{project}/
		out(-{build type})/ has symbolic links or product of /build
			executable
			static/ ...
			dynamic/ ...
		build(-{build type})/ build process files
		cache/ used to store source of in cct imported & build libraries

*/
export enum Scope {
	GLOBAL,
	HOST,
	TARGET,
}
export function root(scope:Scope, ...p:string[]) {
	let r = '';
	switch (scope) {
	case Scope.GLOBAL:r=outPath;break;
	case Scope.HOST:r=outPathHost;break;
	case Scope.TARGET:r=outPathCur;break;
	}
	return path.resolve(r, ...p);
}
export function kv(scope:Scope) {
	switch (scope) {
	default:
	case Scope.GLOBAL:return kvGlobal;
	case Scope.HOST:return kvHost;
	case Scope.TARGET:{
		if (kvCur == undefined)
			throw "Unset target, use [data.ts].setCurrentTarget(Platform&Arch)";
		return kvCur as KVFile;
	}}
}
export function projectRoot(name:string) {
	return (scope:Scope, ...p:string[])=>{
		return path.resolve(root(scope), name, ...p);
	};
}

const outPath = (()=>{
	let ret = Deno.cwd();//new URL('.', import.meta.url).pathname;
	if (ret.match(/^(\/[A-Z]):\//))
		ret = ret.substring(1);
	console.log(ret);
	Deno.args.find((x)=>{
		if (x.startsWith('cache=') && x.length > 6) {
			const config = (x.charAt(6) == '"')?x.substring(7, x.length - 1):x.substring(6);
			ret = path.resolve(ret, config);
			return true;
		}
		return false;
	})
	return path.resolve(ret, 'build');
})();
const outPathHost = path.resolve(outPath, 'host-'+target.hostPA.platform+'-'+target.hostPA.arch);
let outPathCur = '';

export let curTarget:target.PA;

export class KVFile {
	private f:()=>void;
	pairs:Map<string,string>;
	constructor(p:string) {
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
		removeEventListener('unload', this.f);
	}
	//utils
	markProgress(pointUID:string, f:()=>void) {
		const n = '[PP]'+pointUID;
		if (this.pairs.get(n))
			return;
		f();
		this.pairs.set(n,"check");
	}
	async markProgressAsync(pointUID:string, f:()=>Promise<void>) {
		const n = '[PP]'+pointUID;
		if (this.pairs.get(n))
			return;
		await f();
		this.pairs.set(n,"check");
	}
}

const kvGlobal = new KVFile(outPath);
const kvHost = new KVFile(outPathHost);
let kvCur:undefined|KVFile;

export function setCurrentTarget(x:target.PA) {
	curTarget = x;
	outPathCur = path.resolve(outPathHost, x.platform+'-'+x.arch);
	if (kvCur != undefined)
		kvCur.dispose();
	kvCur = new KVFile(outPathCur);
}

export function getHome () {
	//unix/linux
	let r = Deno.env.get('HOME');
	if (r) return r;
	//windows
	r = Deno.env.get('HOMEPATH')
	if (r) return r;
	return undefined;
}

export interface LibraryMeta {
	pa:target.PA
	uname:string,
	debug?:boolean,
	inc?:string[],
	bin?:string[],
}