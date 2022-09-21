import { addUserTool, listTCFragments } from "../base/interfaces.ts";
import { Arch, Platform, PA } from "../base/target.ts";


listTCFragments.push({
	compatibleHost:[{platform:Platform.LINUX, arch:Arch.ANY}],
	targets:[Arch.X86_32, Arch.X86_64, Arch.ARM_32, Arch.ARM_64].map((arch)=>({platform:Platform.LINUX, arch})),
	factories:["cmake_linux"]
});

const microsoft_targets:PA[] = [];
[Arch.X86_32, Arch.X86_64, Arch.ARM_32, Arch.ARM_64].forEach((arch)=>{
	microsoft_targets.push(
		{platform:Platform.WINDOWS, arch},
		{platform:Platform.UWP, arch},
	)
});
listTCFragments.push({
	compatibleHost:[{platform:Platform.WINDOWS, arch:Arch.ANY}],
	targets:microsoft_targets,
	factories:["cmake_microsoft"]
});

// tools //
//linux
addUserTool({
	platform:Platform.LINUX,
	arch:Arch.ANY
}, {
	platform:Platform.LINUX,
	arch:Arch.ANY
}, "clang", "gcc");
addUserTool({
	platform:Platform.LINUX,
	arch:Arch.ANY
}, {
	platform:Platform.LINUX,
	arch:Arch.ARM_32
}, "arm-linux-gnueabi-<gcc/g++/ranlib/ar/strip/ld>");
addUserTool({
	platform:Platform.LINUX,
	arch:Arch.ANY
}, {
	platform:Platform.LINUX,
	arch:Arch.ARM_64
}, "aarch64-linux-gnu-<gcc/g++>-11", "aarch64-linux-gnu-<ranlib/ar/strip>");

//win32
addUserTool({
	platform:Platform.WINDOWS,
	arch:Arch.ANY
}, {
	platform:Platform.WINDOWS,
	arch:Arch.ANY
}, "Visual Studio", "Visual Studio - C++");

addUserTool({
	platform:Platform.WINDOWS,
	arch:Arch.ANY
}, {
	platform:Platform.WINDOWS,
	arch:Arch.ARM_32
}, "Visual Studio - C++ ARM support");
addUserTool({
	platform:Platform.WINDOWS,
	arch:Arch.ANY
}, {
	platform:Platform.WINDOWS,
	arch:Arch.ARM_64
}, "Visual Studio - C++ ARM64 support");

//uwp
addUserTool({
	platform:Platform.WINDOWS,
	arch:Arch.ANY
}, {
	platform:Platform.UWP,
	arch:Arch.ANY
}, "Visual Studio", "Visual Studio - UWP C++");
addUserTool({
	platform:Platform.WINDOWS,
	arch:Arch.ANY
}, {
	platform:Platform.UWP,
	arch:Arch.ARM_32
}, "Visual Studio - UWP C++ ARM support");
addUserTool({
	platform:Platform.WINDOWS,
	arch:Arch.ANY
}, {
	platform:Platform.UWP,
	arch:Arch.ARM_64
}, "Visual Studio - UWP C++ ARM64 support");