import { download, unzip, vulkanNames, VKNames } from "./download.ts";
import { path as P } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";
import { Inject } from "../utils.ts";
import { KVFile } from "../../util/kvfile.ts";


const inctxt = `
function(__self_inc)
	
	#unsuported platforms: web || uwp
	if(EMSCRIPTEN OR CMAKE_SYSTEM_NAME STREQUAL "WindowsStore")
		add_library(x_vulkan INTERFACE)
	else()
		if(APPLE)
			set(vkinc "\${CMAKE_CURRENT_LIST_DIR}/molten/MoltenVK/include")
		else()
			set(vkinc "\${CMAKE_CURRENT_LIST_DIR}/vulkan/include")
		endif()

		add_library(x_vulkan STATIC "\${CMAKE_CURRENT_LIST_DIR}/volk/volk.c")
		target_include_directories(x_vulkan PUBLIC "\${CMAKE_CURRENT_LIST_DIR}/volk" \${vkinc})
		target_compile_definitions(x_vulkan INTERFACE X_VULKAN=1)
		
		if(WIN32)
			target_compile_definitions(x_vulkan PUBLIC VK_USE_PLATFORM_WIN32_KHR=1)
		else()
			target_link_libraries(x_vulkan INTERFACE dl)
		endif()
	endif()
endfunction()

__self_inc()
`;

export async function source(outRoot:string):Promise<Lib> {
	const n = vulkanNames.get("1.3.268") as VKNames;

	await download(n);
	await unzip(n, outRoot)

	writeTextFile(P.resolve(outRoot, 'vulkan', 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'vulkan',
		version:'1.3.268',
		root:''
	};
}