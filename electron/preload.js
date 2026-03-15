'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// ── window.api ─────────────────────────────────────────────────────
// All renderer → main communication goes through this bridge.
// File I/O and SQLite live exclusively in the main process.
contextBridge.exposeInMainWorld('api', {

  papers: {
    getAll:       ()          => ipcRenderer.invoke('papers:getAll'),
    getById:      (id)        => ipcRenderer.invoke('papers:getById', id),
    add:          (filePath)  => ipcRenderer.invoke('papers:add', filePath),
    update:       (id, data)  => ipcRenderer.invoke('papers:update', { id, data }),
    delete:       (id)        => ipcRenderer.invoke('papers:delete', id),
    getPdfBuffer: (id)        => ipcRenderer.invoke('papers:getPdfBuffer', id),
  },

  tags: {
    getAll: ()           => ipcRenderer.invoke('tags:getAll'),
    add:    (tag)        => ipcRenderer.invoke('tags:add', tag),
    update: (tag)        => ipcRenderer.invoke('tags:update', tag),
    delete: (id)         => ipcRenderer.invoke('tags:delete', id),
  },

  settings: {
    get:       (key)         => ipcRenderer.invoke('settings:get', key),
    set:       (key, value)  => ipcRenderer.invoke('settings:set', { key, value }),
    getAll:    ()            => ipcRenderer.invoke('settings:getAll'),
    setApiKey: (plaintext)   => ipcRenderer.invoke('settings:setApiKey', plaintext),
    getApiKey: ()            => ipcRenderer.invoke('settings:getApiKey'),
  },

  pomodoro: {
    log:   (session) => ipcRenderer.invoke('pomodoro:log', session),
    stats: ()        => ipcRenderer.invoke('pomodoro:stats'),
  },

  flashcards: {
    get: (paperId) => ipcRenderer.invoke('flashcards:get', paperId),
  },

  notes: {
    get:        (paperId)          => ipcRenderer.invoke('notes:get', paperId),
    save:       (paperId, content) => ipcRenderer.invoke('notes:save', { paperId, content }),
    getToThink: ()                 => ipcRenderer.invoke('notes:getToThink'),
  },

  markmap: {
    transform: (markdown) => ipcRenderer.invoke('markmap:transform', markdown),
    get:       (paperId)  => ipcRenderer.invoke('markmap:get', paperId),
  },

  ai: {
    mindmap:    (paperId) => ipcRenderer.invoke('ai:mindmap', paperId),
    summary:    (paperId) => ipcRenderer.invoke('ai:summary', paperId),
    flashcards: (paperId) => ipcRenderer.invoke('ai:flashcards', paperId),
    test:       (paperId) => ipcRenderer.invoke('ai:test', paperId),
  },

  export: {
    note:       (paperId) => ipcRenderer.invoke('export:note',       { paperId }),
    flashcards: (paperId) => ipcRenderer.invoke('export:flashcards', { paperId }),
    anki:       (paperId) => ipcRenderer.invoke('export:anki',       { paperId }),
    mindmap:    (paperId) => ipcRenderer.invoke('export:mindmap',    { paperId }),
    test:       (paperId) => ipcRenderer.invoke('export:test',       { paperId }),
    summary:    (paperId) => ipcRenderer.invoke('export:summary',    { paperId }),
  },

  dialog: {
    openFile:      () => ipcRenderer.invoke('dialog:openFile'),
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  },

  templates: {
    getAll: ()                    => ipcRenderer.invoke('templates:getAll'),
    save:   (name, content)       => ipcRenderer.invoke('templates:save', { name, content }),
    delete: (name)                => ipcRenderer.invoke('templates:delete', name),
  },
});
