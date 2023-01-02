import { Arch, PA, Platform } from '../../util/target.ts';
import { kv, Scope } from '../../data.ts';
import { deepClone } from '../../util/utils.ts';
import { exec } from '../../util/exec.ts';
import { path as P } from '../../deps.ts';
import { tArch, tPlatform, TScope } from '../../util/target.ts';

export async function getPAs ():Promise<PA[]> {
	const tmp = kv(Scope.HOST).get('go-pas');
	if (tmp)
		return JSON.parse(tmp) as PA[];
	const cmd = Deno.run({
		cmd: ["go","tool","dist","list"], 
		stdout: "piped",
		stderr: "piped"
	});
	const output = await cmd.output();
	cmd.close();

	const outStr = new TextDecoder().decode(output);
	let r:PA[] = [];
	outStr.match(/[^\n\r]\w+[\/\\]\w+/g)?.forEach((x)=>{
		const v = x.replace('\\','/').split('/');
		if (v.length != 2) return;
		const platforms:Platform[] = [];
		const archs:Arch[] = [];
		switch (v[0]) {
		case 'linux':platforms.push(Platform.LINUX);break;
		case 'windows':platforms.push(Platform.WINDOWS);break;
		case 'darwin':platforms.push(Platform.MACOS);break;
		/*DROPED support
		case 'android':platforms.push(Platform.ANDROID);break;
		case 'ios':platforms.push(Platform.IOS);break;
		case 'js':platforms.push(Platform.BROWSER);break;*/
		}
		switch(v[1]) {
		case '386':archs.push(Arch.X86_32);break;
		case 'amd64':archs.push(Arch.X86_64);break;
		case 'arm':archs.push(Arch.ARM_32);break;
		case 'arm64':archs.push(Arch.ARM_64);break;
		//case 'wasm':archs.push(Arch.WASM32, Arch.JAVASCRIPT);break;
		}
		platforms.forEach((platform)=>{
			archs.forEach((arch)=>{
				r.push({platform, arch});
			})
		})
	});
	r = r.filter((x, i, xa)=>xa.findIndex((c)=>c.arch == x.arch && c.platform == x.platform) == i);
	kv(Scope.HOST).set('xcode-sdkvs', JSON.stringify(r))
	return r;
}

export enum BMode {
	APP = 'exe',
	STA_GOLIB = 'archive',
	DYN_GOLIB = 'shared',
	STA_CLIB = 'c-archive',
	DYN_CLIB = 'c-shared',
}
export interface CrossOptions {
	target?:PA
	cc_path?:string
	cc_flags?:string
}
export interface Options {
	input?:string
	outputFile?:string
	bmode?:BMode
	cross?:CrossOptions
	cgo_enabled?:boolean
	cc_flags?:string
}

export async function goBuild(o:Options) {
	const env:Record<string,string> = {};
	const line = ['go', 'build'];
	let cwd = Deno.cwd();

	if (o.input) {
		if (Deno.statSync(o.input).isFile) {
			const sp = P.resolve(o.input);
			line.push(P.basename(sp));
			cwd = P.resolve(sp, '..');
		} else cwd = P.resolve(o.input);
	}

	if (o.outputFile)
		line.push('-o', P.resolve(o.outputFile));

	if (o.bmode)
		line.push('-buildmode='+o.bmode);
	if (o.cgo_enabled)
		env['CGO_ENABLED'] = '1';
	
	const cflags:string[] = [];
	if (o.cc_flags) {
		const tmp = o.cc_flags.trim();
		if (tmp != '')
			cflags.push(tmp);
	}
	
	if (o.cross) {
		if (o.cross.cc_flags) {
			const tmp = o.cross.cc_flags.trim();
			if (tmp != '')
				cflags.push(tmp);
		}
		if (o.cross.cc_path)
			env['CC'] = o.cross.cc_path;
		if (o.cross.target) {
			env['GOOS'] = tPlatform.iot(o.cross.target.platform, TScope.GO);
			env['GOARCH'] = tArch.iot(o.cross.target.arch, TScope.GO);
		}
	}
	
	if (cflags.length > 0)
		env['CGO_LDFLAGS'] = cflags.join(' ');
	
	return await exec(cwd, line, {pipeInput:true, pipeOutput:true,env:deepClone(Deno.env, env)});
}