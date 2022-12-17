import { getPathResource } from "../base/cache.ts";
import { exitError } from "../base/exit.ts";
import { TCommand, TFactory } from "../base/interfaces.ts";
import { PA, Platform } from "../base/target.ts";
import { runCmake } from "../irequirement/auxi/cmake_parse.ts";
import { xcode } from "../irequirement/xcode.ts";

export const D:TFactory = (pa:PA) =>{
	const r = new Map<string, TCommand>();
	r.set("cmake",  async (pass:string[], i:number)=>{
		const config = await xcode.require();
		if (config == undefined) {
			exitError("Verify your XCode and XCode command line tools installation...");
			throw '';
		}
		const extrargs:string[] = [
			'-G', 'Xcode',
			`-DCMAKE_TOOLCHAIN_FILE="${await getPathResource('mac/ios.toolchain.cmake')}"`
		];
		if (config.bundleGUI)
			extrargs.push('-DMACOSX_BUNDLE_GUI_IDENTIFIER='+config.bundleGUI);
		if (config.teamID)
			extrargs.push('-DCMAKE_XCODE_ATTRIBUTE_DEVELOPMENT_TEAM='+config.teamID);
		if (pa.platform == Platform.MACOS || pa.platform == Platform.MAC_CATALYST) {
			if (config.macSdkVersion == "") {
				exitError("No SDK version for MacOSX set, configure it.");
				throw '';
			}
			extrargs.push('-DSDK_VERSION='+config.macSdkVersion);
		} else {
			if (config.iosSdkVersion == "") {
				exitError("No SDK version for IOS set, configure it.");
				throw '';
			}
			extrargs.push('-DSDK_VERSION='+config.iosSdkVersion);
		}
		switch (pa.platform+' '+pa.arch) {
		case 'darwin x64':extrargs.push('-DPLATFORM=MAC');break;
		case 'darwin arm64':extrargs.push('-DPLATFORM=MAC_ARM64');break;
		case 'catalyst x64':extrargs.push('-DPLATFORM=MAC_CATALYST');break;
		case 'catalyst arm64':extrargs.push('-DPLATFORM=MAC_CATALYST_ARM64');break;
		case 'ios_emu x64':extrargs.push('-DPLATFORM=SIMULATOR64');break;
		case 'ios_emu arm64':extrargs.push('-DPLATFORM=SIMULATORARM64');break;
		case 'ios arm64':extrargs.push('-DPLATFORM=OS64');break;
		}
		return await runCmake({
			i, pass, pa,
			config_additional_args:extrargs,
		});
	});
	return r;
};