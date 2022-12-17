import { archUtil, Arch, Platform, hostPA } from '../util/target.ts';
import { runCmake } from './common/cmake.ts';
import { exitError } from '../util/exit.ts';
import { path } from '../deps.ts';
import { kv, Scope } from '../data.ts';
import * as afs from '../util/agnosticFS.ts';

export enum RuntimeReplace {
	X_X = '?!',
	STATIC_X = '? ',
	STATIC_DEBUG = 'Debug ',
	STATIC_RELEASE = '  ',
	DYNAMIC_X = '?DLL',
	DYNAMIC_DEBUG = 'DebugDLL',
	DYNAMIC_RELEASE = ' DLL',
	X_DEBUG = 'Debug!',
	X_RELEASE = ' !',
}
export function castDynamicEver(x:RuntimeReplace):RuntimeReplace {
	let v = x as string;
	if (v.length>=2 && v[v.length-1] == ' ')
		v = v.substring(0, v.length-1)+'!';
	return v.replace('!', 'DLL') as RuntimeReplace;
}
export function replaceRuntimeProjects(p:string, rt:RuntimeReplace) {
	afs.search(p, (p:string, isFile:boolean)=>{
		if (isFile && path.extname(p) == ".vcxproj")
			afs.writeTextFile(p,
				afs.readTextFile(p)
					.replace(/\<RuntimeLibrary\>\s+?([A-Za-z]+)\s+\<\/RuntimeLibrary\>/g, (_,tc)=>`<RuntimeLibrary>MultiThreaded${
						rt.replace('?', tc.indexOf('Debug')>0?'Debug':'')
							.replace('!', tc.indexOf('DLL')>0?'DLL':'')
							.replaceAll(' ','')
					}</RuntimeLibrary>`),
				{ifdiff:true}
			);
		return true;
	});
}

//uwp
function getSDKVersions () {
	const tmp = kv(Scope.HOST).pairs.get("uwp-sdks");
	if (tmp)
		return tmp.split(';');

	let r:string[] = [];
	try {
		r = Array.from(afs.readDir("C:\\Program Files (x86)\\Microsoft SDKs\\Windows Kits")).map((x)=>x.name);
	} catch (_) {
		try {
			r = Array.from(afs.readDir("C:\\Program Files\\Microsoft SDKs\\Windows Kits")).map((x)=>x.name);
			//deno-lint-ignore no-empty
		} catch (_) {}
	}
	if (r.length == 0)
		return undefined;
	kv(Scope.HOST).pairs.set("uwp-sdks", r.join(';'));
	return r;
}

export async function CMake(platform:Platform.WINDOWS|Platform.UWP, arch:Arch, args:string[], uwp_version = "", runtimeReplace:RuntimeReplace=RuntimeReplace.X_X) {
	if (hostPA.platform != Platform.WINDOWS)
		throw exitError(`[CMake.vcpp] Incompatible host platform`);
	
	const extrargs:string[] = ['-A', archUtil.toVCPP(arch)];
	if (platform == Platform.UWP) {
		runtimeReplace = castDynamicEver(runtimeReplace);
		const sdks = getSDKVersions();
		if (sdks == null)
			throw exitError(`[CMake.vcpp] Cant found any UWP sdk`);
		let rsdk = '';
		for (let i = 0; i < sdks.length; i++) {
			if (sdks[i].startsWith(uwp_version))
				rsdk = sdks[i];
		}
		if (rsdk == null)
			throw exitError(`[CMake.vcpp] Cant found any UWP sdk compatible with "${uwp_version}"`);
		
		extrargs.push('-DCMAKE_SYSTEM_NAME=WindowsStore','-DCMAKE_SYSTEM_VERSION='+ rsdk);
	}

	return await runCmake({
		pass:args,
		pa:{arch,platform},
		config_additional_args:extrargs,
		posconfig:(dst)=>replaceRuntimeProjects(dst, runtimeReplace),
		release_fast_opt:'Ot',
		release_min_opt:'Os'
	});
}
