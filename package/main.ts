import { resolve } from 'https://deno.land/std@0.154.0/path/mod.ts';
import { cacheDir } from '../base/cache.ts';
import { exitError } from '../base/exit.ts';
import { Arch, BuildType, PA, Platform } from '../base/target.ts';
import { debugInfoPackage, PackageMaker } from './api_package.ts';
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

export interface PackageClass {
	clazz:typeof PackageMaker,
	name:string,
	version:string
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
const loadPackageCache = new Map<string,PackageClass>();
const packageRoot = new URL('./repo/', import.meta.url).href;
export async function loadPackage(name:string, version:string):Promise<PackageClass|undefined> {
	const cached = loadPackageCache.get(`${name}@${version}`);
	if (cached)
		return cached;
	if (LIBS[name] == undefined)
		return undefined;
	const c = LIBS[name];
	const file = Object.keys(c).filter((x)=>!x.startsWith('@')).find((x)=>c[x] && c[x].indexOf(version) >=0);
	if (file == undefined)
		return undefined;
	const fpath = new URL(c+(file=='.ts'?'.ts':('/'+file)), packageRoot).href;
	const isc = await import(fpath);
	
	const r = {
		clazz:isc.D as typeof PackageMaker,
		name,
		version
	};
	loadPackageCache.set(`${name}@${version}`, r)
	return r;
}
export class PkgManagerInterface {
	pkgCache:Readonly<string>;
	target:Readonly<PA>;
	constructor(dir:string = resolve(cacheDir, 'pkg'), target:PA) {
		this.pkgCache = dir;
		this.target = target;
	}
	getPackageList() { return getPackageList(this.target); }
	setupPackage(x:PackageClass):PackageMaker {
		return new x.clazz(this.target, x.name, x.version, this.pkgCache);
	}
	async build(x:PackageMaker, opts:Record<string, string|BuildType|undefined>) {
		const ks = Object.keys(x.packOptions);
		for (let i = 0; i < ks.length; i++) {
			const k = ks[i];
			const vv = x.packOptions[k];
			const cv = opts[k];
			if (cv == undefined) {
				if (vv.defautValue)
					opts[k] = vv.defautValue;
				else if (vv.possibleValues && vv.possibleValues.length>0)
					opts[k] = vv.possibleValues[0];
				else if (!vv.optional)
					exitError(debugInfoPackage(x)+`>> undefined propertie "${k}"`);
				continue;
			}
			if (vv.type == 'prop' && vv.possibleValues) {
				if (vv.possibleValues.indexOf(cv+"") < 0)
					exitError(debugInfoPackage(x)+`>> invalid value for "${k}":"${cv}" (valids:${JSON.stringify(vv.possibleValues)})`);
			} else if (vv.type == 'lib') {
				opts[k] = this.ISolveDependence(cv+"", (vv.libPrefs?vv.libPrefs:(new Map<string, string[]>())), debugInfoPackage(x));
			}
		}
		await x.IBuild(opts);
	}
	private ISolveDependence(x:string, requirements:Map<string, string[]>, requiredBy:string):string {
		const res = /([^\/\@]+)(?:\@([^\/]+)(?:\/([\S]+))?)?/.exec(x);
		let name = '';
		let version = '';
		let hash = '';
		if (res) {
			if (res[1])
				name = res[1];
			if (res[2])
				version = res[2];
			if (res[3])
				hash = res[3];
		}
		throw 'unimplemented';
		return '';
	}
}