var SplitBrowser = { 
	
	get scrollbarSize() { 
		return nsPreferences.getIntPref('splitbrowser.appearance.scrollbar.size');
	},
 
	get subBrowserToolbarShowDelay() { 
		return nsPreferences.getIntPref('splitbrowser.delay.subbrowser.toolbar.show');
	},
	get subBrowserToolbarHideDelay() {
		return nsPreferences.getIntPref('splitbrowser.delay.subbrowser.toolbar.hide');
	},
 
	get isLinux() 
	{
		return (navigator.platform.indexOf('Linux') > -1);
	},
 
	get tabbedBrowsingEnabled() 
	{
		// tabbed browsing mode is not compatible with TBE or TMP
		return !(
			'TM_init' in window ||
			(
				'TabbrowserService' in window &&
				!('TBECompatibilityServiceSplitBrowser' in window)
			)
		);
	},
 
	get mainBrowserBox() 
	{
		return document.getElementById('appcontent').contentWrapper;
	},
 
	POSITION_LEFT   : 1, 
	POSITION_RIGHT  : 2,
	POSITION_TOP    : 4,
	POSITION_BOTTOM : 8,

	POSITION_HORIZONAL : 3,
	POSITION_VERTICAL  : 12,

	POSITION_BEFORE : 5,
	POSITION_AFTER  : 10,
 
	browsers  : [], 
 
/* utilities */ 
	
	makeURIFromSpec : function(aURI) 
	{
		try {
			var newURI;
			aURI = aURI || '';
			if (aURI && aURI.indexOf('file:') == 0) {
				var fileHandler = this.mIOService.getProtocolHandler('file').QueryInterface(Components.interfaces.nsIFileProtocolHandler);
				var tempLocalFile = fileHandler.getFileFromURLSpec(aURI);
				newURI = this.mIOService.newFileURI(tempLocalFile); // we can use this instance with the nsIFileURL interface.
			}
			else {
				newURI = this.mIOService.newURI(aURI, null, null);
			}
			return newURI;
		}
		catch(e){
		}
		return null;
	},
	mIOService : Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService),
 
	getSubBrowserById : function(aID) 
	{
		var windows = this.browserWindows;
		var node;
		for (var i = 0, maxi = windows.length; i < maxi; i++)
		{
			node = windows[i].document.getElementById(aID);
			if (node)
				return node;
		}
		return null;
	},
 
	get browserWindows() 
	{
		var browserWindows = [];

		var targets = this.WindowManager.getEnumerator('navigator:browser'),
			target;
		while (targets.hasMoreElements())
		{
			target = targets.getNext().QueryInterface(Components.interfaces.nsIDOMWindowInternal);
			browserWindows.push(target);
		}

		return browserWindows;
	},
 
	get WindowManager() 
	{
		if (!this._WindowManager) {
			this._WindowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
		}
		return this._WindowManager;
	},
	_WindowManager : null,
 
	getSubBrowserFromFrame : function(aFrame) 
	{
		var docShell = aFrame
			.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
			.getInterface(Components.interfaces.nsIWebNavigation)
			.QueryInterface(Components.interfaces.nsIDocShell);
		for (var i = 0, maxi = this.browsers.length; i < maxi; i++)
		{
			if (this.browsers[i].browser.docShell == docShell)
				return this.browsers[i];
		}
		return null;
	},
 
	getDropPositionOnContentArea : function(aEvent, aBox) 
	{
		var W = aBox.boxObject.width;
		var H = aBox.boxObject.height;
		var X = aBox.boxObject.screenX;
		var Y = aBox.boxObject.screenY;
		var x = aEvent.screenX - X;
		var y = aEvent.screenY - Y;

		var isTL = x <= W - (y * W / H);
		var isBL = x <= y * W / H;

		return (isTL && isBL) ? SplitBrowser.POSITION_LEFT :
			(isTL && !isBL) ? SplitBrowser.POSITION_TOP :
			(!isTL && isBL) ? SplitBrowser.POSITION_BOTTOM :
			SplitBrowser.POSITION_RIGHT ;
	},
  
