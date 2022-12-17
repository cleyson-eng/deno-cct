import { Button, Form, Label, TextBox } from "../base/cli.ts";
import { TCommand, TFactory, listRequirement, searchUserTools } from "../base/interfaces.ts";
import { Arch, hostPA, PA, Platform } from "../base/target.ts";
import { resolve, basename,fromFileUrl } from "https://deno.land/std@0.154.0/path/mod.ts";
import * as afs from '../base/agnosticFS.ts';
import { readLine } from "../base/cli.ts";
import { formatByteSize } from "../base/download.ts";
import { exitError } from "../base/exit.ts";
import { matchString } from "../base/utils.ts";


const main_url = new URL('../main.ts',import.meta.url)
const root_folder = (()=>{
	if (import.meta.url.indexOf("file://")>=0)
		return resolve(fromFileUrl(import.meta.url), '../..');
	const penv = Deno.env.get("CCT_SH");
	if (penv)
		return resolve(penv);
})();
export const D:TFactory = (tpa:PA) =>{
	const r = new Map<string, TCommand>();
	r.set("configure", async (args:string[], i:number)=>{
		const carr:string[][] = [];
		
		while (i < args.length) {
			if (args[i].startsWith('--')) {
				const ieq = args[i].indexOf('=');
				carr.push((ieq > -1)?
						[args[i].substring(2, ieq), args[i].substring(ieq+1)]:
						[args[i].substring(2)]
					);
			} else break;
			i++;
		}

		if (carr.length == 0) {
			return {i, code:0, loop_keep:await configure()};
		} else {
			for (let ia = 0; ia < carr.length; ia++)
				await configure(...carr[ia])
			return {i, code:0};
		}
	});
	r.set("countline",async (args:string[], i:number)=>{
		let p = args[i];
		if (p) i++;
		else {
			p = '.'
			const tb = new TextBox('path','.', ()=>{
				p = tb.value;
			})
			const f = new Form([
				new Label('CountLines from base path', true),
				tb,
				new Button('Continue', ()=>{f.closeSignal=true;})
			]);
			await f.run();
		}
		
		(new CountLine()).run(p as string).print();
		return {i, code:0};
	});
	r.set("help", help);
	// deno-lint-ignore require-await
	r.set('set',async (args:string[], _:number)=>{
		if (root_folder == undefined) {
			exitError(`Running in web, no local path to create a batch/bash shortcut file, download cct, or set CCT_SH enviromment var., that must be in PATH too.`);
			throw "";
		}
		const command = args.filter((x)=>x!='set').join(' ');
		if (Deno.build.os == "windows")
			Deno.writeTextFileSync(resolve(root_folder, 'cctd.bat'), 
`deno run --allow-all --unstable "${main_url.href}" ${command} %*`);
		else
			Deno.writeTextFileSync(resolve(root_folder, 'cctd'),
`#!/bin/bash
deno run --allow-all --unstable "${main_url.href}" ${command} "$@"`);
		console.log(`Writen cctd shortcut: dcct ${command} <args>`);
		return {i:args.length, code:0};
	});
	// deno-lint-ignore require-await
	r.set('tools', async (args:string[], ia:number)=>{
		let h = hostPA;
		const t = JSON.parse(JSON.stringify(tpa)) as PA;
		if (ia < args.length) {
			switch (args[ia]) {
			case 'all':
				h = {platform:Platform.ANY, arch:Arch.ANY};
				// deno-lint-ignore no-fallthrough
			case 'host':
				t.platform = Platform.ANY;
			case 'platform':
				t.arch = Arch.ANY;
			}
		}
		console.log('Required tools (* in special cases)');
		console.log(searchUserTools(h,t).join('\n'));
		return {i:args.length, code:200};
	})
	r.set('betterlink', async (_:string[], i:number)=>{
		//heavy tool in future, load dynamicly
		const { CLIInterface } = await import("../betterlink/interface.ts");
		await (new CLIInterface(tpa).Main());
		return {i, code:0};
	})
	return r;
}
async function configure(key?:string, value?:string):Promise<boolean> {
	const f = new Form();
	const keys = listRequirement.filter((x)=>x.configure!=undefined).map((k)=>k.name);
	if (key) {
		if (keys.find((x)=>x==(key as string))==null) {
			console.log(`unrecognized configure key "${key}"`);
			return false;
		}
	}
	let loop_keep = false;
	let super_loop_keep = false;
	do { 
		if (key == undefined) {
			loop_keep = true;
			f.elements = [
				new Label("Configure tools dependencies"),
				new Button("⏎", ()=>{super_loop_keep=true;loop_keep=false;f.closeSignal=true;}),
				new Button("Exit", ()=>{loop_keep=false;f.closeSignal=true;}),
				...keys.map((k)=>{
					return new Button(k, ()=>{
						key = k;
						f.closeSignal=true;
					})
				})
			];
			await f.run();
		}
		if (key) {
			const conf = listRequirement.find((x)=>x.name==key&&x.configure!=undefined);
			if (conf && conf.configure) {
				if (!(await conf.configure(value)) && value)
					console.log(`Invalid value for "${key}": "${value}"`);
			}
		}
		key = undefined;
	} while (loop_keep);
	return super_loop_keep;
}

