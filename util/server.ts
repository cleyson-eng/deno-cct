import { Application,Router } from "https://deno.land/x/oak@v12.5.0/mod.ts";
import { grantResource, SERVER_CERT, SERVER_KEY } from "../rsc/mod.ts";
import { path as P } from "../deps.ts";
import * as AFS from "./agnosticFS.ts";

export function serverApp(root:string):Deno.ServeHandler {
	root = P.resolve(Deno.cwd(), root);
	const app = new Application();
	const router = new Router();
	router.get("/wss", (ctx) => {
		if (!ctx.isUpgradable) {
			ctx.throw(501);
		}
		const ws = ctx.upgrade();
		ws.onmessage = (m)=>{
			console.log(m.data);
			ws.send("ok");
		};
	});
	app.use(router.routes());
	app.use(router.allowedMethods());
	//files
	app.use(async (context, _next) => {
		context.response.headers.set("Cross-Origin-Opener-Policy","same-origin")
		context.response.headers.set("Cross-Origin-Embedder-Policy","require-corp")
		try {
			await context.send({
				root,
				index: "index.html",
			});
			return;
		// deno-lint-ignore no-empty
		} catch {}
		let ref = context.request.url.pathname;
		if (ref.startsWith("/"))
			ref = "."+ref;
		ref = P.resolve(root, ref);
		if (AFS.exists(ref)) {
			context.response.body = `<a href="..">..</a><br>` +
				Array.from(AFS.readDir(ref)).map((x)=>{
					return `<a href="./${x.name}">${x.name}</a>(${x.isDirectory?"folder":"file"})`;
				}).join('<br>');
			context.response.headers.set("Content-Type", "text/html")
		} else {
			context.response.body = 'not found';
		}
		//await next();
	});

	return (async (request: Request): Promise<Response> => {
		return (await app.handle(request)) || new Response("404", { status: 404 });
	}) as Deno.ServeHandler;
}
export function server(port:number, app:Deno.ServeHandler) {
	console.log(`HTTP server running. Access it at: http://localhost:${port}/`);
	Deno.serve({ port }, app);
}
export async function serverTLS(port:number, app:Deno.ServeHandler) {
	console.log(`HTTPS server running. Access it at: https://localhost:${port}/`);
	Deno.serve({ port,
		cert: Deno.readTextFileSync(await grantResource(SERVER_CERT)),
		key: Deno.readTextFileSync(await grantResource(SERVER_KEY))
	}, app);
}