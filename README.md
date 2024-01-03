# (for deno) CrossCompile Tools
struct, From most independent to most dependent:

## low level:
 - util: utilities for files, downloads, life cycle (exit), cmake fixers, and execution (command line "delivery")...
 - rsc: files needed in file system (offline) by the project (as a deno project can run from online scripts).
 - compile: platform independent cmake infrastructure.

## high level:
 - libs (legacy): old version of library "automated import", focused in sharing files for all projects and share just compiled versions.
 - libs2: current, now focused only in prepare the source code to be used by cmake, better portability for IDEs...

### to implement
Libs2 put compiled data + includes or source, plus cmake interfaces as possible, samples:

| | script | ![Windows](./md/win.png) | ![Linux](./md/lnx.png) | ![MacOS](./md/mac.png) | ![Android](./md/and.png) | ![IOS](./md/ios.png) | ![WEB](./md/asm.png) | ![UWP/XBOX](./md/xbx.png) | obs. |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Basic** | -- | -- | -- | -- | -- | -- | -- | -- | |
| glm       | source | ✅ | | ✅ | | ✅ | ✅ | ✅ | |
| zlib      | source | ✅ | | ✅ | | ✅ | ✅ | ✅ | |
| brotli    | source | ✅ | | ✅ | | ✅ | ✅ | ✅ | |
| libreSSL  | source | ✅ | | ✅ | | ✅ | ✅ | ✅ | |
| **graphic** | -- | -- | -- | -- | -- | -- | -- | -- | |
| vulkan    | hybrid | ✅ | | | | | ☢ | ☢ | |
| glfw      | source | ✅ | | | ☢ | ☢ | ☢ | ☢ | |
| webgpu    | source | ☢ | ☢ | ☢ | ☢ | ☢ | ✅ | ☢ | |

to be implemented:
 opus, flac, aom, libavif, giflib, libjpeg-turbo, libpng