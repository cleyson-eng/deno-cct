import { download, unzip, vulkanNames, VKNames } from "./download.ts";
import { path as P } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";
import { Inject } from "../utils.ts";
import { KVFile } from "../../util/kvfile.ts";
import { exec } from "../../util/exec.ts";
import * as AFS from "../../util/agnosticFS.ts";
import { moltenVk } from "./moltenvk.ts";
import * as Cache from '../../util/cache.ts';


const inctxt = `
if(CCT_TARGET_PLATFORM STREQUAL "darwin")
	set(MOLTENVK_DYN "\${CMAKE_CURRENT_LIST_DIR}/molten/macOS/libMoltenVK.dylib")
elseif(CCT_TARGET_PLATFORM STREQUAL "ios")
	set(MOLTENVK_DYN "\${CMAKE_CURRENT_LIST_DIR}/molten/IOS/libMoltenVK.dylib")
elseif(CCT_TARGET_PLATFORM STREQUAL "ios_emu")
	set(MOLTENVK_DYN "\${CMAKE_CURRENT_LIST_DIR}/molten/IOS-simulator/libMoltenVK.dylib")
endif()
			
function(__self_inc)
	
	#unsuported platforms: web || uwp
	if(EMSCRIPTEN OR CMAKE_SYSTEM_NAME STREQUAL "WindowsStore")
		add_library(x_vulkan INTERFACE)
	else()
		set(vkinc "\${CMAKE_CURRENT_LIST_DIR}/vulkan/include")

		add_library(x_vulkan STATIC EXCLUDE_FROM_ALL "\${CMAKE_CURRENT_LIST_DIR}/volk/volk.c")
		target_include_directories(x_vulkan PUBLIC "\${CMAKE_CURRENT_LIST_DIR}/volk" \${vkinc})
		target_compile_definitions(x_vulkan INTERFACE X_VULKAN=1)
		
		if(WIN32)
			target_compile_definitions(x_vulkan PUBLIC VK_USE_PLATFORM_WIN32_KHR=1)
		else()
			target_link_libraries(x_vulkan INTERFACE dl)
			if(CCT_TARGET_PLATFORM STREQUAL "darwin")
				target_compile_definitions(x_vulkan PUBLIC VK_USE_PLATFORM_MACOS_MVK=1)
			elseif(CCT_TARGET_PLATFORM STREQUAL "ios" OR CCT_TARGET_PLATFORM STREQUAL "ios_emu")
				target_compile_definitions(x_vulkan PUBLIC VK_USE_PLATFORM_IOS_MVK=1)
			elseif(CCT_TARGET_PLATFORM STREQUAL "android")
				target_compile_definitions(x_vulkan PUBLIC VK_USE_PLATFORM_ANDROID_KHR=1)
			elseif(CCT_TARGET_PLATFORM STREQUAL "linux")
				if(GLFW_USE_WAYLAND)
					target_compile_definitions(x_vulkan PUBLIC VK_USE_PLATFORM_WAYLAND_KHR=1)
				else()
					target_compile_definitions(x_vulkan PUBLIC VK_USE_PLATFORM_XCB_KHR=1)
				endif()
			endif()
		endif()
	endif()
endfunction()

__self_inc()
`;

export async function source(outRoot:string):Promise<Lib> {
	const n = vulkanNames.get("1.3.268") as VKNames;

	await download(n);
	await unzip(n, outRoot)

	await moltenVk(Cache.cache("molten-vk-bin"), P.resolve(outRoot, 'vulkan', 'molten'));

	writeTextFile(P.resolve(outRoot, 'vulkan', 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'vulkan',
		version:'1.3.268',
		root:''
	};
}