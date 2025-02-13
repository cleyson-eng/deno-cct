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
import { fix as shared_fix} from './shared_fix.ts';


const inctxt = `
if(CCT_TARGET_PLATFORM STREQUAL "darwin")
	set(MOLTENVK_DYN "\${CMAKE_CURRENT_LIST_DIR}/molten/macOS/libMoltenVK.dylib")
elseif(CCT_TARGET_PLATFORM STREQUAL "ios")
	set(MOLTENVK_DYN "\${CMAKE_CURRENT_LIST_DIR}/molten/IOS/libMoltenVK.dylib")
elseif(CCT_TARGET_PLATFORM STREQUAL "ios_emu")
	set(MOLTENVK_DYN "\${CMAKE_CURRENT_LIST_DIR}/molten/IOS-simulator/libMoltenVK.dylib")
endif()
			
function(__self_inc)
	#set LIB_VOLK make the library merged
	if (NOT LIB_VOLK)
		set(LIB_VOLK x_vulkan)
	endif()
	option(LIB_VOLK_SHARED "make volk as shared library" OFF)
	
	#unsuported platforms: web || uwp
	if(EMSCRIPTEN OR CMAKE_SYSTEM_NAME STREQUAL "WindowsStore")
		if (NOT TARGET \${LIB_VOLK})
			add_library(\${LIB_VOLK} INTERFACE)
		endif()
	else()
		set(vkinc "\${CMAKE_CURRENT_LIST_DIR}/vulkan/include")
		set(volksrc "\${CMAKE_CURRENT_LIST_DIR}/volk/volk.c")

		if (NOT TARGET \${LIB_VOLK})
			if (LIB_VOLK_SHARED)
				add_library(\${LIB_VOLK} SHARED EXCLUDE_FROM_ALL \${volksrc})
			else()
				add_library(\${LIB_VOLK} STATIC EXCLUDE_FROM_ALL \${volksrc})
			endif()
		else()
			target_sources(\${LIB_VOLK} PRIVATE \${volksrc})
		endif()
		target_include_directories(\${LIB_VOLK} PUBLIC "\${CMAKE_CURRENT_LIST_DIR}/volk" \${vkinc})
		target_compile_definitions(\${LIB_VOLK} INTERFACE X_VULKAN=1)
		get_target_property(target_type \${LIB_VOLK} TYPE)
		if (target_type STREQUAL "SHARED_LIBRARY")
			if(WIN32)
				target_compile_definitions(\${LIB_VOLK} INTERFACE VOLK_EXPORT=VOLK_WIN_IN)
				target_compile_definitions(\${LIB_VOLK} PRIVATE VOLK_EXPORT=VOLK_WIN_EX)
			else()
				target_compile_definitions(\${LIB_VOLK} INTERFACE VOLK_EXPORT=extern)
				target_compile_definitions(\${LIB_VOLK} PRIVATE VOLK_EXPORT=VOLK_UNI_EX)
			endif()
		else()
			target_compile_definitions(\${LIB_VOLK} PUBLIC VOLK_EXPORT=extern)
		endif()
		
		if(WIN32)
			target_compile_definitions(\${LIB_VOLK} PUBLIC VK_USE_PLATFORM_WIN32_KHR=1)
		else()
			target_link_libraries(\${LIB_VOLK} INTERFACE dl)
			if(CCT_TARGET_PLATFORM STREQUAL "darwin")
				target_compile_definitions(\${LIB_VOLK} PUBLIC VK_USE_PLATFORM_MACOS_MVK=1)
			elseif(CCT_TARGET_PLATFORM STREQUAL "ios" OR CCT_TARGET_PLATFORM STREQUAL "ios_emu")
				target_compile_definitions(\${LIB_VOLK} PUBLIC VK_USE_PLATFORM_IOS_MVK=1)
			elseif(CCT_TARGET_PLATFORM STREQUAL "android")
				target_compile_definitions(\${LIB_VOLK} PUBLIC VK_USE_PLATFORM_ANDROID_KHR=1)
			elseif(CCT_TARGET_PLATFORM STREQUAL "linux")
				if(GLFW_USE_WAYLAND)
					target_compile_definitions(\${LIB_VOLK} PUBLIC VK_USE_PLATFORM_WAYLAND_KHR=1)
				else()
					target_compile_definitions(\${LIB_VOLK} PUBLIC VK_USE_PLATFORM_XCB_KHR=1)
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
	shared_fix(P.resolve(outRoot, 'vulkan', 'volk', 'volk.h'));

	return {
		name:'vulkan',
		version:'1.3.268',
		root:''
	};
}