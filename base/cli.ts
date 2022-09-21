import { readLines } from "https://deno.land/std@0.154.0/io/buffer.ts";
import { awaitAN } from "./utils.ts";
import { exit } from "./exit.ts";
import { resolve } from "https://deno.land/std@0.154.0/path/mod.ts";

export enum Action {
	LEFT,RIGHT,ENTER,DOWN,UP
}
const maxWChar = 60;
const maxHChar = 10;
const actionMap = [
	{s:119, a:Action.UP},
	{s:115, a:Action.DOWN},
	{s:97, a:Action.LEFT},
	{s:100, a:Action.RIGHT},
	{s:[32,13], a:Action.ENTER},
];
function alignCenter(x:string):string {
	let c = (maxWChar-x.length)/2;
	let k = '';
	while (c-- > 0) k += ' ';
	return k + x;
}

export interface ElementState {
	enabled?:boolean
	value?:string
}
export class Element {
	enabled=true;
	render(_selected:boolean){}
	async action(_a:Action){}
	saveState():ElementState {return {}}
	loadState(_:ElementState) {}
}
export class Label extends Element {
	title:string;
	destac:boolean;
	constructor(t:string, d?:boolean) {
		super();
		this.enabled = false;
		this.title = t;
		this.destac = d?true:false;
	}
	render(_:boolean) {
		console.log("%c%s", `color:${this.destac?"#FFF8DC":"#AAAAAA"};`, this.destac?alignCenter(this.title):this.title);
	}
}
export class Button extends Element {
	title:string;
	event:()=>(Promise<void>|void);
	constructor(t:string, e?:()=>(Promise<void>|void)) {
		super();
		this.enabled = true;
		this.title = t;
		this.event = e?e:()=>{};
	}
	render(sel:boolean) {
		const color = `color: ${this.enabled?(sel?"#7FFF00":"#006400"):"#696969"};`;
		console.log("%c<[ %s ]>",
			color,
			this.title
		);
	}
	async action(a: Action) {
		if (a == Action.ENTER)
			await awaitAN(this.event());
	}
	saveState():ElementState {
		return {
			enabled:this.enabled,
		};
	}
	loadState(x:ElementState){
		this.enabled = !(x.enabled === false);
	}
}
export class TextBox extends Element {
	title:string;
	value:string;
	eventChange:()=>(Promise<void>|void);
	constructor(t?:string,v?:string,eventChange?:()=>(Promise<void>|void)) {
		super();
		this.enabled = true;
		this.value = v?v:'';
		this.title = t?t:'';
		this.eventChange = eventChange?eventChange:()=>{};
	}
	render(sel:boolean) {
		const maxW = maxWChar - 2;
		const color = `color: ${this.enabled?(sel?"#7FFF00":"#006400"):"#696969"};`;
		let format = '';
		if (this.title.length > 0)
			format += this.title+":";
		format += JSON.stringify(this.value);
		if (format.length > maxW) format = format.substring(0,maxW-6)+"..."+format.substring(format.length-3);
		while (format.length < maxW) format += " ";

		console.log("%c[%s]",
			color,
			format
		);
	}
	async action(a: Action) {
		if (a == Action.ENTER) {
			console.clear();
			console.log(`oldValue: "${this.value}"`);
			console.log('(send "!" to cancel) new value:');
			const nv = (await readLine()) as string;
			if (nv.trim() == "!")
				return;
			this.value = nv;
			await awaitAN(this.eventChange());
		}
	}
	saveState():ElementState {
		return {
			enabled:this.enabled,
			value:this.value
		};
	}
	async loadState(x:ElementState){
		this.enabled = !(x.enabled === false);
		if (x.value)
			this.value = x.value;
		await awaitAN(this.eventChange());
	}
}
export class ComboBox<T> extends Element {
	title:string;
	value:T;
	opts:{v:T,t:string}[];
	eventChange:()=>(Promise<void>|void);
	constructor(t:string, opts:{v:T,t:string}[], v:T,eventChange?:()=>(Promise<void>|void)) {
		super();
		this.enabled = true;
		this.value = v;
		this.title = t;
		this.opts = opts;
		this.eventChange = eventChange?eventChange:()=>{};
	}
	render(sel:boolean) {
		const maxW = maxWChar - 4;

		const color = `color: ${this.enabled?(sel?"#7FFF00":"#006400"):"#696969"};`;
		let format = "";
		if (this.title.length > 0)
			format = this.title+":";
		const olen = this.opts.length;
		let oind = this.opts.findIndex((r)=>r.v==this.value);
		format = `(${format}${JSON.stringify(oind<0?'':this.opts[oind].t)})`;
		oind++;
		if (this.opts.length > 0) {
			while (format.length < maxW) {
				if (oind >= olen) oind = 0;
				format += `,${this.opts[oind].t}`;
				oind++;
			}
		}

		if (format.length > maxW) format = format.substring(0,maxW);
		while (format.length < maxW) format += " ";

		console.log("%c[<%s>]",
			color,
			format
		);
	}
	async action(a: Action) {
		if (a == Action.ENTER) {
			const form_sel = new FormSelect<T>(this.title, this.opts);
			await form_sel.run();
			if (this.value != form_sel.value && form_sel.value) {
				this.value = form_sel.value;
				await awaitAN(this.eventChange());
			}
			return;
		}

		let oind = this.opts.findIndex((r)=>r.v==this.value);
		const oindo = oind;
		if (a == Action.LEFT) {
			oind--;
			if (oind < 0)
				oind = this.opts.length - 1;
		} else if (a == Action.RIGHT) {
			oind++;
			if (oind >= this.opts.length)
				oind = 0;
		}
		if (oind != oindo && this.opts.length > 0) {
			this.value = this.opts[oind].v;
			await awaitAN(this.eventChange());
		}
	}
	saveState():ElementState {
		return {
			enabled:this.enabled,
			value:JSON.stringify(this.value)
		};
	}
	async loadState(x:ElementState){
		this.enabled = !(x.enabled === false);
		if (x.value)
			this.value = JSON.parse(x.value);
		await awaitAN(this.eventChange());
	}
}
export class TogleBox extends Element {
	title:string;
	value:boolean;
	eventChange:()=>(Promise<void>|void);
	constructor(t?:string, v?:boolean, eventChange?:()=>(Promise<void>|void)) {
		super();
		this.enabled = true;
		this.value = v === true;
		this.title = t?t:'';
		this.eventChange = eventChange?eventChange:()=>{};
	}
	render(sel:boolean) {
		const color = `color: ${this.enabled?(sel?"#7FFF00":"#006400"):"#696969"};`;

		console.log("%c%s %c%s",
			color,
			`[${this.value?'X':' '}]`,
			'color: #AAAAAA;',
			this.title
		);
	}
	async action(a: Action) {
		if (a == Action.ENTER) {
			this.value = !this.value;
			await awaitAN(this.eventChange());
		}
	}
	saveState():ElementState {
		return {
			enabled:this.enabled,
			value:this.value?"true":"false"
		};
	}
	async loadState(x:ElementState){
		this.enabled = !(x.enabled === false);
		if (x.value)
			this.value = x.value == "true";
		await awaitAN(this.eventChange());
	}
}
export class Form {
	elements:Element[] = [];
	i = 0;
	constructor(v?:Element[]) {
		if (v)
			this.elements.push(...v);
	}
	private render() {
		if (this.elements.length <= maxHChar) {
			this.elements.forEach((x,ix)=>{
				x.render(ix==this.i);
			});
		} else {
			const pre = maxHChar/2;
			const tshow = maxHChar - 1;
			let init = this.i - (pre);
			if (init < 0) init = 0;
			else if (init + tshow > this.elements.length)
			init = this.elements.length - tshow;
			const end = init + tshow;
			for (let i = init;i < end; i++)
				this.elements[i].render(i==this.i);
			Deno.stdout.write(new TextEncoder().encode(`       ${init} / ${this.elements.length - tshow}`));
		}
	}
	private async action(a:Action) {
		if (a == Action.DOWN) {
			let oi = this.i+1;
			while (true) {
				if (oi >= this.elements.length) oi = 0;
				if (oi == this.i) break;
				if (this.elements[oi].enabled) break;
				oi++;
			} 
			this.i = oi;
		} else if (a == Action.UP) {
			let oi = this.i-1;
			while (true) {
				if (oi < 0) oi = this.elements.length-1;
				if (oi == this.i) break;
				if (this.elements[oi].enabled) break;
				oi--;
			} 
			this.i = oi;
		} else if (this.elements[this.i].enabled) {
			await this.elements[this.i].action(a);
		}
	}
	closeSignal = false;
	async run() {
		if (this.i <= 0 || this.i >= this.elements.length || !this.elements[this.i].enabled)
			this.elements.find((x, xi)=>{
				if (x.enabled) this.i = xi;
				return x.enabled;
			})
		this.closeSignal = false;
		while (!this.closeSignal) {
			console.clear();
			this.render();
			//<get key>
			Deno.setRaw(0,true);
			const ac = await((async ()=>{
				const temp = new Uint8Array(1);
				while (true) {
					await Deno.stdin.read(temp);
					if (temp[0] == 3) {
						Deno.setRaw(0,false);
						exit();
					}
					const res = actionMap.find((x)=>Array.isArray(x.s)?(x.s.find((y)=>y==temp[0])!=null):x.s == temp[0]);
					if (res)
						return res.a;
				}
			})());
			Deno.setRaw(0,false);
			
			//</get key>
			await this.action(ac);
		}
	}
	saveState():ElementState[] {
		return this.elements.map((x)=>x.saveState());
	}
	async loadState(x:ElementState[]){
		for (let i = 0; i < x.length && i < this.elements.length; i++) {
			if (i < this.elements.length)
				await awaitAN(this.elements[i].loadState(x[i]));
		}
	}
}
export class FormSelect<T> extends Form {
	value:T|undefined = undefined; 
	constructor(t:string, opts:{v:T,t:string}[], desc?:string) {
		super();
		this.elements = [new Label(t, true)];
		if (desc)
			this.elements.push(new Label(desc));
		
		if (opts.length > 4) {
			const tb_filter = new TextBox("Search", "", ()=>{
				const lbase = desc?3:2;
				const fopts = (tb_filter.value.length>0)?
					opts.filter((m)=>m.t.indexOf(tb_filter.value)>=0):
					opts;
				this.elements = [
					...this.elements.slice(0, lbase),
					...fopts.map((e)=>
						new Button(e.t, ()=>{ this.value=e.v; this.closeSignal=true; })
					)
				];
			});
			this.elements.push(tb_filter);
		}

		this.elements.push(...opts.map((e)=>
			new Button(e.t, ()=>{ this.value=e.v; this.closeSignal=true; })
		));
	}
}
export async function readLine() {
	for await (const line of readLines(Deno.stdin)) {
		return line;
	}
}
export function progressBarString(text:string, percent:number):string {
	text = alignCenter(text)
	let iprogress = Math.round(maxWChar * percent);
	while (text.length < maxWChar) text += ' ';
	if (iprogress > text.length) iprogress = text.length;

	return "\x1b[42m\x1b[37m"+text.substring(0,iprogress)+'\x1b[100m'+text.substring(iprogress)+'\x1b[0m';
}


