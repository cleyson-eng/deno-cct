import { CMake as vcpp_cmake, RuntimeReplace } from './windows.ts';
import { CMake as android_cmake } from './android.ts';
import { CMake as linux_cmake, CGoCross as linux_cgos } from './linux.ts';
import { CMake as apple_cmake, Options as AppleOpts, CGoCross as macos_cgos } from './apple.ts';
import { Platform, hostPA, PA } from '../util/target.ts';
import { exitError } from '../util/exit.ts';
import { BMode, goBuild as commun_goBuild, getPAs as common_go_getPAs } from './common/go.ts';

export { RuntimeReplace } from './windows.ts';
export type { Options as AppleOpts } from './apple.ts';
export { cmakeFlagFromBuildType } from './common/cmake.ts';

export interface CMakeCrossOps {
	win_runtimeReplace?:RuntimeReplace,

	uwp_sdk?:string,
	uwp_runtimeReplace?:RuntimeReplace,
	uwp_winrt?:boolean,

	android_sdk?:number,
	
	apple_opts?:AppleOpts
}
export function CMake (pa:PA, copts:CMakeCrossOps, args:string[]) {
	const opts = copts?copts:{};
	switch (pa.platform) {
	case Platform.WINDOWS:
		return vcpp_cmake(pa.platform, pa.arch, args, "", opts.win_runtimeReplace?opts.win_runtimeReplace:RuntimeReplace.X_X, false);
	case Platform.UWP:
		return vcpp_cmake(pa.platform, pa.arch, args, opts.uwp_sdk?opts.uwp_sdk:"", opts.win_runtimeReplace?opts.win_runtimeReplace:RuntimeReplace.X_X, opts.uwp_winrt !== false);
	case Platform.LINUX:
		return linux_cmake(pa.arch, args);
	case Platform.ANDROID:
		return android_cmake(pa.arch, args, opts.android_sdk);
	case Platform.MACOS:
	case Platform.MAC_CATALYST:
	case Platform.IOS:
	case Platform.IOS_EMU:
		if (opts.apple_opts == undefined)
			throw exitError('[Cross.CMake] undefined apple_opts');
		return apple_cmake(pa.platform, pa.arch, args, opts.apple_opts)
	case Platform.BROWSER:
		throw 'unimplemented';//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
	}
	throw exitError('[Cross.CMake] unimplemented platform: '+pa.platform);
}
export async function goBuild (pa:PA, input:string, outputFile:string, bmode = BMode.APP, cgo:boolean|string = false) {
	if ((await common_go_getPAs()).find((x)=>x.arch == pa.arch && x.platform == pa.platform) == undefined)
		throw exitError(`[Cross.CGO] unimplemented or unsupported in current context: ${pa.platform} ${pa.arch}`);
	
	if (cgo == false) {
		return await commun_goBuild({
			input, outputFile, bmode,
			cross:{target:(pa.arch != hostPA.arch && pa.platform != hostPA.platform)?pa:undefined}
		})
	}
	//+cgo
	switch (pa.platform) {
	case Platform.LINUX:
		return await commun_goBuild({
			input, outputFile, bmode,
			cross:(await linux_cgos(pa.arch)),
			cgo_enabled:true,
			cc_flags:(typeof cgo == 'string')?cgo:undefined
		});
	case Platform.MACOS:
		return await commun_goBuild({
			input, outputFile, bmode,
			cross:(await macos_cgos(pa.arch)),
			cgo_enabled:true,
			cc_flags:(typeof cgo == 'string')?cgo:undefined
		});
	}
	throw exitError(`[Cross.CGO] unimplemented or unsupported in current context: ${pa.platform} ${pa.arch}`);
}

//legacy
import { curTarget } from '../libs/data.ts';
export function legacy_CMake (args:string[], opts:CMakeCrossOps) {
	if (curTarget == undefined)
		throw exitError('Invalid target, in [compile/mod.ts].CMake(...) target PA unset');
	return CMake(curTarget, opts, args);
}