import { TCommand, TFactory } from "../base/interfaces.ts";
import { archUtil, PA } from "../base/target.ts";
import { runCmake } from "../irequirement/auxi/cmake_parse.ts";
import { androidNdk } from '../irequirement/android.ts';
import { exitError } from "../base/exit.ts";

export const D:TFactory = (pa:PA) =>{
	const r = new Map<string, TCommand>();
	r.set("cmake",  async (pass:string[], i:number)=>{
		const config = await androidNdk.require();
		if (config == undefined) {
			exitError("Cant found NDK, configure it.")
			throw '';
		}

		const extrargs:string[] = [
			`-DCMAKE_TOOLCHAIN_FILE="${config.cmakeTC}"`,
			`-DANDROID_ABI=${archUtil.toGoogle(pa.arch)}`,
			`-DANDROID_NATIVE_API_LEVEL=${config.sdk}`
		];
		return await runCmake({
			i, pass, pa,
			config_additional_args:extrargs,
		});
	});
	return r;
};