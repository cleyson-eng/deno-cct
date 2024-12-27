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

	option(FT_DISABLE_HARFBUZZ "" ON)
	option(FT_DISABLE_PNG "" ON)
	option(FT_DISABLE_ZLIB "" ON)
	option(FT_DISABLE_BZIP2 "" ON)
	option(FT_DISABLE_BROTLI "" ON)
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/freetype-2.13.3" "freetype" EXCLUDE_FROM_ALL)
	
	add_library(x_freetype INTERFACE EXCLUDE_FROM_ALL)
	target_link_libraries(x_freetype INTERFACE freetype)
	
	#FINDABLE by harfbuzz
	set(FREETYPE_FOUND ON PARENT_SCOPE)
	set(FREETYPE_LIBRARIES zlibstatic PARENT_SCOPE)
	
	if(x_harfbuzz)
		message(FATAL_ERROR "harfbuzz must be included after freetype")
	endif()
endfunction()

__self_inc()
`;

export async function source(outRoot:string):Promise<Lib> {
	const cache = await download('2.13.3');
	const cmakeRoot = P.resolve(outRoot, 'freetype', 'freetype-2.13.3');

	await compress(cache, P.resolve(outRoot, 'freetype'));

	writeTextFile(P.resolve(outRoot, 'freetype', 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'freetype',
		version:'2.13.3',
		root:cmakeRoot
	};
}