import * as C from "https://deno.land/x/compress@v0.4.5/mod.ts";
import * as afs from './agnosticFS.ts';
import { exitError } from "./exit.ts";

export async function awaitAN<T>(r:T|Promise<T>):Promise<T> {
	//@ts-ignore;
	if (r && r.then) return await r;
	return r;
}
export function splitCommand(command: string): string[] {
	const myRegexp = /[^\s"]+|"([^"]*)"/gi;
	const splits:string[] = [];
	
	let match:RegExpExecArray|null;
	do {
		//Each call to exec returns the next regex match as an array
		match = myRegexp.exec(command);
		if (match != null) {
			//Index 1 in the array is the captured group if it exists
			//Index 0 is the matched text, which we use if no captured group exists
			splits.push(match[1] ? match[1] : match[0]);
		}
	} while (match != null);

	return splits;
}
export async function exec(cwd:string, line:string[]|string, opts?:{hideExecution?:boolean,pipeOutput?:boolean, pipeInput?:boolean}):Promise<Deno.ProcessStatus> {
	let status:Deno.ProcessStatus = {
		code:404,
		success:false,
	};
	const cmd = Array.isArray(line)?line:splitCommand(line);
	if (!(opts && opts.hideExecution))
		console.log(`%cRunning: ${cmd.join(' ')}\nAt: ${cwd}`, 'background-color:white;color:black;');
	try {
		const p = Deno.run({
			cwd,
			cmd
		});
		if (opts && opts.pipeOutput)
			p.stdout?.readable.pipeTo(Deno.stdout.writable);
		if (opts && opts.pipeInput)
			if (p.stdin) Deno.stdin.readable.pipeTo(p.stdin.writable);

		status = await p.status();

		p.stdout?.close();
		p.stdin?.close();
		p.close();
		// deno-lint-ignore no-empty
	} catch(_){}
	if (!(opts && opts.hideExecution))
		console.log('%cEnded with code: '+status.code, `color: black;background-color: ${status.success?'green':'red'};`);
	return status;
}

const cmap = [
    {s:['.tgz','.tar.gz','tar.gzip'], c:C.tgz.compress, u:C.tgz.uncompress},
];
export function isCompressFormat(x:string) {
	return cmap.find((y)=>y.s.find((z)=>x.endsWith(z)) != undefined) != undefined;
}
export async function compress(src:string, dst:string) {
    let method = cmap.find((x)=>x.s.find((x)=>src.endsWith(x))!==undefined);
    if (method)
        return await method.u(src, dst);
    method = cmap.find((x)=>x.s.find((x)=>dst.endsWith(x))!==undefined);
    if (method)
        return await method.c(src, dst);
    exitError(`No extension to evalute compression method ${src}`);
}
export function writeIfDiff(file:string, content:string) {
	let need = true;
	try {
		need = afs.readTextFile(file) != content;
	// deno-lint-ignore no-empty
	} catch (_) {}
	if (need) {
		afs.mkdirFile(file);
		afs.writeTextFile(file, content);
	}
}
export function argumentsMatch(x:string, then:(()=>void)|undefined|null, ...names:string[]) {
	if (names.find((v)=>x==v) != null) {
		if (then) then();
		return true;
	}
	return false;
}
export function argumentValue(x:string, then:((v:string)=>void)|undefined|null, ...names:string[]) {
	for (let i = 0; i < names.length; i++) {
		if (x.startsWith(names[i])) {
			if (then)
				then(x.substring(names[i].length));
			return names[i].length;
		}
	}
	return 0;
}
export function argumentDebugHighlight(args:string[], i:number):string {
	return '\x1b[36m'+args.map((x,xi)=>xi==i?`\x1b[31m${x}\x1b[36m`:x).join(' ')+'\x1b[0m';
}
export function ifor(...cases:(boolean|number)[]) {
	let r = false;
	cases.find((x)=>{
		if (x === 0 || x === false)
			return false;
		r = true;
		return true;
	});
	return r;
}
export function mergeMaps<T,Z> (...maps:Map<T,Z>[]):Map<T,Z> {
	const r = new Map<T,Z>();
	maps.forEach((x)=>Array.from(x.keys()).forEach((k)=>r.set(k, x.get(k) as Z)))
	return r;
}
export function setArrayElement<T>(arr:T[], index:number, e:T) {
	while (arr.length <= index)
		arr.push(e);
	arr[index] = e;
}
//deno-lint-ignore no-explicit-any
export function extractEnumPairs<T>(x:any):{t:string, v:T}[] {
	const k:string[] = Object.keys(x);
	if (typeof k[0] === 'number')
		k.splice(0, k.length/2)
	return k.map((ks)=>({t:ks, v:x[ks] as T}))
}
export function matchString(x:string, ...valids:(string|RegExp)[]) {
	return valids.find((unkf)=>{
		const r = unkf as RegExp;
		//@ts-ignore type diff
		if (r.exec)
			return r.exec(x)!=null;
		const f = unkf as string;
		const frags = f.split('*');
		if (frags.length == 1)
			return frags[0] == x;
		let ptr = 0;
		for (let i = 0; i < frags.length; i++) {
			if (frags[i] == '') continue;
			if (i == 0) {
				if (x.startsWith(frags[0])) {
					ptr = frags[0].length;
					continue;
				}
				return false;
			}
			if (i == frags.length - 1) {
				if (x.length >= ptr + frags[i].length && x.endsWith(frags[i]))
					continue;
				return false;
			}
			const idf = x.indexOf(frags[i], ptr);
			if (idf < 0) return false;
			ptr += frags[i].length;
		}
		return true;
	})!=null;
}