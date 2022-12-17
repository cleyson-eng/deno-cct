export enum Arch {
	X86_32 = 'x32',
	X86_64 = 'x64',
	ARM_32 = 'arm',
	ARM_64 = 'arm64',
	WASM32 = 'wasm',
	JAVASCRIPT = 'js',
	UNKNOW = 'unk',
	
	ANY = 'any',
}
export enum Platform {
	WINDOWS = 'win32',
	UWP =     'uwp',
	LINUX =   'linux',
	MACOS =   'darwin',
	MAC_CATALYST = 'catalyst',
	ANDROID = 'android',
	IOS =     'ios',
	IOS_EMU = 'ios_emu',
	BROWSER = 'web',
	
	ANY = 'any',
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
	toMicrosoft:(x:string)=>mapOrIgnore({
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
	toGoogle:(x:string)=>mapOrIgnore({
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