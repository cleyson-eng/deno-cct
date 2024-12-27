import { download } from "./download.ts";
import { compress } from '../../util/exec.ts';
import { path as P } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";
import { Inject } from "../utils.ts";

const inctxt = `
function(__self_inc)
	option(PNG_STATIC "" ON)
	option(PNG_SHARED "" OFF)
	option(PNG_FRAMEWORK "" OFF)
	option(PNG_TESTS "" OFF)
	option(PNG_TOOLS "" OFF)
	option(PNG_EXECUTABLES "" OFF)
	option(PNG_DEBUG "" OFF)
	option(PNG_HARDWARE_OPTIMIZATIONS "" ON)#<<<
	option(SKIP_INSTALL_ALL "" ON)
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/libpng-1.6.44" "libpng" EXCLUDE_FROM_ALL)
	
	target_link_libraries(png_static PUBLIC x_zlib_sta)
	add_library(x_libpng INTERFACE EXCLUDE_FROM_ALL)
	target_link_libraries(x_libpng INTERFACE png_static)

	#FINDABLE by freetype
	set(PNG_FOUND ON PARENT_SCOPE)
	set(PNG_LIBRARIES x_libpng PARENT_SCOPE)
endfunction()

__self_inc()
`;

export async function source(outRoot:string):Promise<Lib> {
	const cache = await download('1.6.44');
	const cmakeRoot = P.resolve(outRoot, 'libpng', 'libpng-1.6.44');

	await compress(cache, P.resolve(outRoot, 'libpng'));

	//fix cmake
	/*const f = new Inject(P.resolve(cmakeRoot, 'CMakeLists.txt'));
	f.cmake_noInstalls()
	 .cmake_CStand(17)
	 .cmake_CXXStand(17)
	 .cmake_pic()
	 .cmake_stripReferences("brotli")
	 .save();*/

	writeTextFile(P.resolve(outRoot, 'libpng', 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'libpng',
		version:'1.6.44',
		root:cmakeRoot
	};
}