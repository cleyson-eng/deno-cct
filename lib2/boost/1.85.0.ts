import { path as P } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Platform, hostPA } from "../../util/target.ts";
import { Lib } from "../_library.ts";
export { Platform };

const inctxt = `
function(__self_inc)
	if(CMAKE_HOST_SYSTEM_NAME STREQUAL "Windows")
		add_subdirectory("<BOOST_DIR_WIN>" "boost" EXCLUDE_FROM_ALL)
	elseif(CMAKE_HOST_SYSTEM_NAME STREQUAL "Darwin")
		add_subdirectory("<BOOST_DIR_MAC>" "boost" EXCLUDE_FROM_ALL)
	else()
		add_subdirectory("<BOOST_DIR>" "boost" EXCLUDE_FROM_ALL)
	endif()
endfunction()

__self_inc()
`;
//paleative...
export async function source(outRoot:string, roots:Map<Platform, string>):Promise<Lib> {
	const croot_win = roots.get(Platform.WINDOWS) || '',
		croot_mac = roots.get(Platform.MACOS) || '',
		croot_lnx = roots.get(Platform.LINUX) || '';

	writeTextFile(P.resolve(outRoot, 'boost', 'inc.cmake'),
		inctxt.replace('<BOOST_DIR_WIN>',croot_win.replaceAll('\\','\\\\'))
			.replace('<BOOST_DIR_MAC>',croot_mac)
			.replace('<BOOST_DIR>', croot_lnx)
		,{ ifdiff:true,mkdir:true });

	return {
		name:'boost',
		version:'1.85.0',
		root:''
	};
}