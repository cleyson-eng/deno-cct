#original: https://github.com/sergiud/bzip2
#removed shared, executable, install and test

# Copyright (c) 2018 Sergiu Deitsch
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTMETISLAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

cmake_minimum_required (VERSION 3.1)
project (bzip2 C)

set (MAJOR_VERSION 1)
set (MINOR_VERSION 0)
set (VERSION_PATCH 6)
set (VERSION 1.0.6)

add_library (libz2
  blocksort.c
  bzlib.c
  bzlib.h
  bzlib_private.h
  compress.c
  crctable.c
  decompress.c
  huffman.c
  randtable.c
)

target_include_directories(libz2 PUBLIC ${CMAKE_CURRENT_LIST_DIR})
add_library (BZip2::BZip2 ALIAS libz2)

set_target_properties (libz2 PROPERTIES EXPORT_NAME BZip2::BZip2)
set_target_properties (libz2 PROPERTIES OUTPUT_NAME bz2)
set_target_properties (libz2 PROPERTIES PUBLIC_HEADER bzlib.h)
set_target_properties (libz2 PROPERTIES SOVERSION ${VERSION})
set_target_properties (libz2 PROPERTIES VERSION ${MAJOR_VERSION})