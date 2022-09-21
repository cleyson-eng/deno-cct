import { Button, Form, Label, TextBox } from "../base/cli.ts";
import { TCommand, TFactory, listRequirement, searchUserTools } from "../base/interfaces.ts";
import { Arch, hostPA, PA, Platform } from "../base/target.ts";
import { resolve, basename,fromFileUrl } from "https://deno.land/std@0.154.0/path/mod.ts";
import * as afs from '../base/agnosticFS.ts';
import { readLine } from "../base/cli.ts";

const root_folder = resolve(fromFileUrl(import.meta.url), '../..');
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
		const command = args.filter((x)=>x!='set').join(' ');
		if (Deno.build.os == "windows")
			Deno.writeTextFileSync(resolve(root_folder, 'cctd.bat'), 
`set P=%~dp0%main.ts
deno run --allow-all --unstable %P% ${command} %*`);
		else
			Deno.writeTextFileSync(resolve(root_folder, 'cctd'),
`#!/bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "\${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
deno run --allow-all --unstable "\${SCRIPT_DIR/$'\r'/}/main.ts" ${command} "$@"`);
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
function testString(x:string, ...filter:string[]) {
	return filter.find((f)=>{
		const si = f.indexOf('*');
		if (si < 0)
			return f == x;
		if (si == 0)
			return x.endsWith(f.substring(1));
		if (si >= f.length - 1)
			return x.startsWith(f.substring(0, f.length-1));
		return x.length>f.length-1 && x.startsWith(f.substring(0,si)) && x.endsWith(f.substring(si+1));
	})!=null;
}

class CountLine {
	res = new Map<string, {q:number,l?:number}>();
	private log(key:string, l?:number) {
		if (!this.res.has(key))
			this.res.set(key,{q:0});
		const r = this.res.get(key) as {q:number,l?:number};
		if (l){
			if (r.l) r.l+=l;
			else r.l = l;
		}
		r.q++;
	}
	run(path:string) {
		this.trie(path, true);
		return this;
	}
	print() {
		console.log('Result:');
		Array.from(this.res.keys()).sort().forEach((k)=>{
			//@ts-ignore ignore
			const v = this.res.get(k) as {q:string, l?:number};
			while (k.length < 10) k+=' ';
			console.log(`  ${k}>> Files: ${v.q+(v.l?` Lines: ${v.l}`:'')}`)
		})
		return this;
	}
	private trie(path:string, ignore_blacklist?:true) {
		const name = basename(path);
		if (ignore_blacklist == null && testString(name, ...files_bl))
			return;
		if (afs.statSync(path).isDirectory) {
			Array.from(afs.readDirSync(path)).forEach((sub)=>{
				this.trie(resolve(path, sub.name));
			});
		} else {
			files_c.forEach((v)=>{
				if (testString(name, ...v.slice(1))) {
					this.log(v[0]);
				}
			});
			files_cl.forEach((v)=>{
				if (testString(name, ...v.slice(1))) {
					try {
						let l = 1;
						const t = afs.readTextFileSync(path);
						let i = 0;
						while (true) {
							i = t.indexOf('\n', i)+1;
							if (i <= 0) break;
							l++;
						}
						this.log(v[0], l);
					} catch (_) {
						this.log("_Unacessible files");
					}
				}
			});
		}
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