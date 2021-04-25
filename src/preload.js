const electron = require('electron');
const {ipcRenderer,contextBridge} = electron;

console.log("preloading");

contextBridge.exposeInMainWorld(
    "api",
    {
        send: (channel, data) => {
            ipcRenderer.send(channel, data);
        },
        receive: (channel, func) => {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    }
);
