import * as afs from '../agnosticFS.ts';

export default class File {
	path = '';
	txt = '';
	constructor (p:string) {
		this.path = p;
		this.txt = afs.readTextFile(p);
	}
	save() {
		afs.writeTextFile(this.path, this.txt, {ifdiff:true});
	}
	inject(inject_label:string, inject_text:string) {
		inject_label = `//<CCT-fix>${inject_label}</CCT-fix>`;
		if (this.txt.indexOf(inject_label) < 0) {
			this.txt = inject_text + this.txt;
			this.txt += "\n"+inject_label;
		}
		return this;
	}
}