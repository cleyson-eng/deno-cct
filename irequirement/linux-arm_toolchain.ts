import { listRequirement, Requirement } from '../base/interfaces.ts';
import { cachedKeys } from '../base/cache.ts';
import { Button, Form, Label } from '../base/cli.ts';
import { configureToolchain, Toolchain, validToolchain } from './auxi/toolchain.ts';
import { Arch } from '../base/target.ts';

interface ArmTCs {
	arm64:Toolchain
	arm32:Toolchain
}
const ATC_default = {
	arm64:{
		c:'aarch64-linux-gnu-gcc-11',
		cxx:'aarch64-linux-gnu-g++-11',
		ranlib:'aarch64-linux-gnu-ranlib',
		ar:'aarch64-linux-gnu-ar',
		strip:'aarch64-linux-gnu-strip',
		ld:'aarch64-linux-gnu-ld',
	},
	arm32:{
		c:'arm-linux-gnueabi-gcc',
		cxx:'arm-linux-gnueabi-g++',
		ranlib:'arm-linux-gnueabi-ranlib',
		ar:'arm-linux-gnueabi-ar',
		strip:'arm-linux-gnueabi-strip',
		ld:'arm-linux-gnueabi-ld'
	}
}as ArmTCs;
export const ctoolchain_arm = {
	name:"cross-linux-arm_toolchains",
	title:"Clang/GCC",
	require:async (pc?:boolean, arch?:Arch)=>{
		const s = cachedKeys.get("linux-arm_toolchains");
		let v:ArmTCs;
		if (s == null) v = ATC_default;
		else v = JSON.parse(s) as ArmTCs;
		
		if (arch == Arch.ARM_32) {
			if (pc !== true && cachedKeys.has("linux-arm_toolchains_cache32"))
				return v.arm32;
			if (!await validToolchain(v.arm32))
				return undefined;
			cachedKeys.set("linux-arm_toolchains_cache32", "T")
			return v.arm32;
		}
		if (arch == Arch.ARM_64) {
			if (pc !== true && cachedKeys.has("linux-arm_toolchains_cache64"))
				return v.arm64;
			if (!await validToolchain(v.arm64))
				return undefined;
			cachedKeys.set("linux-arm_toolchains_cache64", "T")
			return v.arm64;
		}
	},
	configure:async function (_?:string) {
		const s = cachedKeys.get("linux-arm_toolchains");
		let v:ArmTCs;
		if (s == null) v = JSON.parse(JSON.stringify(ATC_default)) as ArmTCs;
		else v = JSON.parse(s) as ArmTCs;

		const b64 = new Button("ARM64: "+JSON.stringify(v.arm64), async ()=>{
			await configureToolchain(v.arm64);
			b64.title = "ARM64: "+JSON.stringify(v.arm64);
		});
		const b32 = new Button("ARM32: "+JSON.stringify(v.arm32), async ()=>{
			await configureToolchain(v.arm32);
			b32.title = "ARM32: "+JSON.stringify(v.arm32);
		});

		const f = new Form([
			new Label(this.title, true),
			new Button("Apply", ()=>{f.closeSignal=true;}),
			new Button("Reset", ()=>{
				v = JSON.parse(JSON.stringify(ATC_default)) as ArmTCs;
				b64.title = "ARM64: "+JSON.stringify(v.arm64);
				b32.title = "ARM32: "+JSON.stringify(v.arm32);
			}),
			b64,
			b32,
		]);
		await f.run();

		cachedKeys.set("linux-arm_toolchains", JSON.stringify(v));
		cachedKeys.delete("linux-arm_toolchains_cache32")
		cachedKeys.delete("linux-arm_toolchains_cache64")
		return true;
	}
}
listRequirement.push(ctoolchain_arm as Requirement<Toolchain|undefined>);