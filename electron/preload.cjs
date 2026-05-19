const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("wopShell", {
	reload: () => ipcRenderer.invoke("wop-shell:reload"),
	reloadHard: () => ipcRenderer.invoke("wop-shell:reload-hard"),
	toggleDevtools: () => ipcRenderer.invoke("wop-shell:toggle-devtools"),
	closeWindow: () => ipcRenderer.invoke("wop-shell:close-window"),
	openExternalUrl: (url) => ipcRenderer.invoke("wop-shell:open-external-url", url),
	saveWorkspaceFileAs: (suggestedName) => ipcRenderer.invoke("wop-shell:save-workspace-file", suggestedName),
	saveFileAs: (payload) => ipcRenderer.invoke("wop-shell:save-file", payload),
	startWayOfPiBunServer: () => ipcRenderer.invoke("wop-shell:start-wayofwork-bun-server"),
});
