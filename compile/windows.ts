import { tArch, TScope, Arch, Platform, hostPA } from '../util/target.ts';
import { runCmake } from './common/cmake.ts';
import { exitError } from '../util/exit.ts';
import { path } from '../deps.ts';
import { kvf } from '../util/cache.ts';
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
const VCPP_Coverage = [
	'-DCMAKE_EXE_LINKER_FLAGS_DEBUG="/PROFILE"',
	'-DCMAKE_MODULE_LINKER_FLAGS_DEBUG="/PROFILE"',
	'-DCMAKE_SHARED_LINKER_FLAGS_DEBUG="/PROFILE"',
	'-DCMAKE_STATIC_LINKER_FLAGS_DEBUG="/PROFILE"', //aparently not applyable to static libraries, but...

	'-DCMAKE_C_FLAGS_DEBUG="/Zi"',
	'-DCMAKE_CXX_FLAGS_DEBUG="/Zi"',

];

export function castDynamicEver(x:RuntimeReplace):RuntimeReplace {
	let v = x as string;
	if (v.length>=2 && v[v.length-1] == ' ')
		v = v.substring(0, v.length-1)+'!';
	return v.replace('!', 'DLL') as RuntimeReplace;
}
export function replaceRuntimeProjects(p:string, rt:RuntimeReplace, winrt:boolean) {
	afs.search(p, (p:string, isFile:boolean)=>{
		if (isFile && path.extname(p) == ".vcxproj") {
			let txt = afs.readTextFile(p)
				.replace(/\<RuntimeLibrary\>\s+?([A-Za-z]+)\s+\<\/RuntimeLibrary\>/g, (_,tc)=>`<RuntimeLibrary>MultiThreaded${
					rt.replace('?', tc.indexOf('Debug')>0?'Debug':'')
						.replace('!', tc.indexOf('DLL')>0?'DLL':'')
						.replaceAll(' ','')
				}</RuntimeLibrary>`);
			if (winrt) {
				txt = txt.replaceAll("<CompileAsWinRT>true</CompileAsWinRT>", "<CompileAsWinRT>false</CompileAsWinRT>");
			}
			afs.writeTextFile(p,
				txt,
				{ifdiff:true}
			);
		}
		return true;
	});
}

//uwp
function sdkvsUWP () {
	const tmp = kvf.get("uwp-sdks");
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
	kvf.set("uwp-sdks", r.join(';'));
	return r;
}

export async function CMake(platform:Platform.WINDOWS|Platform.UWP, arch:Arch, args:string[], sdkvUWP = "", runtimeReplace:RuntimeReplace=RuntimeReplace.X_X, winrt:boolean = true) {
	if (hostPA.platform != Platform.WINDOWS)
		throw exitError(`[CMake.vcpp] Incompatible host platform`);
	
	const extrargs:string[] = ['-A', tArch.iot(arch, TScope.VCPP)];
	if (platform == Platform.UWP) {
		runtimeReplace = castDynamicEver(runtimeReplace);
		const sdks = sdkvsUWP();
		if (sdks == null)
			throw exitError(`[CMake.vcpp] Cant found any UWP sdk`);
		let rsdk = false;
		for (let i = 0; i < sdks.length; i++) {
			if (sdks[i].startsWith(sdkvUWP) || sdkvUWP.startsWith(sdks[i])) {
				rsdk = true;
				break;
			}
		}
		if (!rsdk)
			throw exitError(`[CMake.vcpp] Cant found any UWP sdk compatible with "${sdkvUWP}" (${sdks.join(', ')})`);
		
		extrargs.push('-DCMAKE_SYSTEM_NAME=WindowsStore','-DCMAKE_SYSTEM_VERSION='+ sdkvUWP);
	}

	return await runCmake({
		pass:args,
		pa:{arch,platform},
		config_additional_args:extrargs,
		posconfig:(dst)=>replaceRuntimeProjects(dst, runtimeReplace, winrt),
		release_fast_opt:'Ot',
		release_min_opt:'Os',
		coverage_args:VCPP_Coverage
	});
}


