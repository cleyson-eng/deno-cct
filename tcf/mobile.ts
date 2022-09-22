import { addUserTool, listTCFragments } from "../base/interfaces.ts";
import { Arch, Platform } from "../base/target.ts";


//emscripten
listTCFragments.push({
	compatibleHost:[{platform:Platform.ANY, arch:Arch.ANY}],
	targets:[Arch.WASM32, Arch.JAVASCRIPT].map((arch)=>({platform:Platform.BROWSER, arch})),
	factories:["cmake_emsdk"]
});

// tools //
//emsdk
addUserTool({
	platform:Platform.ANY,
	arch:Arch.ANY
}, {
	platform:Platform.BROWSER,
	arch:Arch.ANY
}, "emSDK (emscripten)");