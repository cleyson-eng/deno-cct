import { path as P, path } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";
import * as Cache from '../../util/cache.ts';
import * as AFS from '../../util/agnosticFS.ts';
import { gitList } from "../../util/git.ts";

const inctxt = `
function(__self_inc)
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/glslang" "glslang" EXCLUDE_FROM_ALL)
	add_library(x_glslang INTERFACE EXCLUDE_FROM_ALL)
	target_link_libraries(x_glslang INTERFACE
		glslang
	)
	target_compile_definitions(x_glslang INTERFACE X_GLSLANG=1)
endfunction()
__self_inc()
`;

export async function source(outRoot:string):Promise<Lib> {

	const outputCopy = path.resolve(outRoot, 'glslang', 'glslang')
	const cacheDir = Cache.cache("glslang-1.3.275.0");
	if (!AFS.exists(outputCopy)) {
		if (!AFS.exists(cacheDir))
			AFS.mkdir(cacheDir);
		if (!await gitList(cacheDir,[
			{ dst:'glslang',
				git:'https://github.com/KhronosGroup/glslang.git@a91631b260cba3f22858d6c6827511e636c2458a'},
		]))
			throw "failed to get glslang and dependencies";
		AFS.mkdirFile(outputCopy);
		AFS.copy(path.resolve(cacheDir, 'glslang'), outputCopy);
	}

	writeTextFile(P.resolve(outRoot, 'glslang', 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'glslang',
		version:'1.3.275.0',
		root:''
	};
}