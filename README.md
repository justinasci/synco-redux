
# synco-redux [![NPM Version](https://badge.fury.io/js/synco-redux.svg?style=flat)](https://npmjs.org/package/synco-redux)
A lightweight Redux enhancer for syncing state across a browser extension, including the background script, popup, popovers, extension tabs, and content scripts.

## Installation
```npm install synco-redux```


## Browser extension

### Main Store
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

### Proxy Store
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

### Main Store
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

#### Proxy Store
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

### Preload
```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { registerSyncoReduxContextBridge } from './electronUtils';

registerSyncoReduxContextBridge(contextBridge, ipcRenderer);	
```
