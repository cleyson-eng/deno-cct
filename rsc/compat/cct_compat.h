#pragma once
/*usage:
 define a <function> as MLIB_{X_SHARED?1:0}{X_BUILD?1:0}
exemple: "XTZLib shared library"
 def XTZLib_func as MLIB_11 to build source (private defs) and
 def XTZLib_func as MLIB_10 for includers (interface defs)
*/

#if defined(DOXYGEN)
#	define FORCE_INLINE
#	define MLIB_01
#	define MLIB_00
#	define MLIB_11
#	define MLIB_10
#elif defined(_WIN32)
#	define FORCE_INLINE __forceinline
#	define MLIB_01
#	define MLIB_00
#	define MLIB_11 __declspec(dllexport)
#	define MLIB_10 __declspec(dllimport)
#else
#	define FORCE_INLINE __attribute__((always_inline))
#	define MLIB_01
#	define MLIB_00
#	define MLIB_11  __attribute__((visibility("default")))
#	define MLIB_10
#endif