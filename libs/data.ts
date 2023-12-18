import { path } from '../deps.ts';
import * as target from '../util/target.ts';
import { exitError } from '../util/exit.ts';
import { KVFile } from "../util/kvfile.ts";

/*
FS:
{CWD}/build/
	kv.json (global level)
	host-{host platform}/
		kv.json (host level)
		{target platform}/
			kv.json (target(cur) level)
			[PROJECT]
		[PROJECT]
	[PROJECT]

PROJECT:
	{project}/
		out(-{build type})/ has symbolic links or product of /build
			executable
			static/ ...
			dynamic/ ...
		build(-{build type})/ build process files
		cache/ used to store source of in cct imported & build libraries

*/
export enum Scope {
	GLOBAL,
	HOST,
	TARGET,
}
export function root(scope:Scope, ...p:string[]) {
	let r = '';
	switch (scope) {
	case Scope.GLOBAL:r=outPath;break;
	case Scope.HOST:r=outPathHost;break;
	case Scope.TARGET:r=outPathCur;break;
	}
	return path.resolve(r, ...p);
}
export function kv(scope:Scope) {
	switch (scope) {
	default:
	case Scope.GLOBAL:return kvGlobal;
	case Scope.HOST:return kvHost;
	case Scope.TARGET:{
		if (kvCur == undefined)
			throw exitError('Unset target, use [data.ts].setCurrentTarget(Platform&Arch)');
		return kvCur as KVFile;
	}}
}
export function projectRoot(name:string) {
	return (scope:Scope, ...p:string[])=>{
		return path.resolve(root(scope), name, ...p);
	};
}

const outPath = (()=>{
	let ret = Deno.cwd();//new URL('.', import.meta.url).pathname;
	if (ret.match(/^(\/[A-Z]):\//))
		ret = ret.substring(1);
	console.log(ret);
	Deno.args.find((x)=>{
		if (x.startsWith('cache=') && x.length > 6) {
			const config = (x.charAt(6) == '"')?x.substring(7, x.length - 1):x.substring(6);
			ret = path.resolve(ret, config);
			return true;
		}
		return false;
	})
	return path.resolve(ret, 'build');
})();
const outPathHost = path.resolve(outPath, 'host-'+target.hostPA.platform+'-'+target.hostPA.arch);
let outPathCur = '';

export let curTarget:target.PA;



const kvGlobal = new KVFile(outPath);
const kvHost = new KVFile(outPathHost);
let kvCur:undefined|KVFile;

export function setCurrentTarget(x:target.PA) {
	curTarget = x;
	outPathCur = path.resolve(outPathHost, x.platform+'-'+x.arch);
	if (kvCur != undefined)
		kvCur.dispose();
	kvCur = new KVFile(outPathCur);
}
setCurrentTarget(target.hostPA);