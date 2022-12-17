
import { resolve } from 'https://deno.land/std@0.154.0/path/mod.ts';
import { exitError } from '../../base/exit.ts';
import { TCommandRes } from '../../base/interfaces.ts';
import { BuildType, PA } from '../../base/target.ts';
import { exec } from '../../base/utils.ts';
import { cmake } from '../cmake.ts';
import { exists } from '../../base/agnosticFS.ts';

export async function runCmake(o:{
	pre?:string[],
	config_additional_args?:string[],
	//return false to use in another way
	filter?:(current:string, out:string[])=>boolean,
	clear?:(p:string)=>void,
	pass?:string[],
	i?:number,
	oldDirConv?:boolean,
	coverage_args?:string[],
	pa?:PA
	preconfig?:(line:string[], bm:BuildType)=>void|Promise<void>,
	posconfig?:(dst:string, bm:BuildType)=>void|Promise<void>,
	release_fast_opt?:string,
	release_min_opt?:string,
}):Promise<TCommandRes> {
	let cmake_program = '';
	if (o.pre == undefined) {
		const temp = await cmake.require();
		if (temp)
			cmake_program = temp;
		else
			exitError("Cant found cmake, need to be installed/configured.");
	}

	const pass:string[] = o.pass?o.pass:[];
	const a_args:string[] = [];
	if (o.config_additional_args)
		a_args.push(...o.config_additional_args);
	let a_src = '..';
	let a_dst = '.';
	let a_clear = false;
	let a_config = false;
	let a_build = false;
	let a_mode:BuildType = BuildType.DEBUG;

	let i = o.i?o.i:0;
	while (i < pass.length) {
		if (pass[i] == '\\r') {
			i++;
			break;
		}
		if (o.filter && !o.filter(pass[i],a_args)) {
			i++;continue;
		}
		if (pass[i].length> 2) {
			if (pass[i].startsWith('-B')) {
				a_dst = pass[i].substring(2);
				i++;continue;
			}
			if (pass[i].startsWith('-S')) {
				a_src = pass[i].substring(2);
				i++;continue;
			}
		}
		if (['.','..'].find((x)=>x==pass[i])!=null || ['.\\','./','..\\','../','"./','".\\','"../','"..\\'].find((x)=>pass[i].startsWith(x))!= null) {
			a_src = pass[i]
			i++;continue;
		}
		switch (pass[i].toLowerCase()) {
		case '-b':
			i++;
			a_dst = pass[i];
			break;
		case '-s':
			i++;
			a_src = pass[i];
			break;
		case 'cvg':
		case 'coverage':
		case 'debug-coverage':
			a_mode = BuildType.DEBUG_COVERAGE;break;
		case 'dbg':
		case 'debug':a_mode = BuildType.DEBUG;break;
		case 'rel':
		case 'release':
		case 'release-fast':
			a_mode = BuildType.RELEASE_FAST;break;
		case 'release-min':
		case 'release-size':
			a_mode = BuildType.RELEASE_MIN;break;
		case 'reconf':
		case 'reconfig':
		case 'reconfigure':
		case 'regen':// deno-lint-ignore no-fallthrough
		case 'regenerate':
			a_clear = true;
		case 'conf':
		case 'config':
		case 'configure':
		case 'gen':
		case 'generate':
			a_config = true;break;
		case 'clear':
			a_clear = true;break;
		case 'build':a_build = true;break;
		case 'rebuild':
			a_clear = true;
			a_config = true;
			a_build = true;
			break;
		case 'rerel':
		case 'rerelease':
			a_clear = true;
			a_config = true;
			a_build = true;
			a_mode = BuildType.RELEASE_FAST;break;
		case 'redbg':
		case 'redebug':
			a_clear = true;
			a_config = true;
			a_build = true;
			a_mode = BuildType.DEBUG;break;
		case 'recvg':
		case 'recoverage':
			a_clear = true;
			a_config = true;
			a_build = true;
			a_mode = BuildType.DEBUG_COVERAGE;break;
		default:
			a_args.push(pass[i]);
		}
		i++;
	}
	if (o.coverage_args && o.coverage_args.length == 0)
		console.log('%c[!] Coverage unsuported for this target.', 'color: yellow;')

	a_src = a_src.replaceAll('"','');
	a_dst = a_dst.replaceAll('"','');
	if (!a_config &&((!a_clear && !a_build) || (
		a_build && !exists(resolve(a_dst,'CMakeCache.txt'))
	))){
		a_config = true;
	}
	if (a_clear) {
		if (o.clear) o.clear(a_dst);
		else {
			//....clear to be implemented
		}
	}
	if (a_config) {
		const line:string[] = [];
		if (o.pre) line.push(...o.pre);
		else line.push(cmake_program);
		if (o.pa) {
			line.push(
				`-DCCT_TARGET=${o.pa.platform}-${o.pa.arch}`,
				`-DCCT_TARGET_PLATFORM=${o.pa.platform}`,
				`-DCCT_TARGET_ARCH=${o.pa.arch}`,
			);
		}
		switch (a_mode) {
		case BuildType.DEBUG_COVERAGE:
			line.push('-DCMAKE_BUILD_TYPE=Debug');
			if (o.coverage_args)
				line.push(...o.coverage_args);
			else
				line.push(
					'-DCMAKE_CXX_FLAGS_DEBUG="-fprofile-instr-generate -fcoverage-mapping"',
					'-DCMAKE_C_FLAGS_DEBUG="-fprofile-instr-generate -fcoverage-mapping"'
				)
			break;
		case BuildType.DEBUG:
			line.push('-DCMAKE_BUILD_TYPE=Debug');break;
		case BuildType.RELEASE_FAST:
			line.push(
				'-DCMAKE_BUILD_TYPE=Release',
				'-DCMAKE_CXX_FLAGS_RELEASE='+(o.release_fast_opt?o.release_fast_opt:'-Ofast'),
				'-DCMAKE_C_FLAGS_RELEASE='+(o.release_fast_opt?o.release_fast_opt:'-Ofast')
			);break;
		case BuildType.RELEASE_MIN:
			line.push(
				'-DCMAKE_BUILD_TYPE=Release',
				'-DCMAKE_CXX_FLAGS_RELEASE='+(o.release_min_opt?o.release_min_opt:'-Os'),
				'-DCMAKE_C_FLAGS_RELEASE='+(o.release_min_opt?o.release_min_opt:'-Os')
			);break;
		}
		line.push(...a_args);

		if (o.oldDirConv)
			line.push(a_src);
		else
			line.push('-B',a_dst,'-S',a_src);

		if (o.preconfig) {
			const res = o.preconfig(line, a_mode);
			if (res) await res;
		}

		const res = await exec(a_dst, fuseDefines(line), {pipeInput:true, pipeOutput:true});
		if (!res.success)
			return {code:res.code};
		if (o.posconfig) {
			const res = o.posconfig(a_dst, a_mode);
			if (res) await res;
		}
	}
	if (a_build) {
		const line:string[] = [];
		if (o.pre) line.push(...o.pre);
		else line.push(cmake_program);
		line.push('--build', '.', '--config',
			(
				a_mode == BuildType.DEBUG||
				a_mode == BuildType.DEBUG_COVERAGE
			)?'Release':'Debug'
		);
		const res = await exec(a_dst, line, {pipeInput:true, pipeOutput:true});
		if (!res.success)
			return {code:res.code};
	}
	return {i, code:0,upperCount:(i<pass.length)?i:undefined };
}

export function fuseDefines(args:string[]):string[] {
	const defs = new Map<string,string>();

	return [
		...args.filter((arg)=>{
			if (!arg.startsWith('-D'))
				return true;
			const i = arg.indexOf('=');
			if (i < 0) {
				const key = arg.substring(2);
				if (!defs.has(key))
					defs.set(key, "");
				return false;
			}
			const key = arg.substring(2, i);
			let value = arg.substring(i+1);
			if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\'')))
				value = value.substring(1, value.length-1);
			if (defs.has(key)) {
				if (value != "") {
					const tv = defs.get(key);
					defs.set(key, tv==""?value:(tv+' '+value));
				}
			} else
				defs.set(key, value);
			return false;
		}),
		...Array.from(defs.keys()).map((key)=>{
			return `-D${key}=${defs.get(key) as string}`;
		})
	];
}