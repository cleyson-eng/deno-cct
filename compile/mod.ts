import { CMake as vcpp_cmake, RuntimeReplace } from './windows.ts';
import { CMake as android_cmake} from './android.ts';
import { CMake as linux_cmake} from './linux.ts';
import { Platform, PA } from '../util/target.ts';
import { exitError } from '../util/exit.ts';

export interface CMakeCrossOps {
	win_runtimeReplace?:RuntimeReplace,

	uwp_sdk?:string,
	uwp_runtimeReplace?:RuntimeReplace,

	android_sdk?:number,
}
export function CMake (pa:PA, args:string[], opts:CMakeCrossOps) {
	if (pa == undefined)
		throw "Invalid target, in [compile/mod.ts].CMake(1st param)";
	
	switch (pa.platform) {
	case Platform.WINDOWS:
		return vcpp_cmake(pa.platform, pa.arch, args, "", opts.win_runtimeReplace?opts.win_runtimeReplace:RuntimeReplace.X_X);
	case Platform.UWP:
		return vcpp_cmake(pa.platform, pa.arch, args, opts.uwp_sdk?opts.uwp_sdk:"", opts.win_runtimeReplace?opts.win_runtimeReplace:RuntimeReplace.X_X);
	case Platform.LINUX:
		return linux_cmake(pa.arch, args);
	case Platform.ANDROID:
		return android_cmake(pa.arch, args, opts.android_sdk);
	}
	throw exitError("[Cross.CMake] unimplemented platform: "+pa.platform);
}