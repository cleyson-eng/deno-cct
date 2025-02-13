export function fix(file:string) {
	let txt = Deno.readTextFileSync(file);
	if (txt.indexOf('VOLK_EXPORT')>0 || txt.indexOf('VOLK_H_') < 0) return;
	txt = txt.replace(
'#define VOLK_H_',
`#define VOLK_H_
#define VOLK_WIN_IN __declspec(dllimport)
#define VOLK_WIN_EX __declspec(dllexport)
#define VOLK_UNI_EX __attribute__((visibility("default")))`);
	txt = txt.replace(/^[\s]*extern[\s]+PFN/gm, (m)=>m.replace('extern','VOLK_EXPORT'));
	txt = txt.replace(/^[\s]*[A-z]+[\s]+[A-z]+[\s]*\(/gm, (m)=>{
		if (m.indexOf('extern')>=0)
			return m.replace('extern','VOLK_EXPORT');
		return "VOLK_EXPORT "+m;
	});
	Deno.writeTextFileSync(file,txt);
}