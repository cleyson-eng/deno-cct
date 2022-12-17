export function exit (code?:number) {
	dispatchEvent(new Event("unload"));
	Deno.exit(code);
}
export function exitError (x:string) {
	dispatchEvent(new Event("unload"));
	console.log(`%c`+x, 'color:black; background-color:red;');
	console.trace();
	throw "";
}