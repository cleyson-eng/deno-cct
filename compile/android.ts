import { tArch, TScope, Arch, Platform, hostPA } from '../util/target.ts';
import { runCmake } from './common/cmake.ts';
import { exitError } from '../util/exit.ts';
import { CToolchain } from '../util/target.ts';
import { path } from '../deps.ts';
import { kvf } from '../util/cache.ts';
import * as afs from '../util/agnosticFS.ts';

export async function CMake(arch:Arch, args:string[], sdk_version?:number) {
	if (hostPA.platform == Platform.ANDROID) {
		if (hostPA.arch != arch)
			throw exitError('[CMake.android] on android only support the host architecture (provisore support)');
		
		console.log('[CMake.android] (!) android on android provisore build, SDK version ignored');
		return await runCmake({
			pass:args, pa:{arch,platform:Platform.ANDROID}
		});
	}

	let sdk = 0;
	if (sdk_version) sdk = sdk_version;
	else {
		const tmp = sdkvsNDK();
		if (tmp == undefined || tmp.length == 0)
			throw exitError('[CMake.android] Cant found any NDK (sdk) version');
		sdk = tmp.sort((a,b)=>b-a)[0];
	}
	
	const config = require_ndk(sdk);
	if (config == undefined)
		throw exitError(`[CMake.android] Cant found the NDK (sdk ${sdk}) version`);

	return await runCmake({
		pass:args, pa:{arch,platform:Platform.ANDROID},
		config_additional_args:[
			`-DCMAKE_TOOLCHAIN_FILE="${config.cmakeTC}"`,
			`-DANDROID_ABI=${tArch.iot(arch, TScope.AS)}`,
			`-DANDROID_NATIVE_API_LEVEL=${config.sdk}`
		],
	});
}

//find
export interface NDKPaths {
	sdk:number
	cmakeTC:string
	nativeTC:Map<string, CToolchain>
}
export function require_ndk_root() {
	let tmp = kvf.get('ndk-root');
	if (tmp)
		return tmp;
		
	//kv(Scope.USER).pairs.delete('ndk-paths');
	tmp = afs.homedir();
	if (tmp == undefined) return;

	let ndk_root = path.resolve(tmp, 'Android/Sdk/ndk');

	if (!afs.exists(ndk_root, {mustbeFolder:true})) {
		console.log('[NDK] not found ndk versions root folder, supposed to be in: '+ndk_root);
		return;
	}
	const versions = Array.from(afs.readDir(ndk_root)).filter((x)=>x.isDirectory).map((x)=>{
		let weight = 0;
		const name = x.name;
		let si = 0;
		let i = 0;
		for (;i < name.length; i++) {
			const cv = name.charCodeAt(i);
			if (cv < 48 || cv > 57) {
				if (i - si > 1)
					weight = parseInt(name.substring(si, i)) + (weight * 1000);
				si = i;
			}
		}
		if (i != si)
			weight = parseInt(name.substring(si, i)) + (weight * 1000);
		return {name, weight};
	}).sort((a,b)=>b.weight - a.weight);
	if (versions.length == 0) {
		console.log('[NDK] not found ndk versions, empty: '+ndk_root);
		return;
	}
	ndk_root = path.resolve(ndk_root, versions[0].name);


	kvf.set('ndk-root', ndk_root);
}
function getNDKbin(p:string) {
	p = path.resolve(p, 'toolchains/llvm/prebuilt');
	if (!afs.exists(p))
		return;
	const proot = Array.from(Deno.readDirSync(p)).find((f)=>afs.exists(path.resolve(p, f.name, 'bin')))
	if (proot == undefined)
		return;
	return path.resolve(p, proot.name, 'bin');
}
export function sdkvsNDK() {
	const p = require_ndk_root();
	if (p == undefined) return;

	const pbin = getNDKbin(p);
	if (pbin == undefined) {
		console.log(`[NDK] not found ndk bin folder in: "${p}"`);
		return;
	}

	const versions = 
		Array.from(Deno.readDirSync(pbin))
			.map((x)=>{
				const res = /android([0-9]+)-clang/g.exec(x.name);
				return res && res[1]?parseInt(res[1]):undefined
			})
			.filter((x)=>x)
			.filter((x, xi, xarr)=> xarr.indexOf(x) == xi)
			.sort() as number[];
	if (versions.length > 0)
		return versions;
	console.log(`[NDK] not found SDK versions in: "${pbin}"`);
	return;
}
export function require_ndk(sdk:number) {
	const sdks = sdkvsNDK();
	if (sdks == undefined)
		return;

	const ndk_root = require_ndk_root() as string;

	if (sdks.find((x)=>x==sdk) == undefined) {
		console.log(`[NDK] <SDK version> invalid (${sdk}), founds ndks: ${sdks.join('/')} for ndk: ${ndk_root}`);
		return;
	}

	const cmakeTC = path.resolve(ndk_root, 'build/cmake/android.toolchain.cmake');
	if (!afs.exists(cmakeTC))
		return undefined;
	const pbin = getNDKbin(ndk_root);
	if (pbin == undefined)
		return;

	const tcs = new Map<string, CToolchain>();
	const ld = path.resolve(pbin, 'ld');
	const post = Deno.build.os == 'windows'?'.exe':'';

	const androidTNames = ['i686-linux-android','x86_64-linux-android','arm-linux-androideabi','aarch64-linux-android'];
	['x32','x64','arm','a64'].forEach((arch, xi)=>{
		const base = path.resolve(pbin, androidTNames[xi]);
		const base_sdk = path.resolve(pbin, androidTNames[xi])+sdk;
		tcs.set(arch, {
			c:path.resolve(base_sdk+'-clang'+post),
			cxx:path.resolve(base_sdk+'-clang++'+post),
			ranlib:path.resolve(base+'-ranlib'+post),
			ar:path.resolve(base+'-ar'+post),
			strip:path.resolve(base+'-strip'+post),
			ld:ld+post
		});
		
	});
	return {
		cmakeTC,
		sdk,
		nativeTC:tcs
	} as NDKPaths;
}