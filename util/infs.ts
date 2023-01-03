import { root, Scope } from '../data.ts';
import { path as P } from '../deps.ts';
import { Downloader } from '../util/download.ts';
import * as afs from '../util/agnosticFS.ts';

//path = new URL('./'+relativePath.replaceAll('\\','/'), import.meta.url);
export async function grantFile(originPath:URL, globalCache:string):Promise<string> {
	if (originPath.protocol == "file:")
		return P.fromFileUrl(originPath).replace(/^[\\\/]([A-Z]:[\\\/])/g, (_,b)=>b);
	const cacheFull = root(Scope.GLOBAL, globalCache);
	if (afs.exists(cacheFull, {mustbeFile:true}))
		return cacheFull;
	const d = new Downloader();
	await d.wait({
		thrownOnReturnFail:true
	}, d.download(originPath.href, cacheFull));
	return cacheFull;
}

//path = new URL('./'+relativePath.replaceAll('\\','/'), import.meta.url);
export async function grantFileTree(originRoot:URL, files:string[], globalCacheRoot:string):Promise<string> {
	if (originRoot.protocol == "file:")
		return P.fromFileUrl(originRoot).replace(/^[\\\/]([A-Z]:[\\\/])/g, (_,b)=>b);
	const cacheFull = root(Scope.GLOBAL, globalCacheRoot);
	if (afs.exists(globalCacheRoot, {mustbeFolder:true}))
		return cacheFull;
	const d = new Downloader();
	await d.wait({
		thrownOnReturnFail:true
	}, ...files.map((x)=>d.download((new URL(x.replaceAll('\\','/'), originRoot)).href, P.resolve(cacheFull, x))));
	
	return cacheFull;
}