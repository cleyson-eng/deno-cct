import { download } from "./download.ts";
import { compress } from '../../util/exec.ts';
import { path as P } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";
import { Inject } from "../utils.ts";

const inctxt = `
function(__self_inc)
	option(SKIP_INSTALL_ALL "" ON)
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/zlib-1.2.13" "zlib" EXCLUDE_FROM_ALL)

	add_library(x_zlib_dyn INTERFACE EXCLUDE_FROM_ALL)
	target_link_libraries(x_zlib_dyn INTERFACE zlib)
	target_include_directories(x_zlib_dyn INTERFACE "\${CMAKE_CURRENT_LIST_DIR}/zlib-1.2.13" "\${CMAKE_CURRENT_BINARY_DIR}/zlib")
	
	add_library(x_zlib_sta INTERFACE EXCLUDE_FROM_ALL)
	target_link_libraries(x_zlib_sta INTERFACE zlibstatic)
	target_include_directories(x_zlib_sta INTERFACE "\${CMAKE_CURRENT_LIST_DIR}/zlib-1.2.13" "\${CMAKE_CURRENT_BINARY_DIR}/zlib")

	#FINDABLE by boost/freetype
	set(ZLIB_FOUND ON PARENT_SCOPE)
	set(ZLIB_LIBRARY zlibstatic PARENT_SCOPE)
	set(ZLIB_LIBRARIES zlibstatic PARENT_SCOPE)
	set(ZLIB_INCLUDE_DIR "\${CMAKE_CURRENT_LIST_DIR}/zlib-1.2.13" "\${CMAKE_CURRENT_BINARY_DIR}/zlib" CACHE INTERNAL "ZLIB_INCLUDE_DIR")
	set(ZLIB_INCLUDE_DIRS "\${CMAKE_CURRENT_LIST_DIR}/zlib-1.2.13" "\${CMAKE_CURRENT_BINARY_DIR}/zlib" CACHE INTERNAL "ZLIB_INCLUDE_DIR")
	add_library(ZLIB::ZLIB ALIAS zlibstatic)
	set(BOOST_IOSTREAMS_ENABLE_ZLIB ON PARENT_SCOPE)
endfunction()

__self_inc()
`;

export async function source(outRoot:string):Promise<Lib> {
	const cache = await download('1.2.13');
	const cmakeRoot = P.resolve(outRoot, 'zlib', 'zlib-1.2.13');

	await compress(cache, P.resolve(outRoot, 'zlib'));
	//fix cmake
	const f = new Inject(P.resolve(cmakeRoot, 'CMakeLists.txt'));
	f.cmake_noInstalls()
	 .cmake_CStand(17)
	 .cmake_CXXStand(17)
	 .cmake_pic()
	 .cmake_stripReferences("minigzip")
	 .cmake_stripReferences("example")
	 .cmake_stripReferences("minigzip64")
	 .cmake_stripReferences("example64")
	 .save();

	//remove wrong symbol (error)
	const f2 = new Inject(P.resolve(cmakeRoot, 'zlib.map'));
	f2.replace(/(\s)*gz_intmax;/g, '').save();

	writeTextFile(P.resolve(outRoot, 'zlib', 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'zlib',
		version:'1.2.13',
		root:cmakeRoot
	};
}