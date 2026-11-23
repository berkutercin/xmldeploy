import { contextBridge, ipcRenderer } from 'electron';

// Arayüze açılan API'ler: GİB sorgusu (doğrulama gibProxy'de) ve HTML → PDF (pdfRenderer).
contextBridge.exposeInMainWorld('gib', {
  query: (query: string) => ipcRenderer.invoke('gib:query', query),
});

contextBridge.exposeInMainWorld('pdf', {
  render: (html: string) => ipcRenderer.invoke('pdf:render', html),
});
