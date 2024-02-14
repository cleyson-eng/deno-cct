import { path as P, path } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";
import * as Cache from '../../util/cache.ts';
import * as AFS from '../../util/agnosticFS.ts';
import { gitList } from "../../util/git.ts";

const inctxt = `
function(__self_inc)
	option(ABSL_PROPAGATE_CXX_STD "" ON)
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/src/abseil-cpp" "abseil-cpp" EXCLUDE_FROM_ALL)
	add_library(libabsl INTERFACE)
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/src/spirv-headers" "spirv-headers" EXCLUDE_FROM_ALL)
	option(SPIRV_SKIP_TESTS "" ON)
	option(SPIRV_SKIP_EXECUTABLES "" ON)
	
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/src/spirv-tools" "spirv-tools" EXCLUDE_FROM_ALL)
endfunction()
__self_inc()
`;

export async function source(outRoot:string):Promise<Lib> {

	const outputCopy = path.resolve(outRoot, 'spirv-tools', 'src')
	let cacheDir = Cache.cache("spirv-tools-1.3.275.0");
	if (!AFS.exists(outputCopy)) {
		if (!AFS.exists(cacheDir))
			AFS.mkdir(cacheDir);
		if (!await gitList(cacheDir,[
			{ dst:'abseil-cpp',
				git:'https://chromium.googlesource.com/chromium/src/third_party/abseil-cpp@4ef9b33175828ea46d091e7e5ec28259d39a8ba5'},
			{ dst:'spirv-headers',
				git:'https://github.com/KhronosGroup/SPIRV-Headers.git@1c6bb2743599e6eb6f37b2969acc0aef812e32e3'},
			{ dst:'spirv-tools',
				git:'https://github.com/KhronosGroup/SPIRV-Tools.git@f0cc85efdbbe3a46eae90e0f915dc1509836d0fc'},
		]))
			throw "failed to get spirv-tools and dependencies";
		AFS.mkdirFile(outputCopy);
		AFS.copy(cacheDir, outputCopy);
	}

	writeTextFile(P.resolve(outRoot, 'spirv-tools', 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'spirv-tools',
		version:'1.3.275.0',
		root:''
	};
}