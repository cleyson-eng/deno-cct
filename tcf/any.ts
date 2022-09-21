import { addUserTool } from "../base/interfaces.ts";
import { Platform,Arch } from "../base/target.ts";


addUserTool({
	platform:Platform.ANY,
	arch:Arch.ANY
}, {
	platform:Platform.ANY,
	arch:Arch.ANY
}, "cmake 3.10+", "Python*", "Perl*", "git*");
addUserTool({
	platform:Platform.ANY,
	arch:Arch.ANY
}, {
	platform:Platform.ANY,
	arch:Arch.X86_32
}, "Yasm*","Nasm*");
addUserTool({
	platform:Platform.ANY,
	arch:Arch.ANY
}, {
	platform:Platform.ANY,
	arch:Arch.X86_64
}, "Yasm*","Nasm*");