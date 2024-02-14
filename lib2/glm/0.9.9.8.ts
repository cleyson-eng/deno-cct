import { download } from "./download.ts";
import { compress } from '../../util/exec.ts';
import { path as P } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";

const inctxt = `
function(__self_inc)
	option(BUILD_STATIC_LIBS "" ON)
	option(BUILD_DYNAMIC_LIBS "" OFF)
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/glm-0.9.9.8" "glm" EXCLUDE_FROM_ALL)
	add_library(x_glm INTERFACE EXCLUDE_FROM_ALL)
	target_link_libraries(x_glm INTERFACE glm_static)
endfunction()

__self_inc()
`;

export async function source(outRoot:string):Promise<Lib> {
	const cache = await download('0.9.9.8');
	await compress(cache, P.resolve(outRoot, 'glm'));
	writeTextFile(P.resolve(outRoot, 'glm', 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'glm',
		version:'0.9.9.8',
		root:P.resolve(outRoot, 'glm', 'glm-0.9.9.8')
	};
}