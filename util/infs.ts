import { path as P } from '../deps.ts';
import { Downloader } from '../util/download.ts';
import * as afs from '../util/agnosticFS.ts';

//path = new URL('./'+relativePath.replaceAll('\\','/'), import.meta.url);
export async function grantFile(originPath:URL, localcache:string):Promise<string> {
	if (originPath.protocol == "file:")
		return afs.fixedPathFromURL(originPath);
	if (afs.exists(localcache, {mustbeFile:true}))
		return localcache;
	const d = new Downloader();
	await d.wait({
		thrownOnReturnFail:true
	}, d.download(originPath.href, localcache));
	return localcache;
}

//path = new URL('./'+relativePath.replaceAll('\\','/'), import.meta.url);
export async function grantFiles(originRoot:URL, files:string[], localcacheRoot:string):Promise<string> {
	if (originRoot.protocol == "file:")
		return afs.fixedPathFromURL(originRoot);
	const d = new Downloader();

	const downloadInstances =
		files
		.filter((x)=>afs.exists(P.resolve(localcacheRoot, x), {mustbeFile:true}))
		.map((x)=>
			d.download(
				(new URL(x.replaceAll('\\','/'), originRoot)).href,
				P.resolve(localcacheRoot, x)
			)
		);
	
	if (downloadInstances.length > 0)
		await d.wait({
			thrownOnReturnFail:true
		}, ...downloadInstances);
	
	return localcacheRoot;
}