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

function mapOrIgnore(x:Record<string,string>, ref:string):string {
	const lref = ref.toLocaleLowerCase();
	if (x[lref])
		return x[lref];
	return ref;
}

export const archUtil = {
	toCommon:(x:string)=>mapOrIgnore({
			'x32':'x32',
			'x86':'x32',
			'ia32':'x32',
			'win32':'x32',
			'x64':'x64',
			'x86_64':'x64',
			'arm':'arm',
			'armeabi-v7a':'arm',
			'arm64':'arm64',
			'arm64-v8a':'arm64',
		}, x),
	toVCPP:(x:string)=>mapOrIgnore({
			'x32':'Win32',
			'x86':'Win32',
			'ia32':'Win32',
			'win32':'Win32',
			'x64':'x64',
			'x86_64':'x64',
			'arm':'arm',
			'armeabi-v7a':'arm',
			'arm64':'ARM64',
			'arm64-v8a':'ARM64',
		}, x),
	toAS:(x:string)=>mapOrIgnore({
		'x32':'x86',
		'x86':'x86',
		'ia32':'x86',
		'win32':'x86',
		'x64':'x86_64',
		'x86_64':'x86_64',
		'arm':'armeabi-v7a',
		'armeabi-v7a':'armeabi-v7a',
		'arm64':'arm64-v8a',
		'arm64-v8a':'arm64-v8a',
	}, x),
};
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