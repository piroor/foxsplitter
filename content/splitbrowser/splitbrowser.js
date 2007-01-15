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
 
	POSITION_LEFT   : 1, 
	POSITION_RIGHT  : 2,
	POSITION_TOP    : 4,
	POSITION_BOTTOM : 8,

	POSITION_HORIZONAL : 3,
	POSITION_VERTICAL  : 12,

	POSITION_BEFORE : 5,
	POSITION_AFTER  : 10,
 
	browsers  : [], 
	splitters : [],
 
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
 
/* add sub-browser (split contents) */ 
	
	addSubBrowser : function(aURI, aBrowser, aPosition) 
	{
		var appcontent = document.getElementById('appcontent');
		var b = aBrowser || this.getBrowserFromFrame(document.commandDispatcher.focusedWindow.top);
		var target = (b && b.container) ? b.container : appcontent ;
		var hContainer = target.hContainer;
		var vContainer = target.vContainer;

		var width  = (aPosition & this.POSITION_HORIZONAL) ? parseInt((b || gBrowser).boxObject.width / 5 * 2) : -1 ;
		var height = (aPosition & this.POSITION_VERTICAL) ? parseInt((b || gBrowser).boxObject.height / 5 * 2) : -1 ;

		var refNode = (aPosition & this.POSITION_HORIZONAL) ? (b || appcontent.wrapper ) : hContainer ;

		var browser   = this.createSubBrowser(aURI);
		var container = this.addContainerTo(target, aPosition, refNode, width, height, browser);
	},
 
	addSubBrowserFromTab : function(aTab, aPosition) { 
		var b = gBrowser;
/*
		var b = aTab;
		while (b.localName != 'tabbrowser')
		{
			b = b.parentNode;
		}
*/
		if (aTab.localName != 'tab')
			aTab = b.selectedTab;

		this.addSubBrowser(aTab.linkedBrowser.currentURI.spec, b, aPosition);
		if (nsPreferences.getBoolPref('splitbrowser.tab.closetab'))
			b.removeTab(aTab);
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

		var splitter = document.createElement('splitter');
		splitter.setAttribute('state', 'open');
		splitter.setAttribute('orient', ((aPosition & this.POSITION_HORIZONAL) ? 'horizontal' : 'vertical' ));
		splitter.setAttribute('collapse', ((aPosition & this.POSITION_AFTER) ? 'after' : 'before' ));

		switch (aPosition)
		{
			case this.POSITION_LEFT:
				if (!aRefNode) aRefNode = hContainer.firstChild;
				if (aContent)
					aRefNode.width = aRefNode.boxObject.width - aWidth;
				hContainer.insertBefore(container, aRefNode);
				hContainer.insertBefore(splitter, aRefNode);
				break;

			default:
			case this.POSITION_RIGHT:
				if (!aRefNode) aRefNode = hContainer.lastChild;
				if (aContent)
					aRefNode.width = aRefNode.boxObject.width - aWidth;
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
				if (!aRefNode) aRefNode = vContainer.firstChild;
				if (aContent)
					aRefNode.height = aRefNode.boxObject.height - aHeight;
				vContainer.insertBefore(container, aRefNode);
				vContainer.insertBefore(splitter, aRefNode);
				break;

			case this.POSITION_BOTTOM:
				if (!aRefNode) aRefNode = vContainer.lastChild;
				if (aContent)
					aRefNode.height = aRefNode.boxObject.height - aHeight;
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
 
	getBrowserFromFrame : function(aFrame) 
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
  
/* remove sub-browser (unsplit) */ 
	
	removeSubBrowser : function(aBrowser) 
	{
//dump('SubBrowserRemoveRequest\n');
		var appcontent = document.getElementById('appcontent');
		var browser   = aBrowser;
		var container = browser.container || appcontent;

		browser.parentNode.removeChild(browser);
		for (var i = 0, maxi = this.browsers.length; i < maxi; i++)
		{
			if (this.browsers[i] == browser) {
				this.browsers.splice(i, 1);
				break;
			}
		}
/*
		var orient = 'horizontal';
		var node = container;
		while (node.parentNode &&
			!(
			(node.previousSibling && node.previousSibling.localName == 'splitter') ||
			(node.nextSibling && node.nextSibling.localName == 'splitter')
			))
		{
			node = node.parentNode;
		}
		if (node.previousSibling && node.previousSibling.localName == 'splitter')
			orient = node.previousSibling.getAttribute('orient');
		else if (node.nextSibling && node.nextSibling.localName == 'splitter')
			orient = node.nextSibling.getAttribute('orient');
*/
//dump(' remove wrapper.\n');
		this.cleanUpContainer(container);
/*
		this.animationStart({
			target  : container.wrapper,
			maxW    : container.wrapper.boxObject.width,
			maxH    : container.wrapper.boxObject.height,
			minW    : 0,
			minH    : 0,
			orient  : orient,
			timeout : 250,
			container : container,
			callback  : function(aInfo) {
//dump(' remove wrapper.\n');
				aInfo.target.parentNode.removeChild(aInfo.target);
				SplitBrowser.cleanUpContainer(aInfo.container);
			}
		});
*/
	},
	
	cleanUpContainer : function(aContainer) 
	{
		var container = aContainer;
		var parentContainer = container.container;
//dump('Clean Up Start\n');

		var cont = container.hContainer;
		if (cont) {
			if (!cont.hasChildNodes()) {
				if (cont.previousSibling &&
					cont.previousSibling.localName == 'splitter') {
					cont.previousSibling.previousSibling.removeAttribute('height');
					cont.previousSibling.previousSibling.removeAttribute('collapsed');
					container.vContainer.removeChild(cont.previousSibling);
				}
				else if (cont.nextSibling &&
					cont.nextSibling.localName == 'splitter') {
					cont.nextSibling.nextSibling.removeAttribute('height');
					cont.nextSibling.nextSibling.removeAttribute('collapsed');
					container.vContainer.removeChild(cont.nextSibling);
				}
	//dump(' remove hContainer.\n');
				container.vContainer.removeChild(cont);
			}
			else if (cont.childNodes.length % 2 == 0) {
	//dump(' remove horizontal splitter.\n');
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
			if (container.previousSibling && container.previousSibling.localName == 'splitter') {
				container.previousSibling.previousSibling.removeAttribute('width');
				container.previousSibling.previousSibling.removeAttribute('collapsed');
				container.parentNode.removeChild(container.previousSibling);
			}
			else if (container.nextSibling && container.nextSibling.localName == 'splitter') {
				container.nextSibling.nextSibling.removeAttribute('width');
				container.nextSibling.nextSibling.removeAttribute('collapsed');
				container.parentNode.removeChild(container.nextSibling);
			}
//dump(' remove vContainer.\n');
			container.parentNode.removeChild(container);
		}
		else if (cont.childNodes.length % 2 == 0) {
//dump(' remove vertical splitter.\n');
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
			var wrapper = aContainer.wrapper;
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
				state.content = {
					type    : 'subbrowser',
					uri     : originalContent.src,
					width   : originalContent.boxObject.width,
					height  : originalContent.boxObject.height,
					history : this.serializeSessionHistory(originalContent.browser)
				};
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
			state.content = {
				type    : 'subbrowser',
				uri     : originalContent.src,
				width   : originalContent.boxObject.width,
				height  : originalContent.boxObject.height,
				history : this.serializeSessionHistory(originalContent.browser)
			};
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
//dump('START TO BUILD.\n');
		switch (aState.content.type)
		{
			case 'root':
//dump(' THIS IS ROOT.\n');
				aContainer.wrapper.width  = aState.content.width;
				aContainer.wrapper.height = aState.content.height;
				break;

			default:
			case 'subbrowser':
//dump(' append subbrowser for '+aState.content.uri+'.\n');
				var b = this.createSubBrowser(aState.content.uri);
				aContainer.hContainer.appendChild(b);
				aContainer.hContainer.width  = aState.content.width;
				aContainer.hContainer.height = aState.content.height;

				if (aState.content.history) {
					var SHInternal = b.browser.sessionHistory.QueryInterface(Components.interfaces.nsISHistoryInternal);
					for (var i in aState.content.history.entries)
						SHInternal.addEntry(
							this.deserializeHistoryEntry(aState.content.history.entries[i]),
							true
						);
					try {
						b.browser.gotoIndex(aState.content.history.index);
					}
					catch(e) { // when the entry is moving in frames...
						try {
							b.browser.gotoIndex(b.sessionHistory.count-1);
						}
						catch(ex) { // when there is no history, do nothing
						}
					}
				}

				break;
		}

		var container;
		var spacer = document.createElement('spacer');
		spacer.setAttribute('flex', 1);
		for (var i = 0, maxi = aState.children.length; i < maxi; i++)
		{
//dump(' append container at '+aState.children[i].position+'.\n');
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
 
	deserializeHistoryEntry : function(aData) 
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
				this.deserializeHistoryEntry(
					aData.children[i]
				),
				i
			);

		return entry;
	},
   
/* popup-buttons */ 
	addButtonIsShown : false,
	
	get addButtonContainer() { 
		return document.getElementById('splitbrowser-add-button-container');
	},

	get addButtonTop() {
		return document.getElementById('splitbrowser-add-button-top');
	},
	get addButtonBottom() {
		return document.getElementById('splitbrowser-add-button-bottom');
	},
	get addButtonLeft() {
		return document.getElementById('splitbrowser-add-button-left');
	},
	get addButtonRight() {
		return document.getElementById('splitbrowser-add-button-right');
	},

	get addButtons() {
		return [
			this.addButtonTop,
			this.addButtonBottom,
			this.addButtonLeft,
			this.addButtonRight
		];
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
 
	initAddButtons : function() 
	{
		var container = this.addButtonContainer;
		var buttons = this.addButtons;
		var div;
		var size = this.addButtonSize;
		for (var i = 0, maxi = buttons.length; i < maxi; i++)
		{
			div = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
			div.style.position = 'absolute';
			div.style.zIndex   = 65500;
			buttons[i].width  = size;
			buttons[i].height = size;
			buttons[i].parentNode.removeChild(buttons[i]);
			div.appendChild(buttons[i]);
			container.appendChild(div);
		}
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

		aThis.addButtonContainer.removeAttribute('hidden');
		var box = node.contentAreaSizeObject;
		var button;

		var size  = aThis.addButtonSize;

		if (aEvent.isTop) {
			button = aThis.addButtonTop;
			button.targetSubBrowser = node;
			button.width = box.areaWidth;
			button.parentNode.style.top = box.y+'px';
			button.parentNode.style.left = box.areaX+'px';
			button.removeAttribute('hidden');
		}
		else if (aEvent.isBottom) {
			button = aThis.addButtonBottom;
			button.targetSubBrowser = node;
			button.width = box.areaWidth;
			button.parentNode.style.top = (box.y + box.height - size)+'px';
			button.parentNode.style.left = box.areaX+'px';
			button.removeAttribute('hidden');
		}
		else if (aEvent.isLeft) {
			button = aThis.addButtonLeft;
			button.targetSubBrowser = node;
			button.height = box.areaHeight;
			button.parentNode.style.top = box.areaY+'px';
			button.parentNode.style.left = box.x+'px';
			button.removeAttribute('hidden');
		}
		else if (aEvent.isRight) {
			button = aThis.addButtonRight;
			button.targetSubBrowser = node;
			button.height = box.areaHeight;
			button.parentNode.style.top = box.areaY+'px';
			button.parentNode.style.left = (box.x + box.width - size)+'px';
			button.removeAttribute('hidden');
		}

		if (aThis.hideAddButtonTimer)
			aThis.stopDelayedHideAddButtonTimer();
		aThis.delayedHideAddButton();
	},
  
	hideAddButton : function(aEvent) 
	{
		this.stopDelayedHideAddButtonTimer();

		var buttons = this.addButtons;
		for (var i = 0, maxi = buttons.length; i < maxi; i++)
		{
			buttons[i].targetSubBrowser = null;
			buttons[i].setAttribute('hidden', true);
		}
		this.addButtonContainer.setAttribute('hidden', true);

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
		newEvent.targetContainer = browser.container || document.getElementById('appcontent');
		newEvent.targetPosition = SplitBrowser['POSITION_'+aEvent.target.className.replace(/.+ (top|bottom|right|left)$/, '$1').toUpperCase()];
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

			// "window.retrieveURLFromData()" is old implementation
			var url = 'retrieveURLFromData' in window ? retrieveURLFromData(aXferData.data, aXferData.flavour.contentType) : transferUtils.retrieveURLFromData(aXferData.data, aXferData.flavour.contentType) ;
			if (!url || !url.length || url.indexOf(' ', 0) != -1)
				return;

			var sourceDoc = aDragSession.sourceDocument;
			if (sourceDoc) {
				var sourceURI = sourceDoc.documentURI;
				const nsIScriptSecurityManager = Components.interfaces.nsIScriptSecurityManager;
				var secMan = Components.classes['@mozilla.org/scriptsecuritymanager;1'].getService(nsIScriptSecurityManager);
				try {
					secMan.checkLoadURIStr(sourceURI, url, nsIScriptSecurityManager.STANDARD);
				}
				catch(e) {
					aEvent.stopPropagation();
					throw 'Drop of ' + url + ' denied.';
				}
			}

			var newEvent = document.createEvent('Events');
			newEvent.initEvent('SubBrowserAddRequest', false, true);

			var browser   = aEvent.target.targetSubBrowser;
			newEvent.targetSubBrowser = browser;
			newEvent.targetContainer = browser.container || document.getElementById('appcontent');
			newEvent.targetPosition = SplitBrowser['POSITION_'+aEvent.target.className.replace(/.+ (top|bottom|right|left)$/, '$1').toUpperCase()];
			newEvent.targetURI = getShortcutOrURI(url);
			aEvent.target.dispatchEvent(newEvent);

			window.setTimeout('SplitBrowser.hideAddButton();', 0);
		},

		getSupportedFlavours: function ()
		{
			var flavourSet = new FlavourSet();
			flavourSet.appendFlavour('text/x-moz-url');
			flavourSet.appendFlavour('text/unicode');
			flavourSet.appendFlavour('application/x-moz-file', 'nsIFile');
			return flavourSet;
		}
	},
  
/* animation */ 
	
	animationStart : function(aInfo) 
	{
		this.animationStop();
		aInfo.startTime = (new Date()).getTime();
		this.animationInfo = aInfo;
		this.animationTimer = window.setInterval(this.animationCallback, 1);
	},
 
	animationCallback : function() 
	{
		var info = SplitBrowser.animationInfo;
		var now = (new Date()).getTime();

try {
		var progress = Math.max(1, now - info.startTime) / info.timeout;
		info.target.style.border  = '1px solid red !important;';
		if (info.orient == 'horizontal')
			info.target.style.maxWidth  = parseInt((1 - progress) * info.maxW)+'px !important';
		else
			info.target.style.maxHeight = parseInt((1 - progress) * info.maxH)+'px !important';
}
catch(e) {
	//dump(e+'\n');
}
		if (now - info.startTime > info.timeout)
			SplitBrowser.animationStop();
	},
 
	animationStop : function() 
	{
		if (this.animationTimer) {
			window.clearInterval(this.animationTimer);
			if (this.animationInfo)
				this.animationInfo.callback(this.animationInfo);
			this.animationTimer = null;
			this.animationInfo = null;
		}
	},

  
	init : function() 
	{
		document.documentElement.addEventListener('SubBrowserAddRequest', this, false);
		document.documentElement.addEventListener('SubBrowserRemoveRequest', this, false);
		document.documentElement.addEventListener('SubBrowserEnterContentAreaEdge', this, false);
		document.documentElement.addEventListener('SubBrowserExitContentAreaEdge', this, false);

		document.getElementById('contentAreaContextMenu').addEventListener('popupshowing', this, false);

		window.addEventListener('resize', this, false);
		window.addEventListener('unload', this, false);

		window.removeEventListener('load', this, false);

		this.initAddButtons();

		this.insertSeparateTabItem(gBrowser);

		if (nsPreferences.getBoolPref('splitbrowser.state.restore'))
			this.load();
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

		menu.setAttribute('id', 'splitbrowser-tab-context-item-link-'+(aBrowser.id || parseInt(Math.random() * 1000)));
	},
  
	destroy : function() 
	{
		if (nsPreferences.getBoolPref('splitbrowser.state.restore'))
			this.save();

		document.documentElement.removeEventListener('SubBrowserAddRequest', this, false);
		document.documentElement.removeEventListener('SubBrowserRemoveRequest', this, false);
		document.documentElement.removeEventListener('SubBrowserEnterContentAreaEdge', this, false);
		document.documentElement.removeEventListener('SubBrowserExitContentAreaEdge', this, false);

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
		}
	}
 
}; 
  
window.addEventListener('load', SplitBrowser, false); 
 
