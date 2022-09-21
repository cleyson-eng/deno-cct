import { listTCFragments } from "../base/interfaces.ts";
import { Arch, Platform } from "../base/target.ts";

listTCFragments.push({
	compatibleHost:[{platform:Platform.ANY, arch:Arch.ANY}],
	targets:[{platform:Platform.ANY, arch:Arch.ANY}],
	factories:["others"]
});