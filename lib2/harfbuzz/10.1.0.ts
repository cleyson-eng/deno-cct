import { download } from "./download.ts";
import { compress } from '../../util/exec.ts';
import { path as P } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";

const inctxt = `
function(__self_inc)
	option(SKIP_INSTALL_ALL "" ON)
	option(BUILD_SHARED_LIBS "" OFF)
	option(BUILD_FRAMEWORK "" OFF)
	
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/harfbuzz-10.1.0" "harfbuzz" EXCLUDE_FROM_ALL)

	add_library(x_harfbuzz INTERFACE EXCLUDE_FROM_ALL)
	target_link_libraries(x_harfbuzz INTERFACE harfbuzz harfbuzz-subset)

	#FREETYPE_FOUND retro interdependencie
	#if (FREETYPE_FOUND)
		#547: CMakeLists freetype-2.13.3
		#target_link_libraries(freetype PRIVATE \${HarfBuzz_LIBRARY})
	#endif()
endfunction()

__self_inc()
`;

export async function source(outRoot:string):Promise<Lib> {
	const cache = await download('10.1.0');
	const cmakeRoot = P.resolve(outRoot, 'harfbuzz', 'harfbuzz-10.1.0');

	await compress(cache, P.resolve(outRoot, 'harfbuzz'));

	writeTextFile(P.resolve(outRoot, 'harfbuzz', 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'harfbuzz',
		version:'10.1.0',
		root:cmakeRoot
	};
}