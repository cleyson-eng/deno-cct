//deno-lint-ignore-file no-case-declarations
import { Arch, Platform, hostPA, CToolchain_props } from '../util/target.ts';
import { runCmake } from './common/cmake.ts';
import { exitError } from '../util/exit.ts';
import { CToolchain } from '../util/target.ts';
import { kv, Scope } from '../data.ts';
import { execTest } from '../util/exec.ts';

function CMake_argsFromTC(tc:CToolchain|undefined) {
	if (tc == undefined)
		throw exitError(`[CMake.linux] Toolchain not found or incomplete for the target`);
	
	return [`-DCMAKE_C_COMPILER=${tc.c}`,`-DCMAKE_CXX_COMPILER=${tc.cxx}`];
}
export async function CMake(arch:Arch, args:string[]) {
	if (hostPA.platform != Platform.LINUX)
		throw exitError(`[CMake.linux] Incompatible host platform`);
	
	const pa = {arch,platform:Platform.LINUX};
	if (hostPA.arch == Arch.X86_64 || hostPA.arch == Arch.X86_32) {
		switch (pa.arch) {
		case Arch.X86_64:
		case Arch.X86_32:
			const bits = (arch == Arch.X86_32)?'32':'64';
			return await runCmake({
				pass:args,
				pa,
				config_additional_args:[...CMake_argsFromTC(await require_clangOrGCC()),`-DCMAKE_C_FLAGS="-m${bits}"`,`-DCMAKE_CXX_FLAGS="-m${bits}"`]
			});
		case Arch.ARM_32:
		case Arch.ARM_64:
			return await runCmake({
				pass:args,
				pa,
				config_additional_args:[...CMake_argsFromTC(await require_arm(arch)),'-DCMAKE_C_FLAGS="-m32"','-DCMAKE_CXX_FLAGS="-m32"']
			});
		}
	}
	if (pa.arch == hostPA.arch) {
		await new Promise(()=>{})
		return await runCmake({
			pass:args,
			pa
		});
	}
	throw exitError(`[CMake.linux] Cross architecture builds from arm platform not implemented yet...`);
}

//find
//prefer clang over gcc
export async function require_clangOrGCC ():Promise<CToolchain|undefined> {
	const tmp = kv(Scope.HOST).pairs.get('linux-tc');
	if (tmp != undefined)
		return JSON.parse(tmp) as CToolchain;

	let ret;
	if ((await execTest('clang')) && (await execTest('clang++')))
		ret = {c:'clang',cxx:'clang++'};
	else if ((await execTest('gcc')) && (await execTest('g++')))
		ret = {c:'gcc',cxx:'g++'};
	if (ret != undefined)
		kv(Scope.HOST).pairs.set('linux-tc', JSON.stringify(ret));
	return ret;
}
export async function require_arm (arch: Arch):Promise<CToolchain|undefined> {
	if (arch == Arch.ARM_32) {
		const tc = {
			c:'arm-linux-gnueabi-gcc',
			cxx:'arm-linux-gnueabi-g++',
			ranlib:'arm-linux-gnueabi-ranlib',
			ar:'arm-linux-gnueabi-ar',
			strip:'arm-linux-gnueabi-strip',
			ld:'arm-linux-gnueabi-ld'
		};
		if (kv(Scope.HOST).pairs.get('linux-arm32-istcfull') !== "true") {
			//@ts-ignore type mismatch
			const apps = (CToolchain_props.map((x)=>tc[x]).filter((x)=>x!=undefined) as string[]);
			for (let i = 0; i < apps.length; i++) {
				if (!(await execTest(apps[i])))
					return;
			}
			kv(Scope.HOST).pairs.set("linux-arm32-istcfull", "true");
		}
		return tc;
	}
	//arm64 V
	let cversion = '';
	const tmp = kv(Scope.HOST).pairs.get('linux-arm64-cversion');
	if (tmp != undefined)
		cversion = tmp;
	else {
		for (let i = 11; i > 8; i--) {
			if ((await execTest(`aarch64-linux-gnu-gcc-${i}`)) && (await execTest(`aarch64-linux-gnu-g++-${i}`))) {
				cversion = i+"";
				break;
			}
		}
		if (cversion == '')
			return;
		kv(Scope.HOST).pairs.set('linux-arm64-cversion', cversion);
	}
	const tc = {
		c:`aarch64-linux-gnu-gcc-${cversion}`,
		cxx:`aarch64-linux-gnu-g++-${cversion}`,
		ranlib:'aarch64-linux-gnu-ranlib',
		ar:'aarch64-linux-gnu-ar',
		strip:'aarch64-linux-gnu-strip',
		ld:'aarch64-linux-gnu-ld',
	};

	if (kv(Scope.HOST).pairs.get('linux-arm64-istcfull') !== "true") {
		//@ts-ignore type mismatch
		const apps = (CToolchain_props.filter((x)=>x!='c'&&x!='cxx').map((x)=>tc[x]).filter((x)=>x!=undefined) as string[]);
		for (let i = 0; i < apps.length; i++) {
			if (!(await execTest(apps[i])))
				return;
		}
		kv(Scope.HOST).pairs.set("linux-arm64-istcfull", "true");
	}
	return tc;
}