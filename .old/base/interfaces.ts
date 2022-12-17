import {argumentDebugHighlight, mergeMaps, setArrayElement} from './utils.ts'
import {Arch, PA, Platform, hostPA as host} from './target.ts';
import { Button, ComboBox, Form, Label } from './cli.ts';
/*
## Requirement script ##
//itool/<any>.ts (imported by the tool as need, for fast setup)
export const <name>:Requirement<string> = {
	name:"req_iment",
	title:"Requirement",
	require:(pc?:boolean)=>{
		return cachedKeys.has("req_iment")?cachedKeys.gas("req_iment"):"default";
	},
	configure:async (value?:string)=>{
		const f = new Form
		const tb = TextBox ...
		form.elements = [tb...];
		await form.run()
		cacheKeys.set("req_iment", tb.value);
	}
}
listRequirement.push(<name>);
*/
export interface Requirement<T> {
	name:string,
	title:string,
	require?:(purge_cache?:boolean)=>Promise<T|void>,
	configure?:(value?:string)=>Promise<boolean>,
}
//deno-lint-ignore no-explicit-any
export const listRequirement:Requirement<any>[] = [];

/*
## Toolchains ##
//visual studio fragment
windows = [X32,X86,ARM,ARM64].map((x)=>({p:WINDOWS, A:x}));
uwp = [X32,X86,ARM,ARM64].map((x)=>({p:UWP, A:x}))

listTCFragments.push({
	target:[...windows, ...uwp],
	compatibleHost:[...windows],
	factories:"cmake_microsoft"
} as ToolchainFragment);

//itool/cmake_microsoft.ts (imported dynamically, for fast setup)
//using a configure...
import {xtz} "../irequirement/vc++.ts"

export D:TFactory = (pa:PA) =>{
	var r = new Map<string, TCommand>();
	r.set("cmake", (args:string[], i:number)=>{
		const path = xtz.value;
		...
	});
	return r;
}
*/

export interface ToolchainFragment {
	targets:PA[],
	compatibleHost:PA[],
	factories:string[],
}
export const listTCFragments:ToolchainFragment[] = [];
export type TFactory = (pa:PA)=>Map<string, TCommand>;
export type TCommandRes = {i?:number,code:number, upperCount?:number, loop_keep?:boolean};
export type TCommand = (args:string[], i:number)=>Promise<TCommandRes>;
export type TCommandSet = Map<string, TCommand>;
export async function loopCommandSet(args:string[], i:number, x:TCommandSet):Promise<TCommandRes> {
	let loop_keep = true;
	while (loop_keep) {
		if (args[i] == null || args[i] == '?') {
			const f = new Form();
			const bc = new Button("Continue", ()=>{f.closeSignal=true;});
			bc.enabled = false;
			const cb = new ComboBox<string>(
					'',
					Array.from(x.keys()).map((x)=>({v:x,t:x})),
					'',
					()=>{bc.enabled = true;}
				);
			f.elements = [
				new Label("Select a subcommand to continue", true),
				cb,bc
			];
			await f.run();
			setArrayElement(args, i, cb.value);
		}
		while (i < args.length) {
			loop_keep = false;
			const y = x.get(args[i]);
			i++;
			if (y) {
				const res = await y(args, i);
				if (res.code != 0)
					return {code:res.code};
				if (res.i)
					i = res.i;
				if (res.upperCount && res.upperCount > 0)
					return {code:0, i, upperCount:res.upperCount-1, loop_keep:res.loop_keep};
				if (res.loop_keep)
					loop_keep = true;
			} else {
				console.log(argumentDebugHighlight(args, i));
				console.log(`Unknow subcomman, possibles sub commands in current context:`);
				console.log(Array.from(x.keys()));
				console.trace();
				return {code:404};
			}
		}
	}
	return {code:0, i};
}

//=====
const toolsForTargetCache = new Map<PA, TCommandSet>();
let compatibleTargetsCache:PA[] = [];
const itoolURL = new URL('../itool', import.meta.url);

