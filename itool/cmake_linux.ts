import { exitError } from "../base/exit.ts";
import { TCommand, TFactory } from "../base/interfaces.ts";
import { Arch, hostPA, PA } from "../base/target.ts";
import { runCmake } from "../irequirement/auxi/cmake_parse.ts";
import { ctoolchain } from "../irequirement/host_toolchain.ts";
import { ctoolchain_arm } from "../irequirement/linux-arm_toolchain.ts";


async function requireClangOrGCC():Promise<string[]> {
	const tc = await ctoolchain.require();
	if (tc.length>0) {
		return [`-DCMAKE_C_COMPILER=${tc[0].c}`,`-DCMAKE_CXX_COMPILER=${tc[0].cxx}`];
	}
	return [];
}

async function crossCompileForArm(pa:PA, args:string[], i:number) {
	const tc = await ctoolchain_arm.require(undefined, pa.arch);
	if (tc == undefined) {
		console.log("Dependecies not found/bad configured toolchain for this target");
		return {code:404};
	}
	return await runCmake({
		i:i,
		pass:args,
		pa,
		config_additional_args:[`-DCMAKE_C_COMPILER="${tc.c}"`,`-DCMAKE_CXX_COMPILER=${tc.cxx}`]
	});
}

export const D:TFactory = (pa:PA) =>{
	const r = new Map<string, TCommand>();
	r.set("cmake",  async (args:string[], i:number)=>{
		if (hostPA.arch == Arch.X86_64 || hostPA.arch == Arch.X86_32) {
			switch (pa.arch) {
			case Arch.X86_64:
				return await runCmake({
					i:i,
					pass:args,
					pa,
					config_additional_args:[...(await requireClangOrGCC()),'-DCMAKE_C_FLAGS="-m64"','-DCMAKE_CXX_FLAGS="-m64"']
				});
			case Arch.X86_32:
				return await runCmake({
					i:i,
					pass:args,
					pa,
					config_additional_args:[...(await requireClangOrGCC()),'-DCMAKE_C_FLAGS="-m32"','-DCMAKE_CXX_FLAGS="-m32"']
				});
			case Arch.ARM_32:
			case Arch.ARM_64:
				return await crossCompileForArm(pa, args, i);
			}
		}
		if (pa.arch == hostPA.arch) {
			await new Promise(()=>{})
			return await runCmake({
				i:i,
				pass:args,
				pa
			});
		}
		exitError(`Arch target from current host arch not implemented`);
		throw '';
	});
	return r;
};