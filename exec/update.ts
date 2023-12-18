import * as AFS from "../util/agnosticFS.ts";
import { path as P} from "../deps.ts";

const exec_root = (()=>{
	const t = new URL('../', import.meta.url);
	if (t.protocol == "file:")
		return P.fromFileUrl(t).replace(/^[\\\/]([A-Z]:[\\\/])/g, (_,b)=>b);
	return t;
})();

const new_root = exec_root || Deno.args[0];

const file_init = "//deno-cct-root:";

AFS.search(Deno.cwd(), (path:string, isFile:boolean)=> {
	const base = P.basename(path);
	if (base.startsWith(".")) return false;
	if (!isFile || !base.endsWith(".ts")) return true;
	let txt = AFS.readTextFile(path);
	if (!txt.startsWith(file_init)) return true;
	let root_end = txt.indexOf('\n');
	if (root_end < 0) root_end = txt.length;
	const old_root = txt.substring(file_init.length, root_end);
	txt = file_init+new_root+txt.substring(root_end);

	txt.replaceAll(/\/\*deno-cct\*\/\s*\"[\s\S\.]+\"/g, (curr:string)=>{
		const pos = (curr.indexOf('"'));
		if (curr.substring(pos).startsWith(old_root))
			curr = curr.substring(0, pos) + curr.substring(pos+old_root.length);
		return curr.substring(0, pos) + new_root + curr.substring(pos);
	});

	AFS.writeTextFile(path, txt, {ifdiff:true});
	return true;
});