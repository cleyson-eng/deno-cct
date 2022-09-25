import { PA, BuildType } from '../base/target.ts'
import { resolve } from 'https://deno.land/std@0.154.0/path/mod.ts';
import { exists } from '../base/utils.ts';
import { listRequirement, loadToolsForTarget } from '../base/interfaces.ts';
import { exitError } from '../base/exit.ts';
import * as base64 from 'https://denopkg.com/chiefbiiko/base64/mod.ts';

export class PackageBuild {
	packName:Readonly<string>
	packVersion:Readonly<string>
	packTarget:Readonly<PA>
	cacheSource:Readonly<string>
	cacheBuildRoot:Readonly<string>
	_requests:Record<string, RequestType>

	optionsHash = '';
	preferences:Record<string, string|BuildType|undefined> = {};
	output_build = '';
	output = '';
	
	build():Promise<void> { throw 'unimplemented'}
	async IBuild(preferences:Record<string, string|BuildType|undefined>) {
		this.optionsHash = await hashOpts(this._requests, preferences);
		this.preferences = preferences;
		this.output = resolve(this.cacheBuildRoot, this.optionsHash);
		this.output_build = resolve(this.output, 'build');

		await this.build();

		//on sucessfull compilation, save used preferences (as reference and dependence validation).
		Deno.writeTextFileSync(resolve(this.output, 'OPTIONS.json'), JSON.stringify(preferences));
	}

	constructor(
		info:PackageInfo,
		cacheBuildRoot:string,
	) {
		this.packTarget = info.packTarget;
		this.packName = info.packName;
		this.packVersion = info.packVersion;
		this._requests = info.requests();
		this.cacheSource = info.cacheFolder;

		this.cacheBuildRoot = cacheBuildRoot;
	}
	_lostProgress = false;
	async markProgressBuild(stop_name:string, method:()=>void|Promise<void>) {
		const file = resolve(this.output_build, "MARK-Build-"+stop_name+".txt");
		if (this._lostProgress || !exists(file)) {
			this._lostProgress = true;
			const r = method();
			if (r) await r;
			Deno.writeTextFileSync(file, '');
		}
	}
	async markProgressSource(stop_name:string, method:()=>void|Promise<void>) {
		const file = resolve(this.cacheSource, "MARK-"+stop_name+".txt");
		if (this._lostProgress || !exists(file)) {
			this._lostProgress = true;
			const r = method();
			if (r) await r;
			Deno.writeTextFileSync(file, '');
		}
	}
	async getTool(name:string) {
		const t = (await loadToolsForTarget(this.packTarget)).get(name);
		if (t == undefined) {
			exitError(`Package Error: not found "${name}" (itool)`);
			throw '';
		}
		return t;
	}
	getRequirement(name:string) {
		const t = listRequirement.find((x)=>x.name==name);
		if (t == undefined) {
			exitError(`Package Error: not found "${name}" (irequirement)`);
			throw '';
		}
		return t;
	}

}
export interface RequestType {
	optional?:boolean
	type:"lib"|"prop"
	//prop name/ lib name(name[@version])
	possibleValues?:string|string[]
	//prefer this value, if not specified
	defautValue?:string
	/*
	this says that libraries with different values in these properties be compatibles and
	intercalable in a link/dependence relation, and its ignored in gen of configuration hash.
	*/
	linkInvariant?:boolean
	//set aceptable values preferencial/required values.
	libPrefs?:Map<string, string[]>
}
export class PackageInfo {
	packName:Readonly<string>
	packVersion:Readonly<string>
	packTarget:Readonly<PA>

	cacheFolder:Readonly<string>;
	constructor(
		target:PA,
		packName:string,
		packVersion:string,
		cacheFolder:string
	) {
		this.packTarget = target;
		this.packName = packName;
		this.packVersion = packVersion;

		if (this.isSourceTargetDependent())
			this.cacheFolder = resolve(cacheFolder, this.packTarget.platform+'-'+this.packTarget.arch);
		else
			this.cacheFolder = cacheFolder;
	}

	requests():Record<string, RequestType>{ throw 'unimplemented'}
	isSourceTargetDependent():boolean{ throw 'unimplemented'}
	//deno-lint-ignore no-unused-vars
	getSource(hidden:boolean):Promise<void>{ throw 'unimplemented'}
	_lostProgress = false;
	async markProgress(cacheFolder:string, stop_name:string, method:()=>void|Promise<void>) {
		const file = resolve(cacheFolder, "MARK-"+stop_name+".txt");
		if (this._lostProgress||!exists(file)) {
			this._lostProgress = true;
			const r = method();
			if (r) await r;
			Deno.writeTextFileSync(file, '');
		}
	}
}
// required libraries must be already in format "name@version/{opts hash}"
export async function hashOpts(requests:Record<string, RequestType>, opts:Record<string, string|BuildType|undefined>) {
	const values = Object.keys(opts).sort().filter((k)=>{
		if (requests[k] == undefined)
			return false;
		if (requests[k].linkInvariant)
			return false;
		return true;
	}).map((k)=>opts[k]+"");
	if (values.length == 0)
		return 'default';
	const data = (new TextEncoder()).encode(
		values.join('')
	);
	return base64.fromUint8Array(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
}