const files_cl = [
	['C++','*.cxx','*.cpp','*.c++','*.cc'],
	['C','*.c'],
	['H++','*.hxx','*.hpp','*.h++','*.hh'],
	['H','*.h'],
	['C#','*.cs'],
	['TXT','*.txt'],
	['XML','*.xml'],
	['HTML','*.html','*.htm','*.xhtm','*.xhtml'],
	['JS','*.js','*.mjs'],
	['TS','*.ts'],
	['Kotlin','*.kt'],
	['CMake','*.cmake','CMakeLists.txt'],
	['GIT','.gitignore'],
	['Batch','*.bat'],
	['Shell','*.sh'],
	['Assembly','*.asm'],
	['Golang','*.go'],
	['SQL','*.sql','*.pgsql','*.psql'],
	['JSON','*.json'],
	['MarkDown','*.md'],
];
const files_c = [
	['Imagen', '*.png','*.jpg','*.jpeg','*.bmp','*.webp','*.gif'],
	['Video', '*.mp4','*.avi','*.mkv','*.webm'],
	['Som', '*.mp3','*.ogg'],
	['Static Lib', '*.lib'],
	['Shared Lib', '*.dll','*.so'],
	['Windows EXE', '*.exe'],
];
//black list
const files_bl = [
	'node_modules',
	'.git',
	'.vscode',
	'build',
	'debug',
	'release',
	'bin'
];

class CountLine {
	res = new Map<string, {q:number,l?:number, size:number}>();
	private log(key:string, size:number, l?:number) {
		if (!this.res.has(key))
			this.res.set(key,{q:0, size:0});
		const r = this.res.get(key) as {q:number,l?:number, size:number};
		if (l){
			if (r.l) r.l+=l;
			else r.l = l;
		}
		r.q++;
		r.size += size
	}
	run(path:string) {
		this.trie(path, true);
		return this;
	}
	print() {
		console.log('Result:');
		Array.from(this.res.keys()).sort().forEach((k)=>{
			//@ts-ignore ignore
			const v = this.res.get(k) as {q:string, l?:number, size:number};
			while (k.length < 10) k+=' ';
			console.log(`  ${k}>> Files: ${v.q+(v.l?` Lines: ${v.l}`:'')} (${formatByteSize(v.size)})`)
		})
		return this;
	}
	private trie(path:string, ignore_blacklist?:true) {
		afs.search(path, (path:string, isFile:boolean)=>{
			const name = basename(path);
			if (ignore_blacklist == null && matchString(name, ...files_bl))
				return false;
			if (!isFile) return true;
			const cstat = afs.stat(path);
			files_c.forEach((v)=>{
				if (matchString(name, ...v.slice(1))) {
					this.log(v[0], cstat.size);
				}
			});
			files_cl.forEach((v)=>{
				if (matchString(name, ...v.slice(1))) {
					try {
						let l = 1;
						const t = afs.readTextFile(path);
						let i = 0;
						while (true) {
							i = t.indexOf('\n', i)+1;
							if (i <= 0) break;
							l++;
						}
						this.log(v[0], cstat.size, l);
					} catch (_) {
						this.log("_Unacessible files", 0);
					}
				}
			});
			return true;
		})
	}
}

async function help (args:string[], i:number) {
	console.log(
`
=== CMAKE ===
DCMAKE USAGE:
  dcct [t.os] [t.arch] cmake <cmake commands/dcmake commands>
  This is will care about any platform specific configuration.
  Obs.: do send '--build' '--DCMAKE_BUILD_TYPE=' '--DCMAKE_CXX_FLAGS_<RELEASE/DEBUG>', this is set intenally as need for each platform.

DCMAKE commands:
  The build type (for every build/config), [default:debug]:
	cvg/(debug-)coverage - Do a debug with coverage build (unsuported without clang).
	dbg/debug - Do a debug build.
	rel(ease(-fast)) - Do a release build optimized for perfomance.
	release-min/release-size - Do a release build optimized for space save.
  Main Commands:
	build - build, if no cmakecache found this will exec "config" too.
	conf(ig(ure))/gen(erate) - Call cmake to (re)create cmakecache file.
	clear - Remove old compilation files and cache.
	  if no main command used, the "config" will be executed automatically.
  Shortcuts, fusion of previous commands:
    reconf(ig(ure))/regen(erate) - clear+config
	rebuild - clear+config+build
	rerel(ease) - rebuild+release
	redbg/redebug - rebuild+debug
	recvg/recoverage - rebuild+coverage
Any other flag command will be piped for the cmake.

== CONFIG ==
To configure options specific for one/some platforms use:
  dcct [t.os] [t.arch] configure <key<=value(experimental)>>
(OBS.: just the options used by the target OS-ARCH will be avaliable, as just supported by host targets will be too)

== set ==
this ill create in deno-cct folder another shortcut:
  cctd(.bat if windows)
with:
  dcct [current target platform + arch] <any parameter after the set command> <repass received parameters from call>
* This will fail if running from web (deno).

== tools ==
will show current host+target required tools.
flags:
  platform - ill show for any arch of current target platform
  host - ill show all required by any target supported by the host
  all - ill show all used in any host for any target
`);
	if (i<args.length) {
		console.log("Press Enter to continue...")
		await readLine();
	}
	return {code:0, i};
}