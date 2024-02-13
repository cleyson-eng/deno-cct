import { Platform, Arch, hostPA, PA } from '../util/target.ts';
import { kvf } from '../util/cache.ts';
import { runCmake } from './common/cmake.ts';
import { grantResource, IOS_TC } from '../rsc/mod.ts';
import { exitError } from '../util/exit.ts';
import { CrossOptions } from './common/go.ts';

export interface Options {
	bundleGuiID?:string
	sdkvMacMin?:string
	sdkvMac?:string
	sdkvIOSMin?:string
	sdkvIOS?:string
	teamID?:string
}
export interface SDKVs {
	sdkvsMac:string[]
	sdkvsIOS:string[]
}
//return currently avaliable sdk versions
export async function sdkvsApple():Promise<SDKVs> {
	const tmp = kvf.get('xcode-sdkvs');
	const tmp_time = kvf.get('xcode-sdkvs_time');
	if (tmp && tmp_time) {
		const timediff = Date.now() - parseInt(tmp_time);
		const maxdiff = 12 * 3600 * 1000;
		if (timediff > -maxdiff && timediff < maxdiff)
			return JSON.parse(tmp) as SDKVs;
	}
	const cmd = Deno.run({
		cmd: ["xcodebuild", "-showsdks"], 
		stdout: "piped",
		stderr: "piped"
	});
	const output = await cmd.output();
	cmd.close();

	const outStr = new TextDecoder().decode(output);
	const sdkvsMac:string[] = [];
	const sdkvsIOS:string[] = [];
	outStr.match(/macosx[0-9.]+/g)?.forEach((x)=>{
		const v = x.match(/[0-9.]+/g);
		if (v && v[0] && sdkvsMac.indexOf(v[0]) < 0)
			sdkvsMac.push(v[0]);
	});
	outStr.match(/iphoneos[0-9.]+/g)?.forEach((x)=>{
		const v = x.match(/[0-9.]+/g);
		if (v && v[0] && sdkvsIOS.indexOf(v[0]) < 0)
			sdkvsIOS.push(v[0]);
	});

	const r = { sdkvsMac, sdkvsIOS };
	kvf
		.set('xcode-sdkvs', JSON.stringify(r))
		.set('xcode-sdkvs_time', Date.now().toFixed());
	return r;
}
function jpa(a:PA|Platform,b?:Arch) {
	if (typeof a == "string") {
		if (b) return a+' '+b;
		return a;
	}
	return a.platform+' '+a.arch;
}
export async function CMake(platform:Platform, arch:Arch, args:string[], opts:Options) {
	if (hostPA.platform != Platform.MACOS)
		throw exitError(`[CMake.xcode] Incompatible host platform`);

	const extrargs:string[] = [
		'-G', 'Xcode',
		`-DCMAKE_TOOLCHAIN_FILE="${await grantResource(IOS_TC)}"`
	];
	if (opts.bundleGuiID)
		extrargs.push('-DMACOSX_BUNDLE_GUI_IDENTIFIER='+opts.bundleGuiID);
	if (opts.teamID)
		extrargs.push('-DCMAKE_XCODE_ATTRIBUTE_DEVELOPMENT_TEAM='+opts.teamID);
	if (platform == Platform.MACOS || platform == Platform.MAC_CATALYST) {
		if (opts.sdkvMac)
			extrargs.push('-DSDK_VERSION='+opts.sdkvMac);
		else
			console.log('[CMake.xcode] No SDK Version for MacOSX set')
		if (opts.sdkvMacMin)
			extrargs.push('-DDEPLOYMENT_TARGET='+opts.sdkvMacMin);
	} else {
		if (opts.sdkvIOS)
			extrargs.push('-DSDK_VERSION='+opts.sdkvIOS);
		else
			console.log('[CMake.xcode] No SDK Version for IOS set');
		if (opts.sdkvMacMin)
			extrargs.push('-DDEPLOYMENT_TARGET='+opts.sdkvIOSMin);
	}
	switch (jpa(platform, arch)) {
	case jpa(Platform.MACOS, Arch.X86_64):extrargs.push('-DPLATFORM=MAC');break;
	case jpa(Platform.MACOS, Arch.ARM_64):extrargs.push('-DPLATFORM=MAC_ARM64');break;
	case jpa(Platform.MAC_CATALYST, Arch.X86_64):extrargs.push('-DPLATFORM=MAC_CATALYST');break;
	case jpa(Platform.MAC_CATALYST, Arch.ARM_64):extrargs.push('-DPLATFORM=MAC_CATALYST_ARM64');break;
	case jpa(Platform.IOS_EMU, Arch.X86_64):extrargs.push('-DPLATFORM=SIMULATOR64');break;
	case jpa(Platform.IOS_EMU, Arch.ARM_64):extrargs.push('-DPLATFORM=SIMULATORARM64');break;
	case jpa(Platform.IOS, Arch.ARM_64):extrargs.push('-DPLATFORM=OS64');break;
	default:
		throw exitError(`[CMake.xcode] invalid platform + architecture: ${platform} ${arch}`);
	}
	return await runCmake({
		pass:args,
		pa:{platform, arch},
		config_additional_args:extrargs
	});
}
export async function CGoCross(arch:Arch):Promise<CrossOptions> {
	throw 'unimplemented';//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
}