import { path as P, path } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";
import * as Cache from '../../util/cache.ts';
import * as AFS from '../../util/agnosticFS.ts';
import { gitList } from "../../util/git.ts";

const inctxt = `
function(__self_inc)
	option(SPIRV_CROSS_CLI "" OFF)
	option(SPIRV_CROSS_ENABLE_TESTS "" OFF)
	option(SPIRV_CROSS_SKIP_INSTALL "" ON)
	option(SPIRV_CROSS_FORCE_PIC "" ON)

	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/spirv-cross" "spirv-cross" EXCLUDE_FROM_ALL)

	
	add_library(x_spirv_cross INTERFACE EXCLUDE_FROM_ALL)
	target_link_libraries(x_spirv_cross INTERFACE
		spirv-cross-glsl
		spirv-cross-hlsl
		spirv-cross-cpp
		spirv-cross-reflect
		spirv-cross-msl
		spirv-cross-util
		spirv-cross-core
	)
endfunction()
__self_inc()
`;

export async function source(outRoot:string):Promise<Lib> {

	const outputCopy = path.resolve(outRoot, 'spirv-cross', 'spirv-cross')
	const cacheDir = Cache.cache("spirv-cross-1.3.275.0");
	if (!AFS.exists(outputCopy)) {
		if (!AFS.exists(cacheDir))
			AFS.mkdir(cacheDir);
		if (!await gitList(cacheDir,[
			{ dst:'spirv-cross',
				git:'https://github.com/KhronosGroup/SPIRV-Cross.git@117161dd546075a568f0526bccffcd7e0bc96897'},
		]))
			throw "failed to get spirv-cross and dependencies";
		AFS.mkdirFile(outputCopy);
		AFS.copy(path.resolve(cacheDir, 'spirv-cross'), outputCopy);
	}

	writeTextFile(P.resolve(outRoot, 'spirv-cross', 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'spirv-cross',
		version:'1.3.275.0',
		root:''
	};
}