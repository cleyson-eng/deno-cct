import { resolve } from 'https://deno.land/std@0.154.0/path/mod.ts';
import { cacheDir } from '../base/cache.ts';
import { Arch, BuildType, PA, Platform } from '../base/target.ts';
import { PackageBuild, PackageInfo } from './api_package.ts';
import { LIBS } from './repo/_.ts';

/* "life cycle" of package:
	ps = loadPackage(name, version)  //import
	p = PkgManagerInterface->setupPackage(ps) //setup paths and instantiate objects

	>> download/cache required resource and configure (can be done in any order and async)
	await p.info.getSource(async?)
	how to fill preferences = p.info.requests()

	>> build (ever sync)
		Obs.: ever in order, first the dependence, second dependent
	PkgManagerInterface->build(p, preferences)
*/

export interface PackageScript {
	build:typeof PackageBuild,
	info:typeof PackageInfo,
	name:string,
	version:string
}
export interface PackageInstance {
	build:PackageBuild,
	info:PackageInfo,
}
function findTargetCompatible(target:PA, c:string[]) {
	return c.map((x)=>{
		const t = x.split('-');
		return {platform:t[0], arch:t[1]} as PA;
	}).find((x)=>{
		if (x.platform != Platform.ANY &&
			target.platform != Platform.ANY &&
			x.platform != target.platform)
			return false;
		if (x.arch != Arch.ANY &&
			target.arch != Arch.ANY &&
			x.arch != target.arch)
			return false;
	})  == undefined;
}
export function getPackageList(target:PA = {platform:Platform.ANY,arch:Arch.ANY}) {
	return Object.keys(LIBS).filter((nlib)=>{
		const c = LIBS[nlib];
		if (c['@no-target'] && findTargetCompatible(target, c['@no-target']))
			return false;
		if (c['@target'] && !findTargetCompatible(target, c['@target']))
			return false;
		return true;
	}).map((k)=>{
		const c = LIBS[k];
		const vs:string[] = [];
		Object.keys(c).filter((x)=>!x.startsWith('@')).forEach((x)=>{
			vs.push(...(c[x]as string[]));
		});
		return {
			name:k,
			versions:vs.filter((x,xi,xarr)=>xi==xarr.indexOf(x))
		};
	}).filter((x)=>x.versions.length > 0);
}
const loadPackageCache = new Map<string,{build:typeof PackageBuild, info:typeof PackageInfo}>();
const packageRoot = new URL('./repo/', import.meta.url).href;
export async function loadPackage(name:string, version:string):Promise<PackageScript|undefined> {
	const cached = loadPackageCache.get(`${name}@${version}`);
	if (cached)
		return {
			build:cached.build,
			info:cached.info,
			name,
			version
		};
	if (LIBS[name] == undefined)
		return undefined;
	const c = LIBS[name];
	const file = Object.keys(c).filter((x)=>!x.startsWith('@')).find((x)=>c[x] && c[x].indexOf(version) >=0);
	if (file == undefined)
		return undefined;
	const fpath = new URL(c+(file=='.ts'?'.ts':('/'+file)), packageRoot).href;
	const isc = await import(fpath);
	
	loadPackageCache.set(`${name}@${version}`,{
		build:isc.build as typeof PackageBuild,
		info:isc.info as typeof PackageInfo,
	})
	return {
		build:isc.build as typeof PackageBuild,
		info:isc.info as typeof PackageInfo,
		name,
		version
	};
}
export class PkgManagerInterface {
	pkgCache:Readonly<string>;
	target:Readonly<PA>;
	symlinkLocal?:string;
	constructor(dir:string = resolve(cacheDir, 'pkg'), target:PA, symlinkLocal?:string) {
		this.pkgCache = dir;
		this.target = target;
		if (symlinkLocal)
			this.symlinkLocal = resolve(symlinkLocal, this.target.platform+'-'+this.target.arch);
	}
	getPackageList() { return getPackageList(this.target); }
	setupPackage(x:PackageScript):PackageInstance {
		const info = new x.info(this.target, x.name, x.version, resolve(this.pkgCache, 'src', x.name, x.version));
		return {
			build:new x.build(info, resolve(this.pkgCache, this.target.platform+'-'+this.target.arch, 'bld', x.name, x.version)),
			info
		}
	}
	async build(x:PackageInstance, opts:Record<string, string|BuildType|undefined>) {
		const requests = x.build._requests;
		const ks = Object.keys(requests);
		for (let i = 0; i < ks.length; i++) {
			const k = ks[i];
			const vv = requests[k];
			const cv = opts[k];
			if (cv == undefined) {
				if (vv.defautValue)
					opts[k] = vv.defautValue;
				else if (vv.possibleValues && vv.possibleValues.length>0)
					opts[k] = vv.possibleValues[0];
				else if (!vv.optional)
					return `undefined propertie "${k}"`;
				continue;
			}
			if (vv.type == 'prop' && vv.possibleValues) {
				if (vv.possibleValues.indexOf(cv+"") < 0)
					return `invalid value for "${k}":"${cv}" (valids:${JSON.stringify(vv.possibleValues)})`;
			} else if (vv.type == 'lib') {
				opts[k] = this.solveDependence(cv+"", (vv.libPrefs?vv.libPrefs:(new Map<string, string[]>())), `${x.info.packName}@${x.info.packVersion}`);
			}
		}
		await x.build.IBuild(opts);
	}
	// name[@version], compatibility requirements => name@version/hash
	solveDependence(name:string, requirements:Map<string, string[]>, requiredBy:string, ignoreSymlinkLocal?:boolean):string {
		return '';
	}
}