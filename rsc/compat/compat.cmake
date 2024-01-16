if (NOT FILE_cmake_basic_compat)
set(FILE_cmake_basic_compat ON)

#basic headache avoid
if(NOT CMAKE_CXX_STANDARD OR CMAKE_CXX_STANDARD LESS 17)
	set(CMAKE_CXX_STANDARD 17)
endif()
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

#basic platform identify
if(NOT CCT_TARGET_ARCH OR NOT CCT_TARGET_PLATFORM)
	set(CCT_TARGET_ARCH "x64")
	set(CCT_TARGET_PLATFORM "linux")
	if (ANDROID_ABI)
		set(CCT_TARGET_PLATFORM "android")
		if ("${ANDROID_ABI}" STREQUAL "armeabi-v7a")
			set(CCT_TARGET_ARCH "arm")
		elseif ("${ANDROID_ABI}" STREQUAL "arm64-v8a")
			set(CCT_TARGET_ARCH "arm64")
		elseif ("${ANDROID_ABI}" STREQUAL "x86")
			set(CCT_TARGET_ARCH "x32")
		endif ()
	elseif (EMSCRIPTEN)
		set(CCT_TARGET_PLATFORM "web")
		set(CCT_TARGET_ARCH "generic")
	elseif ("${CMAKE_SYSTEM_NAME}" STREQUAL "WindowsStore")
		set(CCT_TARGET_PLATFORM "uwp")
	elseif (WIN32)
		set(CCT_TARGET_PLATFORM "win32")
	elseif (APPLE)
		if("${SDK_NAME}" STREQUAL "macosx")
			set(CCT_TARGET_PLATFORM "darwin")
		else()
			set(CCT_TARGET_PLATFORM "ios")
		endif()
	endif ()
	set(CCT_TARGET "${CCT_TARGET_PLATFORM}-${CCT_TARGET_ARCH}")
endif()

#<fixes> amd optmizations
#make NDK generate a error on no-void functions without return (the default behavior in all another compilers)
if (ANDROID_ABI)
	set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Werror=return-type")
endif()

#remove unused code on release
if (NOT CMAKE_BUILD_TYPE EQUAL "Debug")
	if (CCT_TARGET_PLATFORM STREQUAL "win32" OR CCT_TARGET_PLATFORM STREQUAL "uwp")
		add_compile_options("/Gy" "/GF")
		add_link_options("/OPT:REF,ICF")
	else()
		add_compile_options(-fdata-sections -ffunction-sections)
		if(NOT EMSCRIPTEN)
			add_compile_options(-Wl,--gc-sections)
		endif()
	endif ()
endif()

#(web) enable threads
if (CCT_TARGET_PLATFORM STREQUAL "web")
	SET(CMAKE_CXX_FLAGS  "${CMAKE_CXX_FLAGS} -pthread -s USE_PTHREADS")
	SET(CMAKE_EXE_LINKER_FLAGS  "${CMAKE_EXE_LINKER_FLAGS} -pthread -s USE_PTHREADS")
endif()
#</fixes>

#<help functions> use it!
# applyfix(targetname:Project)
#  keep same behaver over platforms: hide not exported functions, apply webapp flags too, and add basic libraries as need.
# webapp_addfuncs(targetname:Project funcs:string[])
#  expose c functions to js side.
macro (applyfix targetname)
	get_target_property(target_type ${targetname} TYPE)
	if (target_type STREQUAL "EXECUTABLE")
		_fix_program(${targetname})
	else ()
		if (target_type STREQUAL "SHARED_LIBRARY")
			_fix_library(${targetname} ON)
		else ()
			_fix_library(${targetname} OFF)
		endif()
	endif()
	_fix_any(${targetname})
endmacro()
macro (webapp_addfuncs targetname funcs)
	if (EMSDK_EXPORTFUNCS__${targetname})
		set(EMSDK_EXPORTFUNCS__${targetname} ${EMSDK_EXPORTFUNCS__${targetname}} ${${funcs}})
	else()
		set(EMSDK_EXPORTFUNCS__${targetname} ${${funcs}})
	endif()
endmacro()
#</help functions>

#<internal methods>
macro (_fix_library targetname isshared)
	#fix visibility
	if (CCT_TARGET_PLATFORM STREQUAL "win32" OR CCT_TARGET_PLATFORM STREQUAL "uwp")
	else ()
		if (${isshared})
			#set not export funcion as default on shared library
			set_target_properties(${targetname} PROPERTIES CXX_VISIBILITY_PRESET hidden)
		endif ()
	endif ()
endmacro ()
macro (_fix_any targetname)
	if (ANDROID_ABI)
		target_link_libraries(${targetname} PUBLIC log android)
	endif()
	if (UNIX OR ANDROID_ABI)
		target_link_libraries(${targetname} PUBLIC m)
	endif()
	if (CCT_TARGET_PLATFORM STREQUAL "uwp")
		#fix any UWP project
		set_target_properties(${targetname} PROPERTIES
			LINK_FLAGS /SUBSYSTEM:WINDOWS
			VS_WINRT_COMPONENT TRUE
		)
	endif()
endmacro()
macro (_fix_program targetname)
	#change suffix to be embeded in android apk...
	if (ANDROID_ABI)
		set_target_properties(${targetname} PROPERTIES SUFFIX ".so")
	elseif (CCT_TARGET_PLATFORM STREQUAL "web")
		_webapp_get_all_funcs(_temp ${targetname})
		list(REMOVE_DUPLICATES _temp)
		string(REGEX REPLACE "([^\\]|^);" "\\1," EMSDK_EXPORTFUNCS "${_temp}")
		target_link_options(${targetname}
			PUBLIC "-sASYNCIFY"
			PUBLIC "-sDISABLE_DEPRECATED_FIND_EVENT_TARGET_BEHAVIOR=1"
			PUBLIC "SHELL:-sEXPORTED_FUNCTIONS=[${EMSDK_EXPORTFUNCS}]"
			PUBLIC "-sEXPORTED_RUNTIME_METHODS=[\"cwrap\",\"intArrayFromString\",\"ALLOC_NORMAL\",\"allocate\",\"UTF8ToString\",\"stringToUTF8\",\"lengthBytesUTF8\",\"stringToNewUTF8\"]"
			#PUBLIC "-sFULL_ES2=1"
			#PUBLIC "-sMAX_WEBGL_VERSION=2"
			PUBLIC "-sINITIAL_MEMORY=16MB"
			PUBLIC "-sTOTAL_STACK=16KB"
			PUBLIC "-sINITIAL_MEMORY=128KB"
			PUBLIC "-sALLOW_MEMORY_GROWTH=1"
			PUBLIC "-sMALLOC=emmalloc"
		)
		get_target_property(targetname_sufix ${targetname} SUFFIX)
		if(NOT targetname_sufix STREQUAL ".html")
			target_link_options(${targetname}
				PUBLIC "-sMODULARIZE=1"
				PUBLIC "-sEXPORT_NAME=${targetname}Module"
			)
		endif()
	endif()
endmacro ()
macro (_webapp_get_all_funcs output targetname)
	if (${EMSDK_EXPORTFUNCS__${targetname}})
		set(_temp ${EMSDK_EXPORTFUNCS__${targetname}} "_main")
	else()
		set(_temp "_main")
	endif()
	get_target_property(_templibs ${targetname} LINK_LIBRARIES)
	foreach(_templibs_item IN ITEMS ${_templibs})
		set(_temp ${_temp} ${EMSDK_EXPORTFUNCS__${_templibs_item}})
	endforeach()
endmacro()
#</internal methods>

endif()