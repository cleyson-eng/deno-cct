import { PA, BuildType, Platform, Arch } from '../base/target.ts'
import { resolve } from 'https://deno.land/std@0.154.0/path/mod.ts';
import { listRequirement, loadToolsForTarget } from '../base/interfaces.ts';
import { exitError } from '../base/exit.ts';
import * as base64 from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";
import { LIBS } from './repo/_.ts';
import * as afs from '../base/agnosticFS.ts';

/////////////////////////////////
// Preference/Option Filtering //
/////////////////////////////////
export interface RequestType {
	optional?:boolean
	type:"lib"|"prop"
	possibleValues:string
	defautValue?:string
	linkInvariant?:boolean
	libPrefs?:Map<string, string>
}
export function debugInfoPackage(x:PackageMaker) {
	if (x.preferencesHash)
		return `${x.packName}@${x.packVersion}/${x.preferencesHash} => ${x.packTarget.platform}-${x.packTarget.arch}`;
	return `${x.packName}@${x.packVersion} => ${x.packTarget.platform}-${x.packTarget.arch}`;
}
// a-b
export function compareVersions(a:string, b:string) {
	const na = a.split('.').map((x)=>parseInt(x));
	const nb = b.split('.').map((x)=>parseInt(x));
	const e = na.length<nb.length?na.length:nb.length;
	for (let i = 0; i < e; i++) {
		if (na[i] != nb[i])
			return na[i] - nb[i];
	}
	return 0;
}
export function isVersionCompatible(v:string, exp:string) {
	//; (or) return valid;
	return exp.split(';').find((r)=>{
		//& (and) return !valid;
		return r.split('&').find((r)=>{
			const bigger = r.indexOf('[');
			const littler = r.indexOf(']');
			const dif = compareVersions(r.replace(/[\[\]]/g,''), v);
			if (bigger >= 0) {
				//inclusiver:exclusive
				return !(bigger==0?dif<=0:dif<0);
			}
			if (littler >= 0) {
				//exclusive:inclusiver
				return !(littler==0?dif>0:dif>=0);
			}
			return !(dif == 0);
		})==undefined;
	})!=undefined;
}
export function isPropCompatible(v:string|undefined, exp:string) {
	const vvs = exp.split(";");
	if (v == undefined)
		return vvs.find((vv)=>vv=='null'||vv=='undefined') != undefined;
	return vvs.find((vv)=>vv == v) != undefined;
}
export function isPackageCompatible(v:string, exp:string) {
	const vl = new PackageLink(v);
	return exp.split(';').find((vv)=>{
		const vvl = new PackageLink(vv);
		if (vvl.linkType != '' && vl.linkType != '' && vvl.linkType != vl.linkType)
			return false;
		if (vvl.name != '' && vl.name != '' && vvl.name != vl.name)
			return false;
		return true;
	}) != undefined;
}
export class PackageLink {
	linkType:''|'static'|'dynamic' = ''
	name=''
	version=''
	hash=''
	constructor (x?:string) {
		if (x == undefined) return;
		const res = /([\#\!])?([^\/\@]+)?(?:\@([^\/]+))?(?:\/([\S]+))?/.exec(x);
		if (res == undefined) return;
		if (res[1]) this.linkType = ((res[1]=='#')?'static':'dynamic');
		if (res[2]) this.name = res[2];
		if (res[3]) this.version = res[3];
		if (res[4]) this.hash = res[4];
	}
	toString():string {
		let strlink = '';
		switch (this.linkType) {
		case 'static':strlink='#';break;
		case 'dynamic':strlink='!';break;
		}
		let strversion = this.version;
		if (strversion.length > 0) strversion = '@'+strversion;
		let strhash = this.hash;
		if (strhash.length > 0) strhash = '/'+strhash;
		return strlink+this.name+strversion+strhash;
	}
	searchCompatible(
		cache:string,
		target:PA,
		prefFilter?:Map<string, string>,
		filterNameVersion?:(nv:string)=>boolean,
		filterNameVersionHash?:(nv:string,h:string)=>boolean
	):PackageLink[] {
		if (this.version != '' && prefFilter && prefFilter.has('@') && !isVersionCompatible(this.version, prefFilter.get('@') as string))
			return [];
		const r:PackageLink[] = [];
		let packs = Array.from(Deno.readDirSync(cache))
			.filter((x)=>x.name.indexOf('@')>0 && x.isDirectory);
		if (filterNameVersion)
			packs = packs.filter((x)=>filterNameVersion(x.name));
		packs.map((x)=>{
				const frags = x.name.split('@')
				return {
					name:frags[0],
					version:frags[1],
					full:x.name,
				};
			})
			.forEach((x)=>{
				//filter name@version
				if (this.name != '' && this.name != x.name) return;
				if (this.version != '') {
					if (this.version != x.version) return;
				} else if (prefFilter && prefFilter.has('@') && !isVersionCompatible(this.version, prefFilter.get('@') as string))
					return;
				//verify target?
				const hdir = resolve(cache, `${x.full}`, `${target.platform}-${target.arch}`);
				if (!afs.exists(hdir))
					return;
				//get valid hashs
				let hashes = Array.from(Deno.readDirSync(hdir))
					.filter((y)=>y.name != 'src' && y.isDirectory && (this.hash == '' || this.hash == y.name))
					.map((y)=>y.name);
				if (filterNameVersionHash)
					hashes = hashes.filter((y)=>filterNameVersionHash(x.full, y));
				//remove failed builds
				hashes = hashes.filter((y)=>afs.exists(resolve(cache,hdir,y,'build/OPTIONS.json')));
				//filter with prefFilter(package dependence requisition)
				if (prefFilter) {
					const pfk = Array.from(prefFilter.keys()).filter((k)=>k!='@');
					if (pfk.length > 0) {
						hashes = hashes.filter((y)=>{
							const props = JSON.parse(Deno.readTextFileSync(resolve(hdir,y,'build/OPTIONS.json')));
							return pfk.find((k)=>!isPropCompatible(props[k] as string|undefined, prefFilter.get(k) as string)) == undefined;
						})
					}
				}
				//must have a static or dynamic binaries
				let hashlink = hashes.map((y)=>{
					return {
						hash:y,
						static:afs.exists(resolve(hdir,y,'bin/sinc.json')),
						dynamic:afs.exists(resolve(hdir,y,'bin/dinc.json'))
					}
				}).filter((y)=>y.static||y.dynamic);
				//filter if exiged a specific link type
				if (this.linkType != '') {
					hashlink = hashlink.filter((y)=>
						this.linkType=='static'?
							y.static:y.dynamic
					);
				}
				//push to results
				hashlink.forEach((y)=>{
					const o = new PackageLink(x.full+'/'+y);
					if (o.linkType != '')
						o.linkType = this.linkType;
					else if (y.dynamic != y.static)
						o.linkType = y.static?'static':'dynamic';
					r.push(o);
				})
			})
		return r;
	}
}

///////////////////
// Package Maker //
///////////////////
export interface PMBinDescType {
	type:"static"|"dynamic"
	incDirs:string[]
	incBins:string[]
	incDef?:string[]
	deps?:string[]
}
export class PackageMaker {
	//to implement
	isSourceTargetDependent():boolean{ throw 'unimplemented'}
	options():Record<string, RequestType>{ throw 'unimplemented'}

	source():Promise<void>{ throw 'unimplemented'}

	build():Promise<void> { throw 'unimplemented'}

	bin():Promise<PMBinDescType[]>{ throw 'unimplemented'}

	//avaliable since getSource()
	readonly packName:string
	readonly packVersion:string
	readonly packTarget:PA

	readonly packOptions:Record<string, RequestType>
	readonly cacheSource:string

	//avaliable since build()
	preferences:Record<string, string|BuildType|undefined> = {}
	preferencesHash = ''
	cacheBuild = ''
	cacheBin = ''

	//avaliable ever but must be used only in build()
	async getTool(name:string) {
		const t = (await loadToolsForTarget(this.packTarget)).get(name);
		if (t == undefined) {
			this.stageThrow(`cant found "${name}" (itool)`);
			throw '';
		}
		return t;
	}
	getRequirement(name:string) {
		const t = listRequirement.find((x)=>x.name==name);
		if (t == undefined) {
			this.stageThrow(`cant found "${name}" (irequirement)`);
			throw '';
		}
		return t;
	}
	getIncJSON(x:PackageLink, defaultLink?:'static'|'dynamic') {
		if (x.name == '' || x.version == '' || x.hash == '') {
			this.stageThrow(`getIncJSON, incomplete dependence link: ${x.toString()}`);
			throw '';
		}
		let lt = x.linkType;
		if (lt == '')
			lt = defaultLink?defaultLink:'static';
		return resolve(
			this.cache, `${x.name}@${x.version}`, this._getPAString(), x.hash,
			'bin', (lt=='static'?'sinc.json':'dinc.json')
		);
	}
	//avaliable ever
	// p[rogress]: 0.0~1.0 (-1 = unknow)
	postAsyncStatus(p:number, t:string) { this._status = {p,t}; }
	stageThrow(err:string) {
		let stg = '';
		switch (this._markProgress_stage) {
		case 0: stg = 'acquisition(source) stage';break;
		case 1: stg = 'build stage';break;
		case 2: stg = 'meta(bin) stage';break;
		}
		exitError(`${debugInfoPackage(this)}>${stg}> ${err}`);
	}
	async saveProgress(...method:(()=>void|Promise<void>)[]) {
		for (let  i = 0; i < method.length; i++) {
			if (this._lastProgress <= this._currentProgress) {
				try {
					const r = method[i]();
					if (r) await r;
					this._currentProgress++;
					this._saveProgress();
				} catch(e) {
					if (e !== '')
						this.stageThrow(e);
					throw '';
				}
			}
			this._currentProgress++;
		}
	}
	//internal
	_status = {p:-1,t:''}
	private _lastProgress = 0;
	private _currentProgress = 0;
	private _markProgress_stage = 0;
	private _progressPath() {
		let cfolder = '';
		switch (this._markProgress_stage) {
		case 0: cfolder = this.cacheSource;break;
		case 1: cfolder = this.cacheBuild;break;
		case 2: cfolder = this.cacheBin;break;
		}
		return resolve(cfolder, 'PROGRESS');
	}
	private _saveProgress(jump_stage?:boolean) {
		if (jump_stage)
			this._currentProgress = -2;
		if (this._lastProgress == this._currentProgress)
			return;
		const file = this._progressPath();
		afs.mkdirFile(file);
		Deno.writeTextFileSync(file, this._currentProgress.toString());
	}
	private _loadProgress():boolean {
		this._currentProgress = 0;
		const file = this._progressPath();
		if (afs.exists(file))
			this._lastProgress = parseInt(Deno.readTextFileSync(file));
		else
			this._lastProgress = 0;
		return this._lastProgress != -2;
	}
	private cache:string;
	private _getNameVersion() {
		return `${this.packName}@${this.packVersion}`;
	}
	private _getPAString() {
		return this.packTarget.platform+'-'+this.packTarget.arch
	}

	constructor(
		target:PA,
		packName:string,
		packVersion:string,
		cache:string
	) {
		this.packTarget = target;
		this.packName = packName;
		this.packVersion = packVersion;

		this.cache = cache;
		if (this.isSourceTargetDependent())
			this.cacheSource = resolve(cache, this._getNameVersion(), this._getPAString(), 'src');
		else
			this.cacheSource = resolve(cache, this._getNameVersion(), 'src');
		this.packOptions = this.options()
	}

	private async _hashOpts():Promise<void> {
		const values = Object.keys(this.preferences).sort().filter((k)=>{
			if (this.packOptions[k] == undefined || this.packOptions[k].linkInvariant)
				return false;
			return true;
		}).map((k)=>this.preferences[k]+"");
		if (values.length == 0) {
			this.preferencesHash = 'default';
			return;
		}
		this.preferencesHash = base64.fromUint8Array(new Uint8Array(
			await crypto.subtle.digest(
				'SHA-256',
				(new TextEncoder()).encode(values.join(''))
			)
		));
	}
	async ISouce() {
		this._markProgress_stage = 0;
		if (this._loadProgress()) {
			try {
				await this.source();
				this._saveProgress(true);
			} catch(e) {
				if (e !== '')
					this.stageThrow(e);
				throw '';
			}
		}
	}
	async IBuild(
		preferences:Record<string, string|BuildType|undefined>,
		includeFilterNameVersion?:(nv:string)=>boolean,
		includeFilterNameVersionHash?:(nv:string,h:string)=>boolean
	) {
		this._markProgress_stage = 1;
		this.preferences = preferences;
		await this._hashOpts();
		this._validatePreferences(
			includeFilterNameVersion,
			includeFilterNameVersionHash
		);

		const cdir = resolve(this.cache, this._getNameVersion(), this._getPAString(), this.preferencesHash);
		this.cacheBuild = resolve(cdir, 'build');
		this.cacheBin = resolve(cdir, 'bin');

		if (this._loadProgress()) {
			try {
				await this.build();
				this._saveProgress(true);
			} catch(e) {
				if (e !== '')
					this.stageThrow(e);
				throw '';
			}
		}

		//on sucessfull build save used preferences (as reference and dependence validation).
		Deno.writeTextFileSync(resolve(this.cacheBuild, 'OPTIONS.json'), JSON.stringify(preferences));
		//save links to external packages
		const links = Object.keys(this.preferences).sort().filter((k)=>!(
			this.packOptions[k] == undefined ||
			this.packOptions[k].linkInvariant ||
			this.packOptions[k].type != 'lib'
		)).map((k)=>this.preferences[k]+"");
		if (links.length > 0)
			Deno.writeTextFileSync(resolve(this.cacheBuild, 'LINKS.json'), JSON.stringify(links));
	}
	async IBin() {
		this._markProgress_stage = 2;
		if (this._loadProgress()) {
			try {
				afs.mkdir(this.cacheBin);
				const res = await this.bin();
				const rstatic = res.filter((x)=>x.type=='static');
				const rdynamic = res.filter((x)=>x.type=='dynamic');
				if (rstatic.length>0)
					afs.writeTextFile(resolve(this.cacheBin, 'sinc.json'), JSON.stringify(rstatic[0]));
				if (rdynamic.length>0)
					afs.writeTextFile(resolve(this.cacheBin, 'dinc.json'), JSON.stringify(rdynamic[0]));
				this._saveProgress(true);
			} catch(e) {
				if (e !== '')
					this.stageThrow(e);
				throw '';
			}
		}
	}
	private _validatePreferences(
		includeFilterNameVersion?:(nv:string)=>boolean,
		includeFilterNameVersionHash?:(nv:string,h:string)=>boolean
	) {
		const ks = Object.keys(this.packOptions);
		for (let i = 0; i < ks.length; i++) {
			const k = ks[i];
			const vv = this.packOptions[k];
			if (this.preferences[k] == undefined) {
				if (vv.defautValue)
					this.preferences[k] = vv.defautValue;
				else if (vv.possibleValues && vv.possibleValues.length>0)
					this.preferences[k] = vv.possibleValues.split(';')[0];
				else if (!vv.optional)
					this.stageThrow(`undefined option "${k}" required by package`);
				continue;
			}
			if (vv.type == 'prop' && vv.possibleValues) {
				if (!isPropCompatible(this.preferences[k] as string|undefined, vv.possibleValues))
					this.stageThrow(`invalid value "${k}":"${this.preferences[k]}" (valids:${vv.possibleValues})`);
			} else if (vv.type == 'lib' && this.preferences[k]) {
				if (vv.possibleValues && !isPackageCompatible(this.preferences[k] as string, vv.possibleValues))
					this.stageThrow(`invalid value "${k}":"${this.preferences[k]}" (valids:${vv.possibleValues})`);
				const comps = (new PackageLink(this.preferences[k] as string)).searchCompatible(
					this.cache,
					this.packTarget,
					vv.libPrefs,
					includeFilterNameVersion,
					includeFilterNameVersionHash
				);
				if (comps.length <= 0)
					this.stageThrow(`package "${k}":"${this.preferences[k]}" not found a valid pre build configuration (package filter:${vv.possibleValues}, preference filter: ${JSON.stringify(vv.libPrefs)})`);
				this.preferences[k] = comps[0].toString();
			}
		}
	}
}

/////////////////
// REPO Loader //
/////////////////
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
const packageRepoRoot = new URL('./repo/', import.meta.url).href;
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
	const fpath = (new URL(name+(file=='.ts'?'.ts':('/'+file)), packageRepoRoot)).href;
	const isc = await import(fpath);
	
	const r = {
		clazz:isc.D as typeof PackageMaker,
		name,
		version
	};
	loadPackageCache.set(`${name}@${version}`, r)
	return r;
}