import { root, Scope } from '../data.ts';
import { path as P } from '../deps.ts';
import { Downloader } from '../util/download.ts';
import * as afs from '../util/agnosticFS.ts';

export async function grantResource(p:string):Promise<string> {
	const au = new URL('./'+p.replaceAll('\\','/'), import.meta.url);
	if (au.protocol == "file:")
		return P.fromFileUrl(au).replace(/^[\\\/]([A-Z]:[\\\/])/g, (_,b)=>b);
	const r = root(Scope.GLOBAL, 'cct-resource', p);
	if (afs.exists(r, {mustbeFile:true}))
		return r;
	const d = new Downloader();
	await d.wait({
		thrownOnReturnFail:true
	}, d.download(au.href, r));
	return r;
}