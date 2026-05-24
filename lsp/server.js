#!/usr/bin/env node
'use strict';

const { fileURLToPath } = require('url');
const { TomboyLinksWorkspace } = require('./core');

const workspace = new TomboyLinksWorkspace();
let nextScanTimer;
let incoming = Buffer.alloc(0);
const keepAlive = setInterval(() => {}, 1 << 30);

process.stdin.on('data', (chunk) => {
  incoming = Buffer.concat([incoming, chunk]);
  readMessages();
});

process.stdin.resume();

function readMessages() {
  while (true) {
    const headerEnd = incoming.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      return;
    }

    const header = incoming.slice(0, headerEnd).toString('utf8');
    const lengthMatch = /Content-Length:\s*(\d+)/i.exec(header);
    if (!lengthMatch) {
      incoming = incoming.slice(headerEnd + 4);
      continue;
    }

    const length = Number(lengthMatch[1]);
    const messageStart = headerEnd + 4;
    const messageEnd = messageStart + length;
    if (incoming.length < messageEnd) {
      return;
    }

    const body = incoming.slice(messageStart, messageEnd).toString('utf8');
    incoming = incoming.slice(messageEnd);
    handleMessage(JSON.parse(body));
  }
}

function handleMessage(message) {
  if (message.method) {
    handleRequestOrNotification(message);
    return;
  }
}

function handleRequestOrNotification(message) {
  const { id, method, params } = message;

  try {
    if (method === 'initialize') {
      workspace.initialize(initializeRoots(params));
      respond(id, {
        capabilities: {
          textDocumentSync: 1,
          definitionProvider: true,
          documentLinkProvider: {
            resolveProvider: false,
          },
        },
        serverInfo: {
          name: 'Tomboy Links',
          version: '0.0.1',
        },
      });
      return;
    }

    if (method === 'shutdown') {
      respond(id, null);
      return;
    }

    if (method === 'exit') {
      clearInterval(keepAlive);
      process.exit(0);
    }

    if (method === 'textDocument/didOpen') {
      workspace.open(params.textDocument.uri, params.textDocument.text);
      scheduleRebuild();
      return;
    }

    if (method === 'textDocument/didChange') {
      const change = params.contentChanges[params.contentChanges.length - 1];
      if (change && typeof change.text === 'string') {
        workspace.change(params.textDocument.uri, change.text);
        scheduleRebuild();
      }
      return;
    }

    if (method === 'textDocument/didClose') {
      scheduleRebuild();
      return;
    }

    if (method === 'textDocument/definition') {
      respond(id, workspace.definitionAt(params.textDocument.uri, params.position));
      return;
    }

    if (method === 'textDocument/documentLink') {
      respond(id, workspace.documentLinks(params.textDocument.uri));
      return;
    }

    if (id !== undefined) {
      respond(id, null);
    }
  } catch (error) {
    if (id !== undefined) {
      respondError(id, -32603, error.message);
    }
  }
}

function initializeRoots(params = {}) {
  if (Array.isArray(params.workspaceFolders) && params.workspaceFolders.length > 0) {
    return params.workspaceFolders
      .map((folder) => fileURLToPath(folder.uri))
      .filter(Boolean);
  }

  if (params.rootUri) {
    return [fileURLToPath(params.rootUri)];
  }

  if (params.rootPath) {
    return [params.rootPath];
  }

  return [];
}

function scheduleRebuild() {
  if (nextScanTimer) {
    clearTimeout(nextScanTimer);
  }

  nextScanTimer = setTimeout(() => {
    nextScanTimer = undefined;
    workspace.rebuildIndex();
  }, 150);
}

function respond(id, result) {
  write({ jsonrpc: '2.0', id, result });
}

function respondError(id, code, message) {
  write({
    jsonrpc: '2.0',
    id,
    error: { code, message },
  });
}

function write(message) {
  const body = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`);
}
