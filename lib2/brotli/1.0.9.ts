import { download } from "./download.ts";
import { compress } from '../../util/exec.ts';
import { path as P } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";
import { Inject } from "../utils.ts";

const inctxt = `
function(__self_inc)
	option(BROTLI_DISABLE_TESTS "" ON)
	option(ENABLE_COVERAGE "" OFF)
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/brotli-1.0.9" "brotli")

	add_library(x_brotli_dyn INTERFACE)
	target_link_libraries(x_brotli_dyn INTERFACE \${BROTLI_LIBRARIES})
	target_include_directories(x_brotli_dyn INTERFACE \${BROTLI_INCLUDE_DIRS})
	
	add_library(x_brotli_sta INTERFACE)
	target_link_libraries(x_brotli_sta INTERFACE \${BROTLI_LIBRARIES_STATIC})
	target_include_directories(x_brotli_sta INTERFACE \${BROTLI_INCLUDE_DIRS})
endfunction()

__self_inc()
`;

export async function source(outRoot:string):Promise<Lib> {
	const cache = await download('1.0.9');
	const cmakeRoot = P.resolve(outRoot, 'brotli', 'brotli-1.0.9');

	await compress(cache, P.resolve(outRoot, 'brotli'));
	//fix cmake
	const f = new Inject(P.resolve(cmakeRoot, 'CMakeLists.txt'));
	f.cmake_noInstalls()
	 .cmake_CStand(17)
	 .cmake_CXXStand(17)
	 .cmake_pic()
	 .cmake_stripReferences("brotli")
	 .save();

	writeTextFile(P.resolve(outRoot, 'brotli', 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'brotli',
		version:'1.0.9',
		root:cmakeRoot
	};
}