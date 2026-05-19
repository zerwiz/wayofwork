import { spawnSync } from "node:child_process";
import { homedir, platform } from "node:os";

export type NativePickResult =
	| { path: string }
	| { cancelled: true }
	| { error: string };

function trimLine(s: string): string {
	return s.replace(/\r?\n$/, "").trim();
}

function linuxPickFile(): NativePickResult {
	const z = spawnSync("zenity", ["--file-selection", "--title=Open file"], {
		encoding: "utf-8",
		windowsHide: true,
	});
	if (!z.error) {
		if (z.status === 0 && z.stdout) {
			const path = trimLine(z.stdout);
			return path ? { path } : { cancelled: true };
		}
		return { cancelled: true };
	}
	if (z.error.code !== "ENOENT") {
		return { error: z.error.message };
	}
	const k = spawnSync("kdialog", ["--getopenfilename", homedir()], {
		encoding: "utf-8",
		windowsHide: true,
	});
	if (k.error?.code === "ENOENT") {
		return {
			error:
				"No native file dialog (install zenity or kdialog, or type the path in the prompt).",
		};
	}
	if (k.status === 0 && k.stdout) {
		const path = trimLine(k.stdout);
		return path ? { path } : { cancelled: true };
	}
	return { cancelled: true };
}

function linuxPickFolder(): NativePickResult {
	const z = spawnSync(
		"zenity",
		["--file-selection", "--directory", "--title=Open folder"],
		{ encoding: "utf-8", windowsHide: true },
	);
	if (!z.error) {
		if (z.status === 0 && z.stdout) {
			const path = trimLine(z.stdout);
			return path ? { path } : { cancelled: true };
		}
		return { cancelled: true };
	}
	if (z.error.code !== "ENOENT") {
		return { error: z.error.message };
	}
	const k = spawnSync("kdialog", ["--getexistingdirectory", homedir()], {
		encoding: "utf-8",
		windowsHide: true,
	});
	if (k.error?.code === "ENOENT") {
		return {
			error:
				"No native folder dialog (install zenity or kdialog, or type the path in the prompt).",
		};
	}
	if (k.status === 0 && k.stdout) {
		const path = trimLine(k.stdout);
		return path ? { path } : { cancelled: true };
	}
	return { cancelled: true };
}

function darwinPickFile(): NativePickResult {
	const r = spawnSync(
		"osascript",
		["-e", 'POSIX path of (choose file with prompt "Open file")'],
		{ encoding: "utf-8", windowsHide: true },
	);
	if (r.error?.code === "ENOENT") {
		return { error: "osascript not found" };
	}
	if (r.status === 0 && r.stdout) {
		const path = trimLine(r.stdout);
		return path ? { path } : { cancelled: true };
	}
	return { cancelled: true };
}

function darwinPickFolder(): NativePickResult {
	const r = spawnSync(
		"osascript",
		["-e", 'POSIX path of (choose folder with prompt "Open folder")'],
		{ encoding: "utf-8", windowsHide: true },
	);
	if (r.error?.code === "ENOENT") {
		return { error: "osascript not found" };
	}
	if (r.status === 0 && r.stdout) {
		const path = trimLine(r.stdout);
		return path ? { path } : { cancelled: true };
	}
	return { cancelled: true };
}

function winPickFile(): NativePickResult {
	const ps = [
		"Add-Type -AssemblyName System.Windows.Forms;",
		"$d = New-Object System.Windows.Forms.OpenFileDialog;",
		"$d.Title = 'Open file';",
		"if ($d.ShowDialog() -eq 'OK') { Write-Output $d.FileName } else { exit 1 }",
	].join(" ");
	const r = spawnSync(
		"powershell.exe",
		["-NoProfile", "-Sta", "-WindowStyle", "Hidden", "-Command", ps],
		{ encoding: "utf-8", windowsHide: true },
	);
	if (r.error?.code === "ENOENT") {
		return { error: "powershell.exe not found" };
	}
	if (r.status === 0 && r.stdout) {
		const path = trimLine(r.stdout);
		return path ? { path } : { cancelled: true };
	}
	return { cancelled: true };
}

function winPickFolder(): NativePickResult {
	const ps = [
		"Add-Type -AssemblyName System.Windows.Forms;",
		"$d = New-Object System.Windows.Forms.FolderBrowserDialog;",
		"$d.Description = 'Open folder';",
		"if ($d.ShowDialog() -eq 'OK') { Write-Output $d.SelectedPath } else { exit 1 }",
	].join(" ");
	const r = spawnSync(
		"powershell.exe",
		["-NoProfile", "-Sta", "-WindowStyle", "Hidden", "-Command", ps],
		{ encoding: "utf-8", windowsHide: true },
	);
	if (r.error?.code === "ENOENT") {
		return { error: "powershell.exe not found" };
	}
	if (r.status === 0 && r.stdout) {
		const path = trimLine(r.stdout);
		return path ? { path } : { cancelled: true };
	}
	return { cancelled: true };
}

/** Opens a host-native file/folder picker (blocking). Paths are on the machine running the server. */
export function pickNativePath(kind: "file" | "folder"): NativePickResult {
	const os = platform();
	try {
		if (os === "darwin") {
			return kind === "file" ? darwinPickFile() : darwinPickFolder();
		}
		if (os === "win32") {
			return kind === "file" ? winPickFile() : winPickFolder();
		}
		return kind === "file" ? linuxPickFile() : linuxPickFolder();
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { error: message };
	}
}
