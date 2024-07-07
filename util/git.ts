
import { exec } from './exec.ts';
import { path } from '../deps.ts';
import * as AFS from "./agnosticFS.ts";
import { indexOf } from "https://deno.land/std@0.129.0/bytes/mod.ts";

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
to install: python3 -m pip install patch
to use: python3 -m patch

for create diffs use:
git diff --no-index [old folder] [new folder] > i.patch
*/
export async function gitApply(root:string, patcher:string, reverse = false) {
	const cmd = ['python', '-m', 'patch', '--verbose', patcher];
	if (reverse) cmd.push('--revert');
	let res = await exec(root, cmd, {pipeOutput:true});
	if (res.code == 404) {
		cmd[0]+='3';
		res = await exec(root, cmd, {pipeOutput:true});
	}
	return res.success;
}

export class GitIgnore {
	rules:string[] = ['.git'];
	root:string;
	constructor(root:string) {
		this.root = root;
	}
	appendRule(...addrules:string[]) {
		const nrules = addrules
			.map((x)=>{
				x = x.trim()
				let i = x.indexOf('#');
				if (i >= 0)
					x = x.substring(0, i);
				while (x.startsWith('/')) { x = x.substring(1); }
				
				let index = 0;
				const findexs = [];
				while (index < x.length) {
					index = x.indexOf('**', index);
					if (index < 0) break;
					findexs.push(index);
					index += 2;
				}
				findexs.reverse().forEach((i)=>{
					const prebar = (i > 0 && x.charAt(i-1) == '/');
					const posbar = (i+2 < x.length && x.charAt(i+2) == '/');
					x = x.substring(0,i) + `${prebar?'':'*/'}§${posbar?'':'/*'}` + x.substring(i+2);
				});
				return x;
			})
			.filter((x)=>x!='')
			.filter((x)=>this.rules.find((y)=>y==x)==null);
		if (nrules.length>0)
			this.rules = [...this.rules, ...nrules];
		return this;
	}
	append(dir:string) {
		const p = path.resolve(dir,'.gitignore');
		if (!AFS.exists(p) || !AFS.stat(p).isFile) return this;
		this.appendRule(...AFS.readTextFile(p).split('\n'));
		return this;
	}
	clone() {
		const r = new GitIgnore(this.root);
		r.rules = this.rules;
		return r;
	}
	private testRuleItem(pi:string, ri:string) {
		const k = ri.split('*');
		if (k.length == 1)
			return pi != ri;
		if (!pi.startsWith(k[0]))
			return true;
		if (!pi.endsWith(k[k.length-1]))
			return true;
		pi = pi.substring(k[0].length, pi.length - k[k.length-1].length);
		let index = 0;
		for (let i = 1, e = k.length-1; i < e; i++) {
			index = pi.indexOf(k[i], index);
			if (index < 0)
				return true;
		}
		return false;
	}
	private testRule(p:string, pdir:boolean, r:string) {
		if (r.endsWith('/')) {
			if (!pdir) return true;
			r = r.substring(0, r.length-1);
		}
		const ris = r.split('/').reverse();
		const pis = p.split('/').reverse();
		let pindex = 0;
		let jumpfind = false;
		for (let i = 0; i < ris.length; i++) {
			const cri = ris[i];
			if (cri == '§') {
				jumpfind = true;
				continue;
			}
			if (pindex >= pis.length)
				return true;
			if (jumpfind) {
				while (this.testRuleItem(pis[pindex], cri)) {
					pindex++;
					if (pindex >= pis.length)
						return true;
				}
			} else if (this.testRuleItem(pis[pindex], cri))
				return true;
			pindex++;
			jumpfind = false;
		}
		return false;
	}
	test(p:string, dir:boolean) {
		p = path.relative(this.root, p).replaceAll('\\','/');
		for (let i = 0; i < this.rules.length; i++) {
			if (!this.testRule(p, dir, this.rules[i]))
				return false;
		}
		return true;
	}
}