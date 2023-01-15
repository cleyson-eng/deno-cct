import { URemap } from "./utils.ts";

export enum Arch {
	X86_32 =     'x32',
	X86_64 =     'x64',
	ARM_32 =     'arm',
	ARM_64 =     'arm64',
	WASM32 =     'wasm',
	JAVASCRIPT = 'js',

	UNKNOW =  'unk',
	ANY =     'any',
	CURRENT = 'cur',
}
export enum Platform {
	WINDOWS =      'win32',
	UWP =          'uwp',
	LINUX =        'linux',
	MACOS =        'darwin',
	MAC_CATALYST = 'catalyst',
	ANDROID =      'android',
	IOS =          'ios',
	IOS_EMU =      'ios_emu',
	BROWSER =      'web',
	
	UNKNOW =  'unk',
	ANY =     'any',
	CURRENT = 'cur',
}
export interface PA {
	platform:Platform
	arch:Arch
}
export enum BuildType {
	DEBUG_COVERAGE,
	DEBUG,
	RELEASE_FAST,
	RELEASE_MIN,
}
export function postfixFromBuildType(x:BuildType, ...post:{c:boolean|number, v:string|string[]}[]) {
	let r = '';
	switch (x) {
	case BuildType.DEBUG: r = '-dbg';break;
	case BuildType.DEBUG_COVERAGE: r = '-cov';break;
	case BuildType.RELEASE_MIN: r = '-min';break;
	}
	post.forEach((x)=>{
		if (typeof x.c == 'boolean') {
			if (typeof x.v == 'string') {
				if (x.c) r += x.v;
			} else if (x.v.length > 0) {
				if (x.c) r += x.v[x.v.length-1];
				else if (x.v.length > 1) r += x.v[0];
			}
		} else if (typeof x.v == 'string')
			if (x.c != 0) r += x.v;
		else
			r += x.v[x.c % x.v.length];
	})
	return r;
}
function _getHostPA():PA {
	let p:Platform;
	let a:Arch;

	switch (Deno.build.os) {
	case 'darwin':p = Platform.MACOS;break;
	case 'linux':p = Platform.LINUX;break;
	case 'windows':p = Platform.WINDOWS;break;
	}
	switch (Deno.build.arch) {
	case 'x86_64':a = Arch.X86_64;break;
	case 'aarch64':a = Arch.ARM_64;break;
	}
	return {platform:p,arch:a};
}
export const hostPA:PA = _getHostPA();

export enum TScope {
	COMMUN='default',
	VCPP='vcpp',
	AS='as',
	GO='go'
}
export const tArch = new URemap();
tArch
	.add(Arch.X86_32, TScope.VCPP, 'Win32')
	.add(Arch.X86_64, TScope.VCPP, 'x64')
	.add(Arch.ARM_32, TScope.VCPP, 'arm')
	.add(Arch.ARM_64, TScope.VCPP, 'ARM64')

	.add(Arch.X86_32, TScope.AS, 'x86')
	.add(Arch.X86_64, TScope.AS, 'x86_64')
	.add(Arch.ARM_32, TScope.AS, 'armeabi-v7a')
	.add(Arch.ARM_64, TScope.AS, 'arm64-v8a')

	.add(Arch.X86_32, TScope.GO, '386')
	.add(Arch.X86_64, TScope.GO, 'amd64')
	.add(Arch.ARM_32, TScope.GO, 'arm')
	.add(Arch.ARM_64, TScope.GO, 'arm64')
	.add(Arch.WASM32, TScope.GO, 'wasm');

export const tPlatform = new URemap();
tPlatform
	.add(Platform.WINDOWS, TScope.GO, 'windows')
	.add(Platform.LINUX, TScope.GO, 'linux')
	.add(Platform.MACOS, TScope.GO, 'darwin')
	.add(Platform.ANDROID, TScope.GO, 'android')
	.add(Platform.IOS, TScope.GO, 'ios')
	.add(Platform.BROWSER, TScope.GO, 'js');


export const CToolchain_props = ['c','cxx','ranlib','ar','strip','ld'];
export interface CToolchain {
	c:string
	cxx:string
	ranlib?:string
	ar?:string
	strip?:string
	ld?:string
}
export function filterTargetArguments(v:string, pa:PA) {
	v = v.toLocaleLowerCase().replaceAll('-','_');
	if (v.startsWith('_d')) v = v.substring(2);
	if (v.startsWith('cct_')) v = v.substring(4);
	if (v.startsWith('target=')||v.startsWith('target_platform=')||v.startsWith('target_arch=')) {
		const sp = v.indexOf('arch') < 0;
		v.substring(v.indexOf('=')+1).replaceAll('"','').replaceAll('\'','').split('_').forEach((x, i)=>{
			if (x == 'unk' || x == 'any') x = 'cur';
			if (sp && i == 0)
				pa.platform = (x == 'cur')?hostPA.platform:x as Platform;
			else
				pa.arch = (x == 'cur')?hostPA.arch:x as Arch;
		});
		return false;
	}
	return true;
}