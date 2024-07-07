import { path } from "../../deps.ts";
import { exec } from "../../util/exec.ts";
import { exitError } from "../../util/exit.ts";
import { Platform, hostPA } from "../../util/target.ts";

export async function autogen (srcRoot:string) {
	let line = ['sh', 'autogen.sh'];
	if (hostPA.platform == Platform.WINDOWS) {
		console.log('libreSSL autogen is incompatible with windows, bypassing with wsl...');
		line = ['wsl', ...line];
	} else {//trying to resolve mac problem
		await Deno.chmod(path.resolve(srcRoot, 'autogen.sh'), 0o755);
	}
	if (!(await exec(srcRoot, line, {pipeInput:true, pipeOutput:true})).success)
		throw exitError("failed while try autogen");
}