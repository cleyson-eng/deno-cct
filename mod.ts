export { path } from './deps.ts';
export { Arch, Platform, type PA, BuildType, postfixFromBuildType, hostPA } from './util/target.ts';
export * from './util/exit.ts';
export * as AFS from './util/agnosticFS.ts';
export * as download from './util/download.ts';
export * from './util/exec.ts';
export * from './util/infs.ts';
export * from './util/cache.ts';
export * from './compile/mod.ts';

//legacy
export * from './libs/LibraryMeta.ts';
export * from './libs/data.ts';