class FAButton extends Element {
	title:string;
	value:string;
	checked:boolean;
	eventAct:(e:Action, value:string)=>void;
	isFolder:boolean
	constructor(t:string, v:string, isFolder:boolean, check:boolean, eact:(e:Action, value:string)=>void) {
		super();
		this.enabled = true;
		this.value = v;
		this.title = t;
		this.isFolder = isFolder;
		this.eventAct = eact;
		this.checked = check;
	}
	render(sel:boolean) {
		const maxW = maxWChar;

		const color = `color: ${this.enabled?(sel?"#7FFF00":"#006400"):"#696969"};`;
		let format = (this.checked?'✅':' ') + (this.isFolder?'📁':'📝') + this.title;
		if (format.length > maxWChar)
			format = format.substring(0, maxW - 3)+"...";

		console.log("%c%s",
			color,
			format
		);
	}
	// deno-lint-ignore require-await
	async action(a: Action) {
		this.eventAct(a, this.value);
	}
	saveState():ElementState {
		throw "no support in FileAssistent to state save";
	}
	loadState(_:ElementState){
		throw "no support in FileAssistent to state save";
	}
}
const _fileAssistentRes:string[] = [];
function _fileAssistentResToggle(p:string) {
	const i = _fileAssistentRes.findIndex((x)=>x==p);
	if (i < 0)
		_fileAssistentRes.push(p);
	else
		_fileAssistentRes.splice(i, 1);
}
export async function fileAssistent(opts:{
	multiple?:boolean,
	folder?:boolean,
	fileExtensions?:string[]
	cwd?:string
}):Promise<string[]> {
	let end = false;
	let cwd = resolve(opts.cwd?opts.cwd:'.');
	let kpos = 0;
	_fileAssistentRes.splice(0, _fileAssistentRes.length);
	while(!end) {
		const f = new Form();
		f.elements.push(
			new Label("File Select Assistent", true),
			new Label(cwd),
			new Button("⏎", ()=>{
				if (cwd.length <= 3 && cwd.indexOf(':') == 1)
					cwd = '';
				else cwd = resolve(cwd, '..');
				f.closeSignal = true;
			})
		);
		if (cwd == '') {
			cwd ='C:\\';
			const bt = new Button("Select Drive", ()=>{
				f.closeSignal = true;
			});
			const tb = new TextBox("Disk letter", 'c', ()=>{
				cwd = tb.value.toUpperCase() + ':\\';
				try {
					Deno.statSync(cwd);
					bt.enabled = true;
				} catch (_) {
					bt.enabled = false;
				}
			});
			f.elements.push(
				tb,
				bt,
			);
		} else {
			if (opts.multiple)
				f.elements.push(
					new ComboBox<number>(`selecteds (${_fileAssistentRes.length})`, _fileAssistentRes.map((x,xi)=>({t:x,v:xi})), -1),
					new Button("Clear", ()=>{
						kpos = f.i;
						_fileAssistentRes.splice(0, _fileAssistentRes.length);
						f.closeSignal=true;
					})
				);
			let t = Array.from(Deno.readDirSync(cwd)).filter((x)=>x.name != '..' && x.name != '.');
			if (opts.fileExtensions)
				t = t.filter((x)=>x.isDirectory || opts.fileExtensions?.find((y)=>x.name.endsWith(y)) != null);
			const act_fa = opts.multiple?(
				(e:Action, p:string)=>{
					const isf = Deno.statSync(p).isFile;
					if (e == Action.ENTER && (isf || opts.folder)) {
						_fileAssistentResToggle(p);
						kpos = f.i;
						f.closeSignal=true;
					}
					if (e == Action.RIGHT && !isf) {
						cwd = p;
						kpos = f.i;
						f.closeSignal=true;
					}
				}
			):(
				(e:Action, p:string)=>{
					const isf = Deno.statSync(p).isFile;
					if (e == Action.ENTER) {
						if (isf || opts.folder) {
							_fileAssistentRes.push(p);
							end=true;
							kpos = f.i;
							f.closeSignal=true;
						} else if (!isf) {
							cwd = p;
							kpos = f.i;
							f.closeSignal=true;
						}
					}
					if (e == Action.RIGHT && !isf) {
						cwd = p;
						kpos = f.i;
						f.closeSignal=true;
					}
				}
			);
			f.elements.push(
				new Button(_fileAssistentRes.length>0?"Continue":"Cancel", ()=>{
					end = true;
					f.closeSignal=true;
				}),
				...t.sort((a,b)=>(b.isDirectory?1:0)-(a.isDirectory?1:0)).map((x)=>{
					const p = resolve(cwd, x.name);
					return new FAButton(
						x.name,
						p,
						x.isDirectory,
						_fileAssistentRes.find((y)=>y==p)!=null,
						act_fa);
				})
			);
		}
		
		if (0 < kpos && kpos < f.elements.length)
			f.i = kpos;
		kpos = 0;

		await f.run();
	}
	return _fileAssistentRes;
}