/* add sub-browser (split contents) */ 
	
	addSubBrowser : function(aURI, aBrowser, aPosition) 
	{
		var appcontent = document.getElementById('appcontent');
		var b = aBrowser || this.getSubBrowserFromFrame(document.commandDispatcher.focusedWindow.top);
		var target = (b && b.parentContainer) ? b.parentContainer : appcontent ;
		var hContainer = target.hContainer;
		var vContainer = target.vContainer;

		var width  = (aPosition & this.POSITION_HORIZONAL) ? parseInt((b || gBrowser).boxObject.width / 5 * 2) : -1 ;
		var height = (aPosition & this.POSITION_VERTICAL) ? parseInt((b || gBrowser).boxObject.height / 5 * 2) : -1 ;

		var refNode = (aPosition & this.POSITION_HORIZONAL) ? (b || this.mainBrowserBox ) : hContainer ;

		var source = (!aURI || aURI.split('\n')[0] == 'subbrowser') ? aURI.split('\n')[1].replace(/^id:/, '') : null ;
		if (source) {
			source = SplitBrowser.getSubBrowserById(source);
			var data = aURI.split('\n');
			if (!source) {
				aURI = data[2].replace(/^uri:/, '');
			}
			else {
				aURI   = null;
				if (aPosition & this.POSITION_HORIZONAL && source.parentOrient == 'horizontal')
					width = parseInt(data[3].replace(/^width:/, ''));
				if (aPosition & this.POSITION_VERTICAL && source.parentOrient == 'vertical')
					height = parseInt(data[4].replace(/^height:/, ''));
			}
		}

		var browser   = this.createSubBrowser(aURI);
		var container = this.addContainerTo(target, aPosition, refNode, width, height, browser);

		if (source) {
			window.setTimeout(
				this.duplicateBrowser,
				0,
				source.browser,
				browser.browser,
				function() {
					source.close();
				}
			);
		}

		return browser;
	},
	
	addSubBrowserFromTab : function(aTab, aPosition) 
	{
		var b = aTab;
		while (b.localName != 'tabbrowser')
		{
			b = b.parentNode;
		}
		if (aTab.localName != 'tab')
			aTab = b.mCurrentTab;

		var uri = this.tabbedBrowsingEnabled ? null : aTab.linkedBrowser.currentURI.spec ;


		var browser = this.addSubBrowser(uri, b.parentSubBrowser || this.mainBrowserBox, aPosition);

		if (this.tabbedBrowsingEnabled)
			window.setTimeout(
				this.duplicateBrowser,
				0,
				aTab.linkedBrowser,
				browser.browser,
				function() {
					if (nsPreferences.getBoolPref('splitbrowser.tab.closetab'))
						b.removeTab(aTab);
				}
			);

		return browser;
	},
	
	duplicateBrowser : function(aSource, aTarget, aCallback) 
	{
		var state = SplitBrowser.serializeBrowserState(aSource);
		SplitBrowser.deserializeBrowserState(aTarget, state, aCallback);
	},
   
	addContainerTo : function(aParent, aPosition, aRefNode, aWidth, aHeight, aContent) 
	{
		if (aPosition & this.POSITION_HORIZONAL)
			aHeight = -1;
		else
			aWidth = -1;

		var container = this.createContainer(aWidth, aHeight);
		var hContainer = aParent.hContainer;
		var vContainer = aParent.vContainer;

		var splitter = this.createSplitter(aPosition);

		switch (aPosition)
		{
			case this.POSITION_LEFT:
				if (!aRefNode || aRefNode.parentNode != hContainer)
					aRefNode = hContainer.firstChild;
				if (aContent) {
					aRefNode.width = aRefNode.boxObject.width - aWidth;
					aContent.setAttribute('width', aWidth);
				}
				hContainer.insertBefore(container, aRefNode);
				hContainer.insertBefore(splitter, aRefNode);
				break;

			default:
			case this.POSITION_RIGHT:
				if (!aRefNode || aRefNode.parentNode != hContainer)
					aRefNode = hContainer.lastChild;
				if (aContent) {
					aRefNode.width = aRefNode.boxObject.width - aWidth;
					aContent.setAttribute('width', aWidth);
				}
				aRefNode = aRefNode.nextSibling;
				if (aRefNode) {
					hContainer.insertBefore(splitter, aRefNode);
					hContainer.insertBefore(container, aRefNode);
				}
				else {
					hContainer.appendChild(splitter, aRefNode);
					hContainer.appendChild(container, aRefNode);
				}
				break;

			case this.POSITION_TOP:
				if (!aRefNode || aRefNode.parentNode != vContainer)
					aRefNode = vContainer.firstChild;
				if (aContent) {
					aRefNode.height = aRefNode.boxObject.height - aHeight;
					aContent.setAttribute('height', aHeight);
				}
				vContainer.insertBefore(container, aRefNode);
				vContainer.insertBefore(splitter, aRefNode);
				break;

			case this.POSITION_BOTTOM:
				if (!aRefNode || aRefNode.parentNode != vContainer)
					aRefNode = vContainer.lastChild;
				if (aContent) {
					aRefNode.height = aRefNode.boxObject.height - aHeight;
					aContent.setAttribute('height', aHeight);
				}
				aRefNode = aRefNode.nextSibling;
				if (aRefNode) {
					vContainer.insertBefore(splitter, aRefNode);
					vContainer.insertBefore(container, aRefNode);
				}
				else {
					vContainer.appendChild(splitter, aRefNode);
					vContainer.appendChild(container, aRefNode);
				}
				break;
		}

		if (aContent)
			container.hContainer.appendChild(aContent);

		return container;
	},
 
	createSubBrowser : function(aURI) 
	{
		var browser = document.createElement('subbrowser');
		browser.setAttribute('flex', 1);
		if (aURI)
			browser.setAttribute('src', aURI);

		browser.setAttribute('browsertype', this.tabbedBrowsingEnabled ? 'tabbrowser' : 'simple' );
		browser.setAttribute('id', 'splitbrowser-subbrowser-'+parseInt(Math.random() * 65000));

		this.browsers.push(browser);

		return browser;
	},
 
	createContainer : function(aWidth, aHeight) 
	{
		var container = document.createElement('subbrowser-container');
		container.setAttribute('flex', 1);
		if (aWidth > -1) container.width = aWidth;
		if (aHeight > -1) container.height = aHeight;

		return container;
	},
 
	createSplitter : function(aPosition) 
	{
		var splitter = document.createElement('splitter');
//		splitter.setAttribute('contextmenu', 'subbrowser-splitter-contextmenu');
		splitter.setAttribute('state', 'open');
		splitter.setAttribute('orient', ((aPosition & this.POSITION_HORIZONAL) ? 'horizontal' : 'vertical' ));
		splitter.setAttribute('sizevalue', ((aPosition & this.POSITION_HORIZONAL) ? 'width' : 'height' ));
		splitter.setAttribute('collapse', ((aPosition & this.POSITION_AFTER) ? 'after' : 'before' ));
		splitter.setAttribute('onmousedown', 'var node = SplitBrowser.getSplitterTarget(this); if (node.isCollapsed()) { node[this.getAttribute("sizevalue")] = 0; node.collapsed = false; }');
		return splitter;
	},
  
