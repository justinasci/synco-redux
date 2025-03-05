
# synco-redux [![NPM Version](https://badge.fury.io/js/synco-redux.svg?style=flat)](https://npmjs.org/package/synco-redux)
A lightweight Redux enhancer for syncing state across a browser extension, including the background script, popup, popovers, extension tabs, and content scripts.

## Installation
`npm install synco-redux`


### Main Store
```javascript
import { createMainStoreEnhancer } from  'synco-redux';

const store  =  configureStore({
	reducer:  combinedReducers,
	enhancers:  getDefaultEnhancers  =>
	getDefaultEnhancers()
		.concat(createMainStoreEnhancer()),

});
```


### Proxy Store
```javascript
import { immerProxyStoreReducer, createProxyStoreEnhancer }from  'synco-redux';

const store = configureStore({
	reducer:  immerProxyStoreReducer<IReduxState>,
	enhancers:  getDefaultEnhancers  => 
		getDefaultEnhancers().concat(createProxyStoreEnhancer()),
});
```
