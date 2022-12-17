import { compress as C } from '../deps.ts';
import { exitError } from './exit.ts';

export function splitCommand(command: string): string[] {
	const myRegexp = /[^\s"]+|"([^"]*)"/gi;
	const splits:string[] = [];
	
	let match:RegExpExecArray|null;
	do {
		//Each call to exec returns the next regex match as an array
		match = myRegexp.exec(command);
		if (match != null) {
			//Index 1 in the array is the captured group if it exists
			//Index 0 is the matched text, which we use if no captured group exists
			splits.push(match[1] ? match[1] : match[0]);
		}
	} while (match != null);

	return splits;
}
export async function exec(cwd:string, line:string[]|string, opts?:{hideExecution?:boolean,pipeOutput?:boolean, pipeInput?:boolean, outputEvent?:(txt:string)=>void}):Promise<Deno.ProcessStatus> {
	let status:Deno.ProcessStatus = {
		code:404,
		success:false,
	};
	const cmd = Array.isArray(line)?line:splitCommand(line);
	if (!(opts && opts.hideExecution))
		console.log(`%cRunning: ${cmd.join(' ')}\nAt: ${cwd}`, 'background-color:white;color:black;');
	try {
		const p = Deno.run({
			cwd,
			cmd
		});
		if (opts) {
			if (opts.pipeOutput)
				p.stdout?.readable.pipeTo(Deno.stdout.writable);
			if (opts.pipeInput && p.stdin)
				Deno.stdin.readable.pipeTo(p.stdin.writable);
			if (opts.outputEvent) {
				/*p.stdout?.readable.pipeTo(new WritableStream({
					write(chunk) {
						return new Promise((resolve, reject) => {
							const buffer = new ArrayBuffer(1);
							const view = new Uint8Array(buffer);
							const decoded = decoder.decode(view, { stream: true });
							resolve();
						});
					},
					close() {
					},
					abort(err) {
					}
				}))*/
			}
		}

		status = await p.status();

		p.stdout?.close();
		p.stdin?.close();
		p.close();
		// deno-lint-ignore no-empty
	} catch(_){}
	if (!(opts && opts.hideExecution))
		console.log('%cEnded with code: '+status.code, `color: black;background-color: ${status.success?'green':'red'};`);
	return status;
}
export async function execTest(x:string) {
	return (await exec('.', [x,'--version'])).success
}

const cmap = [
    {s:['.tgz','.tar.gz','tar.gzip'], c:C.tgz.compress, u:C.tgz.uncompress},
];
export function isCompressFormat(x:string) {
	return cmap.find((y)=>y.s.find((z)=>x.endsWith(z)) != undefined) != undefined;
}
export async function compress(src:string, dst:string) {
    let method = cmap.find((x)=>x.s.find((x)=>src.endsWith(x))!==undefined);
    if (method)
        return await method.u(src, dst);
    method = cmap.find((x)=>x.s.find((x)=>dst.endsWith(x))!==undefined);
    if (method)
        return await method.c(src, dst);
    exitError(`No extension to evalute compression method ${src}`);
}