/* remove sub-browser (unsplit) */ 
	
	removeSubBrowser : function(aBrowser) 
	{
//dump('SubBrowserRemoveRequest\n');
		var appcontent = document.getElementById('appcontent');
		var browser   = aBrowser;
		var container = browser.parentContainer || appcontent;

		gBrowser.setAttribute('type', 'content');
		gBrowser.setAttribute('type', 'content-primary');

		browser.parentNode.removeChild(browser);
		for (var i = 0, maxi = this.browsers.length; i < maxi; i++)
		{
			if (this.browsers[i] == browser) {
				this.browsers.splice(i, 1);
				break;
			}
		}
		this.cleanUpContainer(container);
	},
	
	cleanUpContainer : function(aContainer) 
	{
		var container = aContainer;
		var parentContainer = container.parentContainer;

		var cont = container.hContainer;
		if (cont) {
			if (!cont.hasChildNodes()) {
				var box;
				if (cont.previousSibling &&
					cont.previousSibling.localName == 'splitter') {
					box = cont.previousSibling.previousSibling;
					box.height = box.boxObject.height + cont.boxObject.height;
					cont.previousSibling.previousSibling.removeAttribute('collapsed');
					container.vContainer.removeChild(cont.previousSibling);
				}
				else if (cont.nextSibling &&
					cont.nextSibling.localName == 'splitter') {
					box = cont.nextSibling.nextSibling;
					box.height = box.boxObject.height + cont.boxObject.height;
					cont.nextSibling.nextSibling.removeAttribute('collapsed');
					container.vContainer.removeChild(cont.nextSibling);
				}
				container.vContainer.removeChild(cont);
				container.hContainer = null;
			}
			else if (cont.childNodes.length % 2 == 0) {
				if (cont.firstChild.localName == 'splitter') {
					cont.removeChild(cont.firstChild);
				}
				else if (cont.lastChild.localName == 'splitter') {
					cont.removeChild(cont.lastChild);
				}
				else {
					for (var i = 0, maxi = cont.childNodes.length-1; i < maxi; i++)
					{
						if (cont.childNodes[i].localName == 'splitter' &&
							cont.childNodes[i+1].localName == 'splitter') {
							cont.removeChild(cont.childNodes[i]);
							break;
						}
					}
				}
			}
		}

		var cont = container.vContainer;
		if (!cont.hasChildNodes()) {
			var box;
			if (container.previousSibling && container.previousSibling.localName == 'splitter') {
				box = container.previousSibling.previousSibling;
				box.width = box.boxObject.width + container.boxObject.width;
				container.previousSibling.previousSibling.removeAttribute('collapsed');
				container.parentNode.removeChild(container.previousSibling);
			}
			else if (container.nextSibling && container.nextSibling.localName == 'splitter') {
				box = container.nextSibling.nextSibling;
				box.width = box.boxObject.width + container.boxObject.width;
				container.nextSibling.nextSibling.removeAttribute('collapsed');
				container.parentNode.removeChild(container.nextSibling);
			}
			container.parentNode.removeChild(container);
		}
		else if (cont.childNodes.length % 2 == 0) {
			if (cont.firstChild.localName == 'splitter') {
				cont.removeChild(cont.firstChild);
			}
			else if (cont.lastChild.localName == 'splitter') {
				cont.removeChild(cont.lastChild);
			}
			else {
				for (var i = 0, maxi = cont.childNodes.length-1; i < maxi; i++)
				{
					if (cont.childNodes[i].localName == 'splitter' &&
						cont.childNodes[i+1].localName == 'splitter') {
						cont.removeChild(cont.childNodes[i]);
						break;
					}
				}
			}
		}

		if (parentContainer) {
			this.cleanUpContainer(parentContainer);
		}
	},
  
	removeAllSubBrowsers : function() 
	{
		for (var i = this.browsers.length-1; i > -1; i--)
		{
			this.removeSubBrowser(this.browsers[i]);
		}
	},
  
