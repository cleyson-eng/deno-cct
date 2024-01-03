import { download } from "./download.ts";
import { compress } from '../../util/exec.ts';
import { path as P } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";

const inctxt = `
include("\${CMAKE_CURRENT_LIST_DIR}/../compat.cmake")

function(__self_inc)
	set(valid OFF)
	if(CCT_TARGET_PLATFORM STREQUAL "win32")
		set(valid ON)
	endif()
	if(CCT_TARGET_PLATFORM STREQUAL "darwin")
		set(valid ON)
	endif()
	if(CCT_TARGET_PLATFORM STREQUAL "linux")
		set(valid ON)
	endif()
	if(valid)
		set(BUILD_SHARED_LIBS OFF)
		set(GLFW_BUILD_EXAMPLES OFF)
		set(GLFW_BUILD_TESTS OFF)
		set(GLFW_BUILD_DOCS OFF)
		set(GLFW_INSTALL OFF)

		add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/glfw-3.3.9" "glfw")
		add_library(x_glfw INTERFACE)
		target_link_libraries(x_glfw INTERFACE glfw)
		target_compile_definitions(x_glfw INTERFACE X_GLFW=1)
	else()
		add_library(x_glfw INTERFACE)
	endif()
endfunction()

__self_inc()
`;

export async function source(outRoot:string):Promise<Lib> {
	const cache = await download('3.3.9');
	await compress(cache, P.resolve(outRoot, 'glfw'));
	writeTextFile(P.resolve(outRoot, 'glfw', 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'glfw',
		version:'3.3.9',
		root:P.resolve(outRoot, 'glfw', 'glfw-3.3.9')
	};
}