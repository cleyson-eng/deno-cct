import * as Cache from '../util/cache.ts';
import { Downloader } from '../util/download.ts';
import * as AFS from '../util/agnosticFS.ts';

export async function downloadLink(kvname:string, cacheFile:string, link:string):Promise<string> {
	cacheFile = Cache.cache(cacheFile);
	const kv = Cache.kvf;
	if (kv.get(kvname) == null) {
		if (AFS.exists(cacheFile))
			await Deno.remove(cacheFile, {recursive:true});
		if (link.endsWith(".git"))
			Deno.mkdirSync(cacheFile);
		const dm = new Downloader();
		await dm.wait({
			thrownOnReturnFail:true,
			logList:true,
			logProgress:true,
		}, dm.download(link, cacheFile, kvname))

		kv.set(kvname, "OK");
	}
	return cacheFile;
}