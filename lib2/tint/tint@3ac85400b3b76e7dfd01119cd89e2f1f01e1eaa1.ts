import { path } from "../../deps.ts";
import { cache } from "../../mod.ts";
import * as AFS from '../../util/agnosticFS.ts';
import { gitList } from "../../util/git.ts";

/*
dependency tree
	tint => https://daw.googlesource.com/tint                                                           @ 3ac85400b3b76e7dfd01119cd89e2f1f01e1eaa1
	tint/third_party/abseil-cpp => https://chromium.googlesource.com/chromium/src/third_party/abseil-cpp@ 4ef9b33175828ea46d091e7e5ec28259d39a8ba5
	tint/third_party/vulkan-deps/spirv-headers/src => https://github.com/KhronosGroup/SPIRV-Headers.git @ 1c6bb2743599e6eb6f37b2969acc0aef812e32e3 (vk 1.3.275.0)
	tint/third_party/vulkan-deps/spirv-tools/src => https://github.com/KhronosGroup/SPIRV-Tools.git     @ f0cc85efdbbe3a46eae90e0f915dc1509836d0fc (vk 1.3.275.0)

@: git checkout -f <@comit>

based on needs of https://github.com/BabylonJS/twgsl

*/
export async function tint(cacheDir:string, outputCopy:string) {
	if (AFS.exists(outputCopy)) return;
	if (!AFS.exists(cacheDir))
		AFS.mkdir(cacheDir);
	if (!await gitList(cacheDir,[
		{ dst:'tint',
			git:'https://dawn.googlesource.com/tint@3ac85400b3b76e7dfd01119cd89e2f1f01e1eaa1'},
		/*{ dst:'tint/third_party/abseil-cpp',
			git:'https://chromium.googlesource.com/chromium/src/third_party/abseil-cpp@4ef9b33175828ea46d091e7e5ec28259d39a8ba5'},
		{ dst:'tint/third_party/vulkan-deps/spirv-headers/src',
			git:'https://github.com/KhronosGroup/SPIRV-Headers.git@1c6bb2743599e6eb6f37b2969acc0aef812e32e3'},
		{ dst:'tint/third_party/vulkan-deps/spirv-tools/src',
			git:'https://github.com/KhronosGroup/SPIRV-Tools.git@f0cc85efdbbe3a46eae90e0f915dc1509836d0fc'},
			todas as dependencias no spirv-tools 1.3.275.0
			*/
	]))
		throw "failed to get tint";
	AFS.mkdirFile(outputCopy);
	AFS.copy(path.resolve(cacheDir, 'tint'), outputCopy);
}