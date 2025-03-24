
# synco-redux [![NPM Version](https://badge.fury.io/js/synco-redux.svg?style=flat)](https://npmjs.org/package/synco-redux)
A lightweight Redux enhancer for syncing state across different environments, including browser extensions and Electron applications.

## How It Works
Synco-Redux follows a main-proxy store architecture:

- **Main Store**: Acts as the single source of truth. It processes all dispatched actions and broadcasts state updates to all connected proxy stores.
- **Proxy Stores**: Do not process actions themselves. Instead, they forward actions to the main store and later update their internal state based on the changes broadcasted from the main store.

This setup ensures a consistent state across different processes.

## Installation
```npm install synco-redux```


## Browser extension

Synco-Redux enables seamless state synchronization between different parts of a browser extension, such as the background script, popup, popovers, extension tabs, and content scripts.

It uses browser ports for communication (chrome.runtime.connect or browser.runtime.connect), ensuring an efficient message-based state synchronization.

Note:
The enhancer should be used with the `webextension-polyfill` package or by passing `chrome` or `browser` directly to the communication object.

### 1. Main Store

The background script should initialize the main store, as it serves as the single source of truth.

```javascript
import { configureStore } from '@reduxjs/toolkit';
import Browser from 'webextension-polyfill';

import { createMainStoreEnhancer, PortMainComms } from 'synco-redux';

const mainComms = new PortMainComms(Browser);

const mainStore = configureStore({
	reducer: appSlice.reducer,
	enhancers: (getDefaultEnhancers) =>
		getDefaultEnhancers().concat(createMainStoreEnhancer(mainComms))
});
```

### 2. Proxy Store

Proxy stores should be created in UI components (like popups, options pages, or content scripts). These stores do not process actions themselves but instead forward them to the main store.

```javascript
import { configureStore } from '@reduxjs/toolkit';
import Browser from 'webextension-polyfill';

import {
	createProxyStoreEnhancer,
	immerProxyStoreReducer,
	PortProxyComms
} from 'synco-redux';

const proxyComms = new PortProxyComms(Browser);

const proxyStore = configureStore({
	reducer: immerProxyStoreReducer,
	enhancers: (getDefaultEnhancers) =>
		getDefaultEnhancers().concat(createProxyStoreEnhancer(proxyComms))
});
```

## Electron

Synco-Redux enables seamless state synchronization between the main process and multiple renderer processes (such as different browser windows or webviews) in Electron applications.
It uses Electron's Context Bridge and IPC (Inter-Process Communication) for secure and sandboxed state synchronization.

### 1. Main Store

The main store runs in Electron's main process and acts as the single source of truth.

```javascript
import { configureStore } from '@reduxjs/toolkit';

import { createMainStoreEnhancer, ElectronComms } from 'synco-redux';
import { BrowserWindow, ipcMain } from 'electron';

const mainComms = new ElectronComms(ipcMain, BrowserWindow.getAllWindows);

const mainStore = configureStore({
	reducer: appSlice.reducer,
	enhancers: (getDefaultEnhancers) =>
		getDefaultEnhancers().concat(createMainStoreEnhancer(mainComms))
});
```

#### 2. Proxy Store

Each Electron renderer process (such as a browser window or webview) should create a proxy store. These stores do not process actions but instead forward them to the main store.

```javascript
import { configureStore } from '@reduxjs/toolkit';

import {
	createProxyStoreEnhancer,
	ElectronProxyComms,
	immerProxyStoreReducer
} from 'synco-redux';

const proxyComms = new ElectronProxyComms();

const proxyStore = configureStore({
	reducer: immerProxyStoreReducer,
	enhancers: (getDefaultEnhancers) =>
		getDefaultEnhancers().concat(createProxyStoreEnhancer(proxyComms))
});
```

### 3. Preload

To bridge communication between the main and renderer processes in a sandboxed environment, use Electron's Context Bridge in the preload script.

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { registerSyncoReduxContextBridge } from './electronUtils';

registerSyncoReduxContextBridge(contextBridge, ipcRenderer);	
```


#### Helpers
`isProxyReady = (proxyStore: Store) => Promise<boolean>;` - Checks if a proxy store is synced with the main store and ready to dispatch events.

` isProxyStore = (store: Store) => Promise<boolean>;` - Determines if a given store is a proxy store or not.