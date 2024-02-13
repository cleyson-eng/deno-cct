import * as AFS from '../../util/agnosticFS.ts';
import { path as P } from '../../deps.ts';
import { exec } from "../../util/exec.ts";
import { hostPA, Platform } from '../../util/target.ts';

export async function moltenVk (cacheDir:string, outputPackage:string) {
	if (AFS.exists(outputPackage) || hostPA.platform != Platform.MACOS) return;
	if (!AFS.exists(cacheDir))
		AFS.mkdir(cacheDir);
	const projDir = P.resolve(cacheDir, 'MoltenVK');
	const packageDir = P.resolve(projDir, "Package");
	if (!AFS.exists(projDir)) {
		if (!(await exec(cacheDir, ['git','clone','https://github.com/KhronosGroup/MoltenVK.git'], {pipeOutput:true})).success) {
			Deno.remove(projDir, {recursive:true});
			throw "failed to download moltenVK";
		}
	}
	const extdir = P.resolve(projDir, "External");
	if (!AFS.exists(extdir)) {
		if (!(await exec(projDir, ['bash','fetchDependencies','--macos','--ios','--iossim'], {pipeOutput:true})).success) {
			Deno.remove(extdir, {recursive:true});
			throw "failed to download moltenVK";
		}
		AFS.mkdir(extdir);
	}
	if (!AFS.exists(packageDir)) {
		const cmds = [
			['make','clean'],
			['make','macos'],
			['make','ios'],
			['make','iossim']
		];
		for (let i = 0; i < cmds.length; i++) {0
			const eres = await exec(projDir, cmds[i], {pipeOutput:true});
			if (!eres.success) {
				if (AFS.exists(packageDir))
					Deno.remove(packageDir, {recursive:true});
				throw "failed to compile moltenVK"
			}
		}
	}
	AFS.copy(P.resolve(packageDir,'Release/MoltenVK/dylib'), outputPackage);
}