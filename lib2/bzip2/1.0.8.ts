import { download } from "./download.ts";
import { compress } from '../../util/exec.ts';
import { path as P } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";
import { grantResource } from "../../rsc/mod.ts";
import { copy } from '../../util/agnosticFS.ts';

const inctxt = `
function(__self_inc)
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/bzip2-1.0.8" "bzip2" EXCLUDE_FROM_ALL)
	
	add_library(x_bzip2 INTERFACE EXCLUDE_FROM_ALL)
	target_link_libraries(x_bzip2 INTERFACE libz2)
	
	#FINDABLE by freetype
	set(BZIP2_FOUND ON PARENT_SCOPE)
	set(BZIP2_LIBRARIES x_bzip2 PARENT_SCOPE)
endfunction()

__self_inc()
`;

export async function source(outRoot:string):Promise<Lib> {
	const cache = await download('1.0.8');
	const cmakeRoot = P.resolve(outRoot, 'bzip2', 'bzip2-1.0.8');

	await compress(cache, P.resolve(outRoot, 'bzip2'));

	copy(
		await grantResource('lib2/bzip2/CMakeLists.txt'),
		P.resolve(outRoot, 'bzip2', 'bzip2-1.0.8', 'CMakeLists.txt')
	);

	writeTextFile(P.resolve(outRoot, 'bzip2', 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'bzip2',
		version:'1.0.8',
		root:cmakeRoot
	};
}