
import { exec } from './exec.ts';
import { path } from '../deps.ts';
import * as AFS from "./agnosticFS.ts";

export async function gitClone(url:string, dst:string, recursive = false) {
	const cmd = ['git','clone'];
	if (recursive)
		cmd.push('--recursive');
	cmd.push(url, path.basename(dst));
	AFS.mkdirFile(dst);
	const res = await exec(path.resolve(dst, '..'),cmd, {pipeOutput:true});
	return res.success;
}
export async function gitCheckout(dst:string, commit:string, force = true) {
	const cmd = ['git','checkout'];
	if (force)
		cmd.push('-f');
	cmd.push(commit);
	const res = await exec(dst, cmd, {pipeOutput:true});
	return res.success;
}
export async function gitItem(url_commit:string, dst:string, recurse = false, forceCheckout = true) {
	const e = url_commit.split('@');
	if (!AFS.exists(dst)) {
		if (!await gitClone(e[0], dst, recurse)) {
			if (AFS.exists(dst))
				Deno.removeSync(dst, {recursive:true});
			return false;
		}
	}
	if (e[1]) {
		const checkinFile = path.resolve(dst, "checkin-deno-cct");
		if (!AFS.exists(checkinFile)) {
			if (!await gitCheckout(dst, e[1], forceCheckout))
				return false;
			AFS.writeTextFile(checkinFile, "");
		}
	}
	return true;
}
export async function gitList(reldst:string, list:{git:string, dst:string, rec?:boolean, fck?:boolean}[]) {
	for (let i = 0; i < list.length; i++) {
		const c = list[i];
		if (!await gitItem(c.git, path.resolve(reldst, c.dst), c.rec === true, c.fck !== false))
			return false;
	}
	return true;
}
/*git apply is too problematic, using patch, in this case: python patch
to install: pip install patch
to use: python -m patch
*/
export async function gitApply(root:string, patcher:string, reverse = false) {
	const cmd = ['python', '-m', 'patch', '--verbose', patcher];
	if (reverse) cmd.push('--revert');
	const res = await exec(root, cmd, {pipeOutput:true});
	return res.success;
}