async function requireFactory (name:string):Promise<TFactory> {
	//@ts-ignore dynamic import
	return (await import(itoolURL.href + `/${name}.ts`)).D;
}
export function getCompatibleTargets():PA[] {
	if (compatibleTargetsCache.length > 0)
		return compatibleTargetsCache;
	const r:PA[] = [];
	listTCFragments
		.filter((x)=>
			x.compatibleHost.find((chost)=>
				(chost.arch==host.arch || chost.arch=='any')&&(chost.platform==host.platform || chost.platform=='any')
			)!=null
		).forEach((x)=>{
			r.push(...x.targets);
		});
	compatibleTargetsCache = r.filter((a:PA, ai, arr:PA[])=>arr.indexOf(a, ai+1) == -1)
		.sort((a:PA,b:PA)=>{
			let aref = a.platform as string;
			let bref = b.platform as string;
			if (aref == bref) {
				aref = a.arch;
				bref = a.arch;
			}
			let idef = 0;
			const imax = aref.length<bref.length?aref.length:bref.length;
			while (idef < imax && aref.charCodeAt(idef) == bref.charCodeAt(idef))
				idef++;
			if (idef == imax) {
				if (aref.length != bref.length)
					return aref.length - bref.length;
				return 0;
			}
			return aref.charCodeAt(idef) - bref.charCodeAt(idef);
		});
	return compatibleTargetsCache.filter((x)=>x.arch!=Arch.ANY && x.platform != Platform.ANY);
}
export async function loadToolsForTarget(target:PA):Promise<TCommandSet> {
	const pv = toolsForTargetCache.get(target);
	if (pv) return pv;
	const factories_strings:string[] = [];
	listTCFragments
		.filter((x)=>
			x.compatibleHost.find((chost)=>
				(chost.arch==host.arch || chost.arch=='any')&&(chost.platform==host.platform || chost.platform=='any')
			)!=null&&
			x.targets.find((ctarget)=>
				(ctarget.arch==target.arch || ctarget.arch=='any')&&(ctarget.platform==target.platform || ctarget.platform=='any')
			)!=null
		).forEach((x)=>{
			factories_strings.push(...x.factories);
		});
	if (factories_strings.length == 0)
		return new Map<string, TCommand>();
		
	const r:TCommandSet[] = [];
	for (let i = 0; i < factories_strings.length; i++)
		r.push((await requireFactory(factories_strings[i]))(target));
	const rm = mergeMaps(...r);
	if (Array.from(rm.keys()).length)
		toolsForTargetCache.set(target, rm);
	return rm;
}
export async function Run(args:string[], i:number):Promise<{i?:number,code:number, upperCount?:number}> {
	const t = getCompatibleTargets();
	const ps = t.map((x)=>x.platform as string).filter((a:string, ai, arr:string[])=>arr.indexOf(a, ai+1) == -1);

	let platform = args[i];
	if (platform == null || platform == '?') {
		const f = new Form();
		const bc = new Button("Continue", ()=>{f.closeSignal=true;});
		bc.enabled = false;
		const cb = new ComboBox<string>(
				'',
				ps.map((x)=>({v:x,t:x})),
				'',
				()=>{bc.enabled = true;}
			);
		f.elements = [
			new Label("Select a target platform to continue", true),
			cb,bc
		];
		await f.run();
		setArrayElement(args, i, cb.value);
		platform = cb.value;
	} else if (ps.find((x)=>x==platform) == null) {
		console.log(argumentDebugHighlight(args, i));
		console.log(`Unknow platform, possibles target platforms in current system:`);
		console.log(ps);
		console.trace();
		return {code:404};
	}
	i++;

	const as = t.filter((x)=>x.platform == platform).map((x)=>x.arch as string).filter((a:string, ai, arr:string[])=>arr.indexOf(a, ai+1) == -1);

	let arch = args[i];
	if (arch == null || arch == '?') {
		const f = new Form();
		const bc = new Button("Continue", ()=>{f.closeSignal=true;});
		bc.enabled = false;
		const cb = new ComboBox<string>(
				'',
				as.map((x)=>({v:x,t:x})),
				'',
				()=>{bc.enabled = true;}
			);
		f.elements = [
			new Label(`Select a target arch of the platform "${platform}" to continue`, true),
			cb,bc
		];
		await f.run();
		setArrayElement(args, i, cb.value);
		arch = cb.value;
	} else if (as.find((x)=>x==arch) == null) {
		console.log(argumentDebugHighlight(args, i));
		console.log(`Unknow arch, possibles target archs for "${platform}" in current system:`);
		console.log(as);
		console.trace();
		return {code:404};
	}
	i++;

	return await loopCommandSet(args, i, await loadToolsForTarget({platform, arch} as PA));
}

export const usertoolDB = new Map<{h:PA, t:PA}, string[]>();
export function addUserTool (h:PA, t:PA, ...tools:string[]) {
	const p = {h,t};
	const f = usertoolDB.get(p);
	if (f)
		return f.push(...tools);
	usertoolDB.set(p, tools);
}
export function searchUserTools (h?:PA, t?:PA):string[] {
	const vh = h?h:{platform:Platform.ANY, arch:Arch.ANY};
	const vt = t?t:{platform:Platform.ANY, arch:Arch.ANY};

	const r:string[] = [];
	Array.from(usertoolDB.keys()).forEach((k)=>{
		if (vh.platform != Platform.ANY && k.h.platform != Platform.ANY && vh.platform != k.h.platform)
		return;
		if (vh.arch != Arch.ANY && k.h.arch != Arch.ANY && vh.arch != k.h.arch)
		return;
		if (vt.platform != Platform.ANY && k.t.platform != Platform.ANY && vt.platform != k.t.platform)
		return;
		if (vt.arch != Arch.ANY && k.t.arch != Arch.ANY && vt.arch != k.t.arch)
			return;
		const vs = usertoolDB.get(k);
		if (vs) r.push(...vs);
	});
	return r.filter((vv,vi)=>r.lastIndexOf(vv)==vi).sort();
}