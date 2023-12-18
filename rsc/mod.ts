import { path } from "../deps.ts";
import { cache } from '../util/cache.ts';
import { grantFiles } from "../util/infs.ts";

export const IOS_TC = 'mac/ios.toolchain.cmake';

export function grantResources(...files:string[]):Promise<string> {
	return grantFiles(new URL('./', import.meta.url), files, cache('rsc'));
}
export async function grantResource(file:string):Promise<string> {
	return path.resolve(await grantResources(file), file);
}