/* save / load */ 
	
	save : function() 
	{
		var state = this.getContainerState(document.getElementById('appcontent'));
		nsPreferences.setUnicharPref('splitbrowser.state', state.toSource());
	},
	
	getContainerState : function(aContainer) 
	{
		var state = {
				children : []
			};

		var hContainer = aContainer.hContainer;
		if (hContainer) {
			var wrapper = aContainer.contentWrapper;
			var originalContent = hContainer.firstChild;
			for (var i = 0, maxi = hContainer.childNodes.length; i < maxi; i++)
			{
				if ((wrapper && hContainer.childNodes[i] == wrapper) ||
					hContainer.childNodes[i].localName == 'subbrowser') {
					originalContent = hContainer.childNodes[i];
					break;
				}
			}
			if (originalContent.localName == 'subbrowser') {
				state.content = this.serializeBrowserState(originalContent.browser);
				state.content.type       = 'subbrowser';
				state.content.uri        = originalContent.src;
				state.content.width      = originalContent.boxObject.width;
				state.content.height     = originalContent.boxObject.height;
				state.content.collapsed  = aContainer.isCollapsed();
				state.content.lastWidth  = aContainer.lastWidth;
				state.content.lastHeight = aContainer.lastHeight;
			}
			else if (wrapper && hContainer.childNodes[i] == wrapper) {
				state.content = {
					type   : 'root',
					width  : gBrowser.boxObject.width,
					height : gBrowser.boxObject.height
				};
			}
			else {
				state.content = this.getContainerState(originalContent);
			}

			var node = originalContent.previousSibling;
			while (node)
			{
				if (node.localName == 'splitter') {
					node = node.previousSibling;
					continue;
				}
				state.children.push(this.getContainerState(node));
				state.children[state.children.length-1].position = this.POSITION_LEFT;
				state.children[state.children.length-1].width    = node.boxObject.width;
				if (node.nextSibling.getAttribute('state') == 'collapsed')
					state.children[state.children.length-1].collapsed = true;
				node = node.previousSibling;
			}

			var node = originalContent.nextSibling;
			while (node)
			{
				if (node.localName == 'splitter') {
					node = node.nextSibling;
					continue;
				}
				state.children.push(this.getContainerState(node));
				state.children[state.children.length-1].position = this.POSITION_RIGHT;
				state.children[state.children.length-1].width    = node.boxObject.width;
				if (node.previousSibling.getAttribute('state') == 'collapsed')
					state.children[state.children.length-1].collapsed = true;
				node = node.nextSibling;
			}
		}

		var vContainer = aContainer.vContainer;

		var originalContent = vContainer.firstChild;
		for (var i = 0, maxi = vContainer.childNodes.length; i < maxi; i++)
		{
			if (vContainer.childNodes[i] == hContainer ||
				vContainer.childNodes[i].localName == 'subbrowser') {
				originalContent = vContainer.childNodes[i];
				break;
			}
		}
		if (originalContent.localName == 'subbrowser') {
			state.content = this.serializeBrowserState(originalContent.browser);
			state.content.type       = 'subbrowser';
			state.content.uri        = originalContent.src;
			state.content.width      = originalContent.boxObject.width;
			state.content.height     = originalContent.boxObject.height;
			state.content.collapsed  = aContainer.isCollapsed();
			state.content.lastWidth  = aContainer.lastWidth;
			state.content.lastHeight = aContainer.lastHeight;
		}
		else if (!state.content) {
			state.content = this.getContainerState(originalContent);
		}

		var node = originalContent.previousSibling;
		while (node)
		{
			if (node.localName == 'splitter') {
				node = node.previousSibling;
				continue;
			}
			state.children.push(this.getContainerState(node));
			state.children[state.children.length-1].position = this.POSITION_TOP;
			state.children[state.children.length-1].height   = node.boxObject.height;
			if (node.nextSibling.getAttribute('state') == 'collapsed')
				state.children[state.children.length-1].collapsed = true;
			node = node.previousSibling;
		}

		var node = originalContent.nextSibling;
		while (node)
		{
			if (node.localName == 'splitter') {
				node = node.nextSibling;
				continue;
			}
			state.children.push(this.getContainerState(node));
			state.children[state.children.length-1].position = this.POSITION_BOTTOM;
			state.children[state.children.length-1].height   = node.boxObject.height;
			if (node.previousSibling.getAttribute('state') == 'collapsed')
				state.children[state.children.length-1].collapsed = true;
			node = node.nextSibling;
		}

		return state;
	},
 
	serializeBrowserState : function(aBrowser) { 
		var state = {
				histories : this.serializeBrowserSessionHistories(aBrowser)
			};

		if (aBrowser.localName == 'tabbrowser') {
			for (var i = 0, maxi = aBrowser.mTabContainer.childNodes.length; i < maxi; i++)
			{
				if (aBrowser.mTabContainer.childNodes[i] == aBrowser.selectedTab) {
					state.selectedTab = i;
					break;
				}
			}
		}

		return state;
	},
 
	serializeBrowserSessionHistories : function(aBrowser) { 
		var histories = [];
		if (aBrowser.localName == 'tabbrowser') {
			for (var i = 0, maxi = aBrowser.mTabContainer.childNodes.length; i < maxi; i++)
			{
				histories.push(this.serializeSessionHistory(aBrowser.getBrowserForTab(aBrowser.mTabContainer.childNodes[i])))
			}
		}
		else {
			histories.push(this.serializeSessionHistory(aBrowser));
		}
		return histories
	},
	
	serializeSessionHistory : function(aBrowser) 
	{
		var SH = null;
		try {
			SH = aBrowser.sessionHistory;
		}
		catch(e) {
		}

		var entries = [],
			entry,
			x       = {},
			y       = {},
			content;
		if (SH)
			for (i = 0; i < SH.count; i++)
			{
				entry = this.serializeHistoryEntry(SH.getEntryAtIndex(i, false));
				if (entry)
					entries.push(entry);
			}

		return {
			entries : entries,
			index   : (SH ? SH.index : -1 )
		};
	},
	
	serializeHistoryEntry : function(aEntry) 
	{
		if (!aEntry) return null;

		aEntry = aEntry.QueryInterface(Components.interfaces.nsIHistoryEntry);
		aEntry = aEntry.QueryInterface(Components.interfaces.nsISHEntry);

		var x = {}, y = {};
		aEntry.getScrollPosition(x, y);

		var data = {
			id         : aEntry.ID, // to compare with saved data
			uri        : (aEntry.URI ? aEntry.URI.spec : null ),
			title      : aEntry.title,
			isSubFrame : aEntry.isSubFrame,
			x          : Math.max(x.value, 0),
			y          : Math.max(y.value, 0),
			children   : []
		};

		// get post data
		if ('cacheKey' in aEntry && aEntry.cacheKey) {
			data.cacheKey = aEntry.cacheKey.QueryInterface(Components.interfaces.nsISupportsPRUint32).data;
		}
		else {
			data.cacheKey = 0;
		}

		var children = [];
		try {
			aEntry = aEntry.QueryInterface(Components.interfaces.nsISHContainer);
		}
		catch(e) {
			return data;
		}

		for (var i = 0, maxi = aEntry.childCount; i < maxi; i++)
		{
			data.children.push(this.serializeHistoryEntry(aEntry.GetChildAt(i)));
		}
		return data;
	},
    
	load : function() 
	{
		var state = nsPreferences.copyUnicharPref('splitbrowser.state');
		if (!state) return;
		try {
			eval('state = '+state);
		}
		catch(e) {
			return;
		}

		this.buildContent(state, document.getElementById('appcontent'));
	},
	
	buildContent : function(aState, aContainer) 
	{
		switch (aState.content.type)
		{
			case 'root':
				aContainer.contentWrapper.width  = aState.content.width;
				aContainer.contentWrapper.height = aState.content.height;
				break;

			default:
			case 'subbrowser':
				if (aState.content.history) {
					aState.content.histories = [aState.content.history];
				}

				var b = this.createSubBrowser(
						aState.content.histories && aState.content.histories.length ? null : aState.content.uri
					);
				aContainer.hContainer.appendChild(b);
				aContainer.hContainer.width  = aState.content.width;
				aContainer.hContainer.height = aState.content.height;

				this.deserializeBrowserState(b.browser, aState.content);

				aContainer.lastWidth  = aState.content.lastWidth;
				aContainer.lastHeight = aState.content.lastHeight;
				if (aState.content.collapsed)
					aContainer.toggleCollapsed();

				break;
		}

		var container;
		var spacer = document.createElement('spacer');
		spacer.setAttribute('flex', 1);
		for (var i = 0, maxi = aState.children.length; i < maxi; i++)
		{
			container = this.addContainerTo(
				aContainer,
				aState.children[i].position,
				null,
				aState.children[i].width,
				aState.children[i].height
			);
			if (aState.children[i].collapsed)
				(aState.children[i].position & this.POSITION_BEFORE ? container.nextSibling : container.previousSibling).setAttribute('state', 'collapsed');
			this.buildContent(aState.children[i], container);
		}

		if (!aContainer.hContainer.hasChildNodes()) {
			aContainer.vContainer.removeChild(aContainer.hContainer);
		}
	},
 
	deserializeBrowserState : function(aBrowser, aBrowserState, aCallback) 
	{
		var browser, tab;
		if (aBrowser.localName == 'tabbrowser') {
			browser = aBrowser.mCurrentBrowser,
			tab     = aBrowser.mCurrentTab;
		}
		else {
			browser = aBrowser;
			tab     = null;
		}

		try {
			browser.sessionHistory.QueryInterface(Components.interfaces.nsISHistoryInternal);
		}
		catch(e) {
			window.setTimeout(arguments.callee, 50, aBrowser, aBrowserState);
			dump(e+'\n');
			return;
		}

		for (var i = 0, maxi = aBrowserState.histories.length; i < maxi; i++)
		{
			if (i) {
				tab     = aBrowser.addTab('about:blank');
				browser = aBrowser.getBrowserForTab(tab);
			}
			SplitBrowser.deserializeSessionHistory(browser, aBrowserState.histories[i]);
			if (aBrowser.localName == 'tabbrowser' &&
				aBrowserState.selectedTab == i)
				aBrowser.selectedTab = tab;
		}

		if (aCallback && typeof aCallback == 'function')
			aCallback();
	},
	
	deserializeSessionHistory : function(aBrowser, aData) 
	{
		var SHInternal = aBrowser.sessionHistory.QueryInterface(Components.interfaces.nsISHistoryInternal);
		for (var j in aData.entries)
			SHInternal.addEntry(
				this.deserializeSessionHistoryEntry(aData.entries[j]),
				true
			);
		try {
			aBrowser.gotoIndex(aData.index);
		}
		catch(e) { // when the entry is moving in frames...
			try {
				aBrowser.gotoIndex(aBrowser.sessionHistory.count-1);
			}
			catch(ex) { // when there is no history, do nothing
			}
		}
	},
 
	deserializeSessionHistoryEntry : function(aData) 
	{
		var entry = Components.classes['@mozilla.org/browser/session-history-entry;1'].createInstance(Components.interfaces.nsISHEntry);
		entry = entry.QueryInterface(Components.interfaces.nsIHistoryEntry);

		entry.setURI(this.makeURIFromSpec(aData.uri));
		entry.setTitle(aData.title);
		entry.setIsSubFrame(aData.isSubFrame);
		entry.loadType = Components.interfaces.nsIDocShellLoadInfo.loadHistory;

		entry.setScrollPosition(aData.x, aData.y);


		if ('cacheKey' in aData && aData.cacheKey) {
			var cacheKey = Components.classes['@mozilla.org/supports-PRUint32;1'].createInstance(Components.interfaces.nsISupportsPRUint32);
			cacheKey.type = cacheKey.TYPE_PRUINT32;
			cacheKey.data = parseInt(aData.cacheKey);
			cacheKey = cacheKey.QueryInterface(Components.interfaces.nsISupports);

			entry.cacheKey         = cacheKey;
			entry.expirationStatus = 'expirationStatus' in aData ? aData.expirationStatus : null ;
		}

		if (!aData.children || !aData.children.length) return entry;

		entry = entry.QueryInterface(Components.interfaces.nsISHContainer);
		for (var i in aData.children)
			entry.AddChild(
				this.deserializeSessionHistoryEntry(
					aData.children[i]
				),
				i
			);

		return entry;
	},
    
/* popup-buttons */ 
	addButtonIsShown : false,
	
	get addButton() { 
		return document.getElementById('splitbrowser-add-button');
	},
 
	get addButtonSize() { 
		return nsPreferences.getIntPref('splitbrowser.appearance.addbuttons.size');
	},
	get addButtonAreaSize() {
		return nsPreferences.getIntPref('splitbrowser.appearance.addbuttons.area');
	},
	get addButtonShowDelay() {
		return nsPreferences.getIntPref('splitbrowser.delay.addbuttons.show');
	},
	get addButtonHideDelay() {
		return nsPreferences.getIntPref('splitbrowser.delay.addbuttons.hide');
	},
 
	showAddButton : function(aEvent) 
	{
		if (this.showAddButtonTimer) {
			this.showAddButtonTimer = null;
			window.clearTimeout(this.showAddButtonTimer);
		}

		if (aEvent.firedBy.indexOf('drag') == 0) {
			this.showAddButtonNow(this, aEvent);
		}
		else {
			this.showAddButtonTimer = window.setTimeout(this.showAddButtonNow, this.addButtonShowDelay, this, aEvent);
		}
	},
	
	showAddButtonNow : function(aThis, aEvent) 
	{
		if (!aThis) aThis = this;

		if (aThis.addButtonIsShown) {
			if (aThis.hideAddButtonTimer)
				aThis.stopDelayedHideAddButtonTimer();
			aThis.delayedHideAddButton();
			return;
		}

		var node = aEvent.targetSubBrowser;

		if (!(
			node.mIsMouseOverTop ||
			node.mIsMouseOverBottom ||
			node.mIsMouseOverLeft ||
			node.mIsMouseOverRight
			)) {
			return;
		}

		aThis.addButtonIsShown = true;

		aThis.hideAddButton();

		var box    = node.contentAreaSizeObject;
		var button = aThis.addButton;
		button.hidden = button.parentNode.hidden = false;

		var size  = aThis.addButtonSize;

		button.width = button.height = size;

		var pos;
		if (aEvent.isTop) {
			pos = 'top';
			button.width  = box.areaWidth;
			button.parentNode.style.top = box.y+'px';
			button.parentNode.style.left = box.areaX+'px';
		}
		else if (aEvent.isBottom) {
			pos = 'bottom';
			button.width = box.areaWidth;
			button.parentNode.style.top = (box.y + box.height - size)+'px';
			button.parentNode.style.left = box.areaX+'px';
		}
		else if (aEvent.isLeft) {
			pos = 'left';
			button.height = box.areaHeight;
			button.parentNode.style.top = box.areaY+'px';
			button.parentNode.style.left = box.x+'px';
		}
		else if (aEvent.isRight) {
			pos = 'right';
			button.height = box.areaHeight;
			button.parentNode.style.top = box.areaY+'px';
			button.parentNode.style.left = (box.x + box.width - size)+'px';
		}

		button.className = pos;
		button.setAttribute('tooltiptext', button.getAttribute('tooltiptext-'+pos));
		button.targetSubBrowser = node;

		if (aThis.hideAddButtonTimer)
			aThis.stopDelayedHideAddButtonTimer();
		aThis.delayedHideAddButton();
	},
  
	hideAddButton : function(aEvent) 
	{
		this.stopDelayedHideAddButtonTimer();

		var button = this.addButton;
		button.hidden = button.parentNode.hidden = true;
		button.targetSubBrowser = null;

		if (aEvent && aEvent.force) {
			if (this.showAddButtonTimer) {
				window.clearTimeout(this.showAddButtonTimer);
				this.showAddButtonTimer = null;
			}
		}

		this.addButtonIsShown = false;
	},
 
	delayedHideAddButton : function() 
	{
		if (this.hideAddButtonTimer) return;
		this.stopDelayedHideAddButtonTimer();
		this.hideAddButtonTimer = window.setTimeout(this.delayedHideAddButtonCallback, this.addButtonHideDelay, this);
	},
	
	delayedHideAddButtonCallback : function(aThis) 
	{
		aThis.stopDelayedHideAddButtonTimer();
		aThis.hideAddButton();
	},
 
	stopDelayedHideAddButtonTimer : function() 
	{
		window.clearTimeout(this.hideAddButtonTimer);
		this.hideAddButtonTimer = null;
	},
  
	onAddButtonCommand : function(aEvent) 
	{
		var newEvent = document.createEvent('Events');
		newEvent.initEvent('SubBrowserAddRequest', false, true);

		var browser   = aEvent.target.targetSubBrowser;
		newEvent.targetSubBrowser = browser;
		newEvent.targetContainer = browser.parentContainer || document.getElementById('appcontent');
		newEvent.targetPosition = SplitBrowser['POSITION_'+aEvent.target.className.toUpperCase()];
		newEvent.targetURI = browser.src;
		aEvent.target.dispatchEvent(newEvent);

		window.setTimeout('SplitBrowser.hideAddButton()', 0);
	},
 
	addButtonDNDObserver : { 
		onDragOver : function() {},

		onDrop: function(aEvent, aXferData, aDragSession)
		{
			aEvent.preventDefault();
			aEvent.preventBubble();

			var uri = SplitBrowser.getURIFromDragData(aXferData, aDragSession, aEvent);
			if (!uri) return;

			SplitBrowser.fireSubBrowserAddRequestEventFromButton(uri);
			window.setTimeout('SplitBrowser.hideAddButton();', 0);
		},

		getSupportedFlavours: function ()
		{
			var flavourSet = new FlavourSet();
			flavourSet.appendFlavour('application/x-moz-splitbrowser');
			flavourSet.appendFlavour('text/x-moz-url');
			flavourSet.appendFlavour('text/unicode');
			flavourSet.appendFlavour('application/x-moz-file', 'nsIFile');
			return flavourSet;
		}
	},
  
/* drag-and-drop */ 
	
	getURIFromDragData : function(aXferData, aDragSession, aEvent) 
	{
		var uri;
		if (aXferData.flavour.contentType == 'application/x-moz-splitbrowser') {
			uri = aXferData.data;
		}
		else {
			// "window.retrieveURLFromData()" is old implementation
			uri = 'retrieveURLFromData' in window ? retrieveURLFromData(aXferData.data, aXferData.flavour.contentType) : transferUtils.retrieveURLFromData(aXferData.data, aXferData.flavour.contentType) ;

			if (!uri || !uri.length || uri.indexOf(' ', 0) != -1)
				return null;

			var sourceDoc = aDragSession.sourceDocument;
			if (sourceDoc) {
				var sourceURI = sourceDoc.documentURI;
				const nsIScriptSecurityManager = Components.interfaces.nsIScriptSecurityManager;
				var secMan = Components.classes['@mozilla.org/scriptsecuritymanager;1'].getService(nsIScriptSecurityManager);
				try {
					secMan.checkLoadURIStr(sourceURI, uri, nsIScriptSecurityManager.STANDARD);
				}
				catch(e) {
					aEvent.stopPropagation();
					throw 'Drop of ' + uri + ' denied.';
				}
			}

			uri = getShortcutOrURI(uri);
		}

		return uri;
	},
 
	fireSubBrowserAddRequestEventFromButton : function(aURI) 
	{
		var newEvent = document.createEvent('Events');
		newEvent.initEvent('SubBrowserAddRequest', false, true);

		var button = this.addButton;
		var browser = button.targetSubBrowser;

		newEvent.targetSubBrowser = browser;
		newEvent.targetContainer = browser.parentContainer || document.getElementById('appcontent');
		newEvent.targetPosition = SplitBrowser['POSITION_'+button.className.toUpperCase()];
		newEvent.targetURI = aURI;
		button.dispatchEvent(newEvent);
	},
  
	/* splitter context menu */ 
	
	getSplitterTarget : function(aSplitter) 
	{
		return (aSplitter.getAttribute('collapse') == 'before') ? aSplitter.previousSibling : aSplitter.nextSibling ;
	},
 
	updateSplitterContextMenu : function() 
	{
		var c = this.getSplitterTarget(document.popupNode);
		alert(c);
		if (!c) return;

		var popup = document.getElementById('subbrowser-splitter-contextmenu');
		var collapsed = c.isCollapsed();
		popup.getElementsByAttribute('class', 'subbrowser-context-collapse')[0].hidden = collapsed;
		popup.getElementsByAttribute('class', 'subbrowser-context-expand')[0].hidden = !collapsed;
	},
 
	toggleSplitterCollapsed : function() 
	{
		var c = this.getSplitterTarget(document.popupNode);
		if (c) c.toggleCollapsed();
	},
  
	init : function() 
	{
		document.documentElement.addEventListener('SubBrowserAddRequest', this, false);
		document.documentElement.addEventListener('SubBrowserRemoveRequest', this, false);
		document.documentElement.addEventListener('SubBrowserEnterContentAreaEdge', this, false);
		document.documentElement.addEventListener('SubBrowserExitContentAreaEdge', this, false);
		document.documentElement.addEventListener('SubBrowserTabbrowserInserted', this, false);

		document.getElementById('contentAreaContextMenu').addEventListener('popupshowing', this, false);

		window.addEventListener('resize', this, false);
		window.addEventListener('unload', this, false);

		window.removeEventListener('load', this, false);

		this.insertSeparateTabItem(gBrowser);

		if ('contentAreaDNDObserver' in window) {
			contentAreaDNDObserver.__splitbrowser__onDrop = contentAreaDNDObserver.onDrop;
			contentAreaDNDObserver.onDrop = this.contentAreaOnDrop;
			contentAreaDNDObserver.__splitbrowser__getSupportedFlavours = contentAreaDNDObserver.getSupportedFlavours;
			contentAreaDNDObserver.getSupportedFlavours = this.contentAreaGetSupportedFlavours;
		}

		if (this.tabbedBrowsingEnabled) {
			window.__splitbrowser__handleLinkClick = window.handleLinkClick;
			window.handleLinkClick = this.contentAreaHandleLinkClick;
		}

		if (nsPreferences.getBoolPref('splitbrowser.state.restore'))
			window.setTimeout('SplitBrowser.load();', 0);
//			this.load();
	},
	
	insertSeparateTabItem : function(aBrowser) 
	{
		var menu = document.getElementById('splitbrowser-tab-context-item-link-template').cloneNode(true);

		var tabContext = document.getAnonymousElementByAttribute(aBrowser, 'anonid', 'tabContextMenu');
		var separator = tabContext.firstChild;
		while (separator.localName != 'menuseparator' && separator)
		{
			separator = separator.nextSibling;
		}
		if (separator)
			tabContext.insertBefore(menu, separator);
		else
			tabContext.appendChild(menu);

		menu.setAttribute('id', 'splitbrowser-tab-context-item-link-'+(aBrowser.id || parseInt(Math.random() * 65000)));
	},
 
	contentAreaOnDrop: function (aEvent, aXferData, aDragSession) 
	{
		var uri = SplitBrowser.getURIFromDragData(aXferData, aDragSession, aEvent);
		if (!uri) return;

		// fallback for Linux
		// in Linux, "dragdrop" event doesn't fire on the button.

		var box = SplitBrowser.mainBrowserBox;

		var forceCheck = aEvent.ctrlKey || aXferData.flavour.contentType == 'application/x-moz-splitbrowser';
		var check = box.checkEventFiredOnEdge(aEvent, forceCheck);
		if (
			(forceCheck || SplitBrowser.isLinux) &&
			SplitBrowser.addButton.targetSubBrowser == box &&
			(
				check.isTop ||
				check.isBottom ||
				check.isLeft ||
				check.isRight
			)
			) {
			SplitBrowser.fireSubBrowserAddRequestEventFromButton(uri);
			aEvent.preventDefault();
			aEvent.preventBubble();
			return;
		}

		return this.__splitbrowser__onDrop(aEvent, aXferData, aDragSession);
	},
 
	contentAreaGetSupportedFlavours : function() 
	{
		var flavourSet = this.__splitbrowser__getSupportedFlavours();

		var flavour = new Flavour('application/x-moz-splitbrowser');
		flavourSet.flavours.splice(0, 0, flavour);
		flavourSet.flavourTable[flavour.contentType] = flavour;

		return flavourSet;
	},
 
	contentAreaHandleLinkClick : function(aEvent, aURI, aLinkNode) 
	{
		var d = aEvent.target.ownerDocument;
		var b = SplitBrowser.getSubBrowserFromFrame(d.defaultView.top);
		if (b) {
			b = b.browser;
		}
		else {
			return this.__splitbrowser__handleLinkClick.apply(this, arguments);
		}

		var docURL = d.location.aURI;
		if (
			b.localName == 'tabbrowser' &&
			(
				(
					aEvent.button == 0 &&
					aEvent.ctrlKey
				) ||
				(
					aEvent.button == 1 &&
					nsPreferences.getBoolPref('browser.tabs.opentabfor.middleclick')
				)
			)
			) {
			var loadInBackground = nsPreferences.getBoolPref('browser.tabs.loadInBackground');
			if (aEvent && aEvent.shiftKey)
				loadInBackground = !loadInBackground;

			if (docURL)
				urlSecurityCheck(aURI, docURL);

			var originCharset = d.characterSet;
			var referrerURI = docURL ? SplitBrowser.makeURIFromSpec(docURL) : null;
			if ('loadOneTab' in b) {
				b.loadOneTab(aURI, referrerURI, originCharset, null, loadInBackground, false);
			}
			else {
				var tab = b.addTab(aURI, referrerURI, originCharset);
				if (!loadInBackground) {
					window.setTimeout(function() {
						b.selectedTab = tab;
					}, 0);
					b.selectedTab = tab;
				}
			}
			aEvent.stopPropagation();
			return true;
		}

		return this.__splitbrowser__handleLinkClick.apply(this, arguments);
	},
  
	destroy : function() 
	{
		if (nsPreferences.getBoolPref('splitbrowser.state.restore'))
			this.save();

		document.documentElement.removeEventListener('SubBrowserAddRequest', this, false);
		document.documentElement.removeEventListener('SubBrowserRemoveRequest', this, false);
		document.documentElement.removeEventListener('SubBrowserEnterContentAreaEdge', this, false);
		document.documentElement.removeEventListener('SubBrowserExitContentAreaEdge', this, false);
		document.documentElement.removeEventListener('SubBrowserTabbrowserInserted', this, false);

		document.getElementById('contentAreaContextMenu').removeEventListener('popupshowing', this, false);

		window.removeEventListener('resize', this, false);
		window.removeEventListener('unload', this, false);
	},
 
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'load':
				this.init();
				break;

			case 'unload':
				this.destroy();
				break;

			case 'SubBrowserAddRequest':
				window.setTimeout('SplitBrowser.hideAddButton();', 0);
				this.addSubBrowser(aEvent.targetURI, aEvent.targetSubBrowser, aEvent.targetPosition);
				break;

			case 'SubBrowserRemoveRequest':
				window.setTimeout('SplitBrowser.hideAddButton();', 0);
				this.removeSubBrowser(aEvent.originalTarget || aEvent.target);
				break;

			case 'SubBrowserEnterContentAreaEdge':
				this.showAddButton(aEvent);
				break;

			case 'SubBrowserExitContentAreaEdge':
//				this.hideAddButton(aEvent);
				this.delayedHideAddButton();
				break;

			case 'resize':
				window.setTimeout('SplitBrowser.hideAddButton();', 0);
				break;

			case 'popupshowing':
				var item = document.getElementById('splitbrowser-context-item-link');
				if (gContextMenu.onLink)
					item.removeAttribute('hidden');
				else
					item.setAttribute('hidden', true);
				break;

			case 'SubBrowserTabbrowserInserted':
				this.insertSeparateTabItem(aEvent.tabbrowser);
				break;
		}
	}
 
}; 
  
window.addEventListener('load', SplitBrowser, false); 
 
