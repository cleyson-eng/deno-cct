import { addUserTool, listTCFragments } from "../base/interfaces.ts";
import { Arch, Platform } from "../base/target.ts";

//emscripten
listTCFragments.push({
	compatibleHost:[{platform:Platform.ANY, arch:Arch.ANY}],
	targets:[Arch.WASM32, Arch.JAVASCRIPT].map((arch)=>({platform:Platform.BROWSER, arch})),
	factories:["cmake_emsdk"]
});
//android
listTCFragments.push({
	compatibleHost:[{platform:Platform.ANY, arch:Arch.ANY}],
	targets:[Arch.X86_32, Arch.X86_64, Arch.ARM_32, Arch.ARM_64].map((arch)=>({platform:Platform.ANDROID, arch})),
	factories:["cmake_android"]
})

// tools //
//emsdk
addUserTool({
	platform:Platform.ANY,
	arch:Arch.ANY
}, {
	platform:Platform.BROWSER,
	arch:Arch.ANY
}, "emSDK (emscripten)");
//android
addUserTool({
	platform:Platform.ANY,
	arch:Arch.ANY
}, {
	platform:Platform.ANDROID,
	arch:Arch.ANY
}, "Android Studio + NDK");