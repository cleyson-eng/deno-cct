import { download } from "./download.ts";
import { compress } from '../../util/exec.ts';
import { path as P } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";
import { Inject } from "../utils.ts";

const inctxt = `
function(__self_inc)
	set(SKIP_INSTALL_ALL ON)
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/zlib-1.2.13" "zlib")

	add_library(x_zlib_dyn INTERFACE)
	target_link_libraries(x_zlib_dyn INTERFACE zlib)
	
	add_library(x_zlib_sta INTERFACE)
	target_link_libraries(x_zlib_sta INTERFACE zlibstatic)
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

	writeTextFile(P.resolve(outRoot, 'zlib', 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'zlib',
		version:'1.2.13',
		root:cmakeRoot
	};
}