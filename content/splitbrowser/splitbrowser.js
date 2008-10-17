var SplitBrowser = { 
	 
	get scrollbarSize() { 
		return this.getPref('splitbrowser.appearance.scrollbar.size');
	},
 
	get subBrowserToolbarShowDelay() { 
		return this.getPref('splitbrowser.delay.subbrowser.toolbar.show');
	},
	get subBrowserToolbarHideDelay() {
		return this.getPref('splitbrowser.delay.subbrowser.toolbar.hide');
	},
 
	get subBrowserAutoFocusDelay() { 
		return this.getPref('splitbrowser.subbrowser.autoFocus') ? this.getPref('splitbrowser.delay.subbrowser.autoFocus') : -1 ;
	},
 
	get shouldMoveSplitTab() { 
		return this.getPref('splitbrowser.tab.closetab');
	},
 	
	get isLinux() 
	{
		return (navigator.platform.indexOf('Linux') > -1);
	},
 
	get isMac() 
	{
		return (navigator.platform.toLowerCase().indexOf('mac') > -1);
	},
	
	isAccelKeyPressed : function(aEvent) 
	{
		return this.isMac ? aEvent.metaKey : aEvent.ctrlKey ;
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
	POSITION_TAB    : 16,

	POSITION_HORIZONAL : 3,
	POSITION_VERTICAL  : 12,

	POSITION_BEFORE : 5,
	POSITION_AFTER  : 10,
 
	_browsers : [], 
	get browsers() {
		return this._browsers;
	},
	splitters : {},
 
	NSResolver : { 
		lookupNamespaceURI : function(aPrefix)
		{
			switch (aPrefix)
			{
				case 'xul':
					return 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
				case 'html':
				case 'xhtml':
					return 'http://www.w3.org/1999/xhtml';
				case 'xlink':
					return 'http://www.w3.org/1999/xlink';
				default:
					return '';
			}
		}
	},
 
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
 
	getSubBrowserByName : function(aName) 
	{
		if (aName == '_top')
			return this.mainBrowserBox;
		else if (!aName)
			return null;

		for (var i in this._browsers)
		{
			if (this._browsers[i].name == aName)
				return this._browsers[i];
		}

		return null;
	},
 
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
		var docShell = (aFrame.top || aFrame)
			.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
			.getInterface(Components.interfaces.nsIWebNavigation)
			.QueryInterface(Components.interfaces.nsIDocShell);
		for (var i = 0, maxi = this._browsers.length; i < maxi; i++)
		{
			if (this._browsers[i].browser.docShell == docShell)
				return this._browsers[i];
		}
		return null;
	},
 
	getTabFromFrame : function(aFrame) 
	{
		var b = this.getSubBrowserFromFrame(aFrame);
		if (b)
			b = b.browser
		if (!b || b.localName != 'tabbrowser')
			b = gBrowser;

		var tabs = b.mTabContainer.childNodes;

		var docShell = (aFrame.top || aFrame)
			.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
			.getInterface(Components.interfaces.nsIWebNavigation)
			.QueryInterface(Components.interfaces.nsIDocShell);
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			if (tabs[i].linkedBrowser.docShell == docShell)
				return tabs[i];
		}
		return null;
	},
 
	getTabFromBrowser : function(aBrowser) 
	{
		var b = this.getTabBrowserFromChild(aBrowser);
		var tabs = b.mTabContainer.childNodes;
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			if (tabs[i].linkedBrowser == aBrowser)
				return tabs[i];
		}
		return null;
	},
 
	getTabBrowserFromChild : function(aNode) 
	{
		if (!aNode) return null;
		return aNode.ownerDocument.evaluate(
				'ancestor-or-self::*[local-name()="tabbrowser"]',
				aNode,
				null,
				XPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue;
	},
 
	getTabFromChild : function(aNode) 
	{
		if (!aNode) return null;
		return aNode.ownerDocument.evaluate(
				'ancestor-or-self::*[local-name()="tab" and ancestor::*[local-name()="tabbrowser"]]',
				aNode,
				null,
				XPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue;
	},
 
	getSubBrowserFromChild : function(aNode) 
	{
		if (!aNode) return null;
		return aNode.ownerDocument.evaluate(
				'ancestor-or-self::*[local-name()="subbrowser"]',
				aNode,
				null,
				XPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue;
	},
 
	getSubBrowserAndBrowserFromFrame : function(aFrame) 
	{
		var docShell = aFrame.top
			.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
			.getInterface(Components.interfaces.nsIWebNavigation)
			.QueryInterface(Components.interfaces.nsIDocShell);

		for (var i = 0, maxi = this._browsers.length; i < maxi; i++)
		{
			if (this._browsers[i].browser.localName == 'tabbrowser') {
				for (var j = 0, maxj = this._browsers[i].browser.browsers.length; j < maxj; j++)
				{
					if (this._browsers[i].browser.browsers[j].docShell == docShell)
						return {
							subBrowser : this._browsers[i],
							browser    : this._browsers[i].browser.browsers[j]
						};
				}
			}
			else if (this._browsers[i].browser.docShell == docShell) {
				return {
					subBrowser : this._browsers[i],
					browser    : this._browsers[i].browser
				};
			}
		}

		for (var j = 0, maxj = gBrowser.browsers.length; j < maxj; j++)
		{
			if (gBrowser.browsers[j].docShell == docShell)
				return {
					subBrowser : null,
					browser    : gBrowser.browsers[j]
				};
		}

		return {
			subBrowser : null,
			browser    : null
		};
	},
 
	get activeSubBrowser() 
	{
		return this._mFocusedSubBrowser;
	},
	set activeSubBrowser(val)
	{
		var old = this.activeSubBrowser;
		try {
			if (old && old != val && old.focused) old.focused = false;
		}
		catch(e) {
		}
		this._mFocusedSubBrowser = val || this.mainBrowserBox;
		this.activeSubBrowser.focused = true;


		var newEvent = document.createEvent('Events');
		newEvent.initEvent('SubBrowserFocusMoved', false, true);
		newEvent.lastFocused = old;
		document.documentElement.dispatchEvent(newEvent);

		return val;
	},
	_mFocusedSubBrowser : null,
	
	get activeBrowser() 
	{
		var b = this.activeSubBrowser;
		return b && b.browser ? b.browser : gBrowser ;
	},
  
	updateStatus : function() 
	{
		if (this.updateStatusTimer) {
			window.clearTimeout(this.updateStatusTimer);
			this.updateStatusTimer = null;
		}
		this.updateStatusTimer = window.setTimeout('SplitBrowser.updateStatusCallback();', 1);
	},
	
	updateStatusCallback : function() 
	{
		if (!this._browsers.length) {
			document.documentElement.removeAttribute('splitbrowser-split');
			this.featuresForSplitBrowsersBroadcaster.setAttribute('disabled', true);
			this.collapseAllBroadcaster.setAttribute('disabled', true);
			this.expandAllBroadcaster.setAttribute('disabled', true);
		}
		else {
			document.documentElement.setAttribute('splitbrowser-split', true);
			this.featuresForSplitBrowsersBroadcaster.removeAttribute('disabled');

			var collapsed = 0;
			var expanded  = 0;
			for (var i = 0, maxi = this._browsers.length; i < maxi; i++)
			{
				if (this._browsers[i].contentCollapsed)
					collapsed++;
				else
					expanded++;

				if (collapsed && expanded) break;
			}
			if (collapsed)
				this.expandAllBroadcaster.removeAttribute('disabled');
			else
				this.expandAllBroadcaster.setAttribute('disabled', true);

			if (expanded)
				this.collapseAllBroadcaster.removeAttribute('disabled');
			else
				this.collapseAllBroadcaster.setAttribute('disabled', true);
		}

		this.updateStatusTimer = null;
	},
 
	get featuresForSplitBrowsersBroadcaster() 
	{
		return document.getElementById('splitbrowser-featuresForSplitBrowsers-broadcaster');
	},
 
	get collapseAllBroadcaster() 
	{
		return document.getElementById('splitbrowser-collapseAll-broadcaster');
	},
 
	get expandAllBroadcaster() 
	{
		return document.getElementById('splitbrowser-expandAll-broadcaster');
	},
 
	get featuresForMultipleTabsBroadcaster() 
	{
		return document.getElementById('splitbrowser-featuresForMultipleTabs-broadcaster');
	},
  
	updateMenu : function(aPopup) 
	{
		this.updateMultipleTabsState();

		var syncScroll = document.getElementById('splitbrowser-syncScroll-broadcaster');
		if (this.mainBrowserBox.syncScroll)
			syncScroll.setAttribute('checked', true);
		else
			syncScroll.removeAttribute('checked');
	},
 
	updateMultipleTabsState : function() 
	{
		var tabBroadcaster = this.featuresForMultipleTabsBroadcaster;
		var b = SplitBrowser.activeBrowser;
		if (b.localName != 'tabbrowser') b = gBrowser;
		if (b.mTabContainer.childNodes.length > 1)
			tabBroadcaster.removeAttribute('disabled');
		else
			tabBroadcaster.setAttribute('disabled', true);
	},
 
	fireSubBrowserAddRequestEventFromFrame : function(aFrame, aBrowser, aPosition, aEventTarget, aCopy) 
	{
		var tab = this.getTabFromFrame(aFrame);
		var uri = aFrame.top.location.href;
		var subBrowser = aBrowser || this.getSubBrowserFromFrame(aFrame) || this.mainBrowserBox;
		var browser = subBrowser.browser;
		if (browser.localName == 'tabbrowser')
			browser = browser.getBrowserForTab(browser.selectedTab);

		var newEvent = document.createEvent('Events');
		newEvent.initEvent('SubBrowserAddRequest', false, true);

		var appcontent = document.getElementById('appcontent');

		newEvent.targetSubBrowser = subBrowser;
		newEvent.targetContainer  = subBrowser.parentContainer || appcontent;
		newEvent.targetPosition   = aPosition;
		newEvent.targetURI        = null;
		newEvent.sourceBrowser    = browser;
		newEvent.sourceTab        = tab;
		newEvent.isCopy           = aCopy;
		(aEventTarget || appcontent).dispatchEvent(newEvent);
	},
 
	fireSubBrowserAddRequestEvent : function(aURI, aBrowser, aPosition, aEventTarget) 
	{
		var newEvent = document.createEvent('Events');
		newEvent.initEvent('SubBrowserAddRequest', false, true);

		var appcontent = document.getElementById('appcontent');

		if (!aBrowser)
			aBrowser = this.mainBrowserBox;

		newEvent.targetSubBrowser = aBrowser;
		newEvent.targetContainer  = aBrowser.parentContainer || appcontent;
		newEvent.targetPosition   = aPosition;
		newEvent.targetURI        = aURI;
		(aEventTarget || appcontent).dispatchEvent(newEvent);
	},
 
	fieldNormalClicks : function(aName) 
	{
		return /^(search)$/.test(aName);
	},
 
	isEventFromKeyboardShortcut : function(aEvent) 
	{
		if (!aEvent) return false;
		if (aEvent.type == 'command') aEvent = aEvent.sourceEvent;
		if (!aEvent) return false;
		return (aEvent.type.indexOf('key') == 0 || aEvent.originalTarget.localName == 'key');
	},
 
	isEventFiredOnTabBar : function(aEvent, aTabBrowser) 
	{
		if (!aTabBrowser || aTabBrowser.localName != 'tabbrowser') return false;
		var box = aTabBrowser.mTabContainer;
		return (
			box.screenX <= aEvent.screenX &&
			box.screenX + box.width >= aEvent.screenX &&
			box.screenY <= aEvent.screenY &&
			box.screenY + box.height >= aEvent.screenY
			);
	},
  
/* add sub-browser (split contents) */ 
	
	addSubBrowser : function(aURI, aBrowser, aPosition, aName) 
	{
		if (!aURI) aURI = 'about:blank';
		if (!aPosition) aPosition = this.POSITION_BOTTOM;

		var appcontent = document.getElementById('appcontent');
		var b = aBrowser || this.getSubBrowserFromFrame(document.commandDispatcher.focusedWindow.top);
		var target = (b && b.parentContainer) ? b.parentContainer : appcontent ;
		var hContainer = target.hContainer;
		var vContainer = target.vContainer;

		var box = b ? b.boxObject : null ;
		if (!box) box = gBrowser.boxObject;

		var width  = (aPosition & this.POSITION_HORIZONAL) ? parseInt(box.width / 5 * 2) : -1 ;
		var height = (aPosition & this.POSITION_VERTICAL) ? parseInt(box.height / 5 * 2) : -1 ;

		var refNode = (aPosition & this.POSITION_HORIZONAL) ? (b || this.mainBrowserBox ) : hContainer ;

		var data = null;
		if (aURI && aURI.indexOf('subbrowser\n') == 0) {
			try {
				eval('data = '+aURI.replace('subbrowser\n', ''));
			}
			catch(e) {
			}
		}

		var sourceSubBrowser = null;
		if (data) {
			sourceSubBrowser = SplitBrowser.getSubBrowserById(data.id);
			if (!sourceSubBrowser) {
				aURI = data.uri;
			}
			else {
				aURI   = null;
				if (aPosition & this.POSITION_HORIZONAL && sourceSubBrowser.parentOrient == 'horizontal')
					width = data.width;
				if (aPosition & this.POSITION_VERTICAL && sourceSubBrowser.parentOrient == 'vertical')
					height = data.height;
			}
		}

		var browser = this.createSubBrowser(aURI);
		if (aName) browser.setAttribute('name', aName);

		var container = this.addContainerTo(target, aPosition, refNode, width, height, browser);

		if (sourceSubBrowser) {
			browser.syncScroll = sourceSubBrowser.syncScroll;
			browser.name = sourceSubBrowser.name + (data.clone ? '-clone'+parseInt(Math.random() * 65000) : '' );
			window.setTimeout(
				(data.clone ? this.cloneBrowser : this.swapBrowser ),
				0,
				sourceSubBrowser.browser,
				browser.browser,
				(data.clone ? null : function() { sourceSubBrowser.close(); } )
			);
		}

		return browser;
	},
	
	addSubBrowserFromTab : function(aTab, aPosition, aPositionTarget, aCopy) 
	{
		var b = this.getTabBrowserFromChild(aTab);
		if (aTab.localName != 'tab')
			aTab = b.selectedTab;

		var uri = this.tabbedBrowsingEnabled ? null : aTab.linkedBrowser.currentURI.spec ;

		var browser = this.addSubBrowser(uri, (aPositionTarget || b.parentSubBrowser || this.mainBrowserBox), aPosition);

		window.setTimeout(
			(aCopy ? this.cloneBrowser : this.swapBrowser ),
			0,
			aTab.linkedBrowser,
			browser.browser,
			(aCopy ? null : function() { if (aTab.parentNode) b.removeTab(aTab); } )
		);

		return browser;
	},
	
	cloneBrowser : function(aSource, aTarget, aCallback) 
	{
		var state = SplitBrowser.serializeBrowserState(aSource);
		SplitBrowser.deserializeBrowserState(aTarget, state, aCallback);
	},
 
	swapBrowser : function(aSource, aTarget, aCallback) 
	{
		if (aTarget.localName == 'tabbrowser' && aSource.localName == 'browser')
			aTarget = aTarget.selectedTab.linkedBrowser;

		if (
			aSource.localName != aTarget.localName ||
			!('swapDocShells' in (aSource.localName == 'tabbrowser' ? aSource.selectedTab.linkedBrowser : aSource)) ||
			!SplitBrowser.getTabBrowserFromChild(aTarget)
			) {
			SplitBrowser.cloneBrowser(aSource, aTarget, aCallback);
			return;
		}
		if (aSource.localName == 'tabbrowser') {
			var sourceTabs = aSource.mTabContainer;
			var targetTabs = aTarget.mTabContainer;
			while (sourceTabs.childNodes.length > targetTabs.childNodes.length)
			{
				aTarget.addTab();
			}
			while (sourceTabs.childNodes.length < targetTabs.childNodes.length)
			{
				aTarget.removeTab(targetTabs.lastChild);
			}
			targetTabs = Array.slice(targetTabs.childNodes);
			Array.slice(sourceTabs.childNodes).forEach(function(aSourceTab, aIndex) {
				SplitBrowser.swapOneBrowser(aSourceTab.linkedBrowser, targetTabs[aIndex].linkedBrowser);
			});
		}
		else {
			SplitBrowser.swapOneBrowser(aSource, aTarget);
		}
		if (aCallback) aCallback();
	},
	swapOneBrowser : function(aSource, aTarget)
	{
		var sourceTab = this.getTabFromBrowser(aSource);
		var targetTab = this.getTabFromBrowser(aTarget);
		var sourceTabBrowser = this.getTabBrowserFromChild(sourceTab);
		var targetTabBrowser = this.getTabBrowserFromChild(targetTab);

		if (
			sourceTabBrowser.mTabContainer.childNodes.length == 1 &&
			(
				(
					sourceTabBrowser.parentSubBrowser &&
					sourceTabBrowser.parentSubBrowser.updateToolbarForCurrentTab
				) ||
				sourceTabBrowser.ownerDocument.defaultView.SplitBrowser.browsers.length
			)
			)
			sourceTabBrowser.addTab();

		targetTab.linkedBrowser.stop();
		targetTab.linkedBrowser.docShell;
		targetTabBrowser.swapBrowsersAndCloseOther(targetTab, sourceTab);
		targetTabBrowser.setTabTitle(targetTab);

		if (targetTab.selected &&
			targetTabBrowser.parentSubBrowser &&
			targetTabBrowser.parentSubBrowser.updateToolbarForCurrentTab)
			targetTabBrowser.parentSubBrowser.updateToolbarForCurrentTab(true);
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
		container.setAttribute('splitter', ((aPosition & this.POSITION_AFTER) ? 'before' : 'after' ));

		switch (aPosition)
		{
			case this.POSITION_LEFT:
				if (!aRefNode || aRefNode.parentNode != hContainer)
					aRefNode = hContainer.firstChild;
				if (aContent) {
					aRefNode.setAttribute('width', aRefNode.boxObject.width - aWidth);
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
					aRefNode.setAttribute('width', aRefNode.boxObject.width - aWidth);
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
					aRefNode.setAttribute('height', aRefNode.boxObject.height - aHeight);
					aContent.setAttribute('height', aHeight);
				}
				vContainer.insertBefore(container, aRefNode);
				vContainer.insertBefore(splitter, aRefNode);
				break;

			case this.POSITION_BOTTOM:
				if (!aRefNode || aRefNode.parentNode != vContainer)
					aRefNode = vContainer.lastChild;
				if (aContent) {
					aRefNode.setAttribute('height', aRefNode.boxObject.height - aHeight);
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
		if (aURI && aURI != 'about:blank')
			browser.setAttribute('src', aURI);

		browser.setAttribute('browsertype', this.tabbedBrowsingEnabled ? 'tabbrowser' : 'simple' );
		browser.setAttribute('id', 'splitbrowser-subbrowser-'+parseInt(Math.random() * 65000));

		this._browsers.push(browser);

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
		splitter.setAttribute('class', 'subbrowser-splitter');
		splitter.setAttribute('state', 'open');
		splitter.setAttribute('orient', ((aPosition & this.POSITION_HORIZONAL) ? 'horizontal' : 'vertical' ));

		splitter.setAttribute('_collapse', ((aPosition & this.POSITION_AFTER) ? 'after' : 'before' ));
		if (!this.getPref('splitbrowser.show.toolbar.always'))
			splitter.setAttribute('collapse', splitter.getAttribute('_collapse'));

		var prop = (aPosition & this.POSITION_HORIZONAL) ? 'width' : 'height' ;
		splitter.setAttribute('onmousedown', 'SplitBrowser.updateSplitterSideBoxes(event, "'+prop+'");');
		splitter.setAttribute('onmouseup', 'SplitBrowser.updateSplitterSideBoxes(event, "'+prop+'");');

//		splitter.appendChild(document.createElement('grippy'));

		var id = 'splitbrowser-splitter-'+parseInt(Math.random() * 65000);
		splitter.setAttribute('id', id);
		this.splitters[id] = splitter;

		return splitter;
	},
  
/* remove sub-browser (unsplit) */ 
	
	removeSubBrowser : function(aBrowser) 
	{
		var c = aBrowser.flexibleParent;
		if (c &&
			(c.nextSibling ? c.nextSibling.nextSibling : c.previousSibling.previousSibling).contentCollapsed) {
			var splitter = c.nextSibling || c.previousSibling;
			var orient  = (splitter.getAttribute('orient') != 'vertical' ? 'horizontal' : 'vertical' );
			aBrowser.clearMaxSizeProp(c.nextSibling ? c.nextSibling.nextSibling : c.previousSibling.previousSibling, orient == 'horizontal' ? 'width' : 'height' );
		}


//dump('SubBrowserRemoveRequest\n');
		var appcontent = document.getElementById('appcontent');
		var browser   = aBrowser;
		var container = browser.parentContainer || appcontent;

		for (var i = 0, maxi = this._browsers.length; i < maxi; i++)
		{
			if (this._browsers[i] == browser) {
				this._browsers.splice(i, 1);
				break;
			}
		}

		browser.destroy();
		browser.parentNode.removeChild(browser);

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
					if (box) {
						box.height = box.boxObject.height + cont.boxObject.height;
						box.removeAttribute('collapsed');
					}
					this.removeSplitter(cont.previousSibling);
				}
				else if (cont.nextSibling &&
					cont.nextSibling.localName == 'splitter') {
					box = cont.nextSibling.nextSibling;
					if (box) {
						box.height = box.boxObject.height + cont.boxObject.height;
						box.removeAttribute('collapsed');
					}
					this.removeSplitter(cont.nextSibling);
				}
				container.vContainer.removeChild(cont);
				container.hContainer = null;
			}
			else {
				this.cleanUpSplitters(cont);
			}
		}

		var cont = container.vContainer;
		if (!cont.hasChildNodes()) {
			var box;
			if (container.previousSibling && container.previousSibling.localName == 'splitter') {
				box = container.previousSibling.previousSibling;
				if (box) {
					box.width = box.boxObject.width + container.boxObject.width;
					box.removeAttribute('collapsed');
				}
				this.removeSplitter(container.previousSibling);
			}
			else if (container.nextSibling && container.nextSibling.localName == 'splitter') {
				box = container.nextSibling.nextSibling;
				if (box) {
					box.width = box.boxObject.width + container.boxObject.width;
					box.removeAttribute('collapsed');
				}
				this.removeSplitter(container.nextSibling);
			}
			container.parentNode.removeChild(container);
		}
		else {
			this.cleanUpSplitters(cont);
		}

		if (parentContainer) {
			this.cleanUpContainer(parentContainer);
		}
	},
	cleanUpSplitters : function(aContainer)
	{
		if (aContainer.childNodes.length % 2 != 0) return;

		if (aContainer.firstChild.localName == 'splitter') {
			this.removeSplitter(aContainer.firstChild);
		}
		else if (aContainer.lastChild.localName == 'splitter') {
			this.removeSplitter(aContainer.lastChild);
		}
		else {
			for (var i = 0, maxi = aContainer.childNodes.length-1; i < maxi; i++)
			{
				if (aContainer.childNodes[i].localName == 'splitter' &&
					aContainer.childNodes[i+1].localName == 'splitter') {
					this.removeSplitter(aContainer.childNodes[i]);
					break;
				}
			}
		}
	},
	removeSplitter : function(aSplitter)
	{
		delete this.splitters[aSplitter.getAttribute('id')];
		aSplitter.parentNode.removeChild(aSplitter);
	},
  
	removeAllSubBrowsers : function() 
	{
		for (var i = this._browsers.length-1; i > -1; i--)
		{
			this.removeSubBrowser(this._browsers[i]);
		}
	},
  
/* features */ 
	
	collapseAllSubBrowsers : function() 
	{
		this._browsers.forEach(function(aBrowser) {
			if (!aBrowser.contentCollapsed)
				aBrowser.collapse();
		});
	},
 
	expandAllSubBrowsers : function() 
	{
		this._browsers.forEach(function(aBrowser) {
			if (aBrowser.contentCollapsed)
				aBrowser.expand(true);
		});
	},
 
	layoutTabs : function(aSubBrowser, aStyle) 
	{
		var b    = aSubBrowser.browser;
		var tabs = Array.prototype.slice.call(b.mTabContainer.childNodes);

		var isAfter      = false;
		var isHorizontal = (aStyle == this.LAYOUT_ON_X_AXIS);

		var self = this;

		var shouldDoFiltering = ('MultipleTabService' in window) ? MultipleTabService.hasSelection(b) : false ;

		var TBETabGroup = (!shouldDoFiltering && this.tabbedBrowsingEnabled && 'TabbrowserService' in window && b.tabGroupsAvailable);

		if (TBETabGroup)
			tabs = tabs.filter(function(aTab) { return !aTab.parentTab; });

		var horizontalMax   = (aStyle == this.LAYOUT_GRID) ? Math.ceil(Math.sqrt(tabs.length)) : -1 ;
		var horizontalCount = 0;

		if (shouldDoFiltering && horizontalMax > 0) {
			horizontalMax = Math.ceil(Math.sqrt(
				tabs.filter(function(aTab) { return MultipleTabService.isSelected(aTab); }).length
			));
		}

		var vPosTarget      = null;
		var lastSubBrowser  = null;

		tabs.forEach(function(aTab) {
			/*
				通常、現在のタブは平面に展開しない。
				ただし、フィルタリングを行う（選択されたタブだけを処理する）場合は、現在のタブも展開する。
			*/
			var shouldSplit = shouldDoFiltering ? MultipleTabService.isSelected(aTab) : true ;

			if (aTab == b.selectedTab) {
				isAfter = true;
				horizontalCount++;
				if (!shouldDoFiltering) return;
			}
			if (!shouldSplit) return;

			var pos;
			/*
				今のタブより後のタブを展開する際には、最後に展開した分割ブラウザを基準にする。
				そうでないと、最後に展開した分割ブラウザと現在のブラウザの間に展開されてしまう。
				ただし、これには例外がある。下記<※1>を参照。
			*/
			var hPosTarget = isAfter ? lastSubBrowser : null ;

			if (horizontalMax > 0) { // 平面に自動で並べる場合
				pos = (horizontalCount < horizontalMax) ?
					(isAfter ? self.POSITION_RIGHT : self.POSITION_LEFT ) :
					self.POSITION_BOTTOM;
				if (horizontalCount >= horizontalMax) {
					horizontalCount = 1;
					/*
						<※1>今のタブより後でも、行が変わる時（次のタブを今のブラウザの
						真下に展開しないといけない時）は配置の基準をリセットする。
					*/
					hPosTarget      = null;
				}
				else
					horizontalCount++;
			}
			else { // 水平または垂直に並べる場合
				pos = isAfter ?
					(isHorizontal ? self.POSITION_RIGHT : self.POSITION_BOTTOM) :
					(isHorizontal ? self.POSITION_LEFT : self.POSITION_TOP);
			}

			var children = (TBETabGroup) ? aTab.allChildTabs : null ;

			var subbrowser = self.addSubBrowserFromTab(aTab, pos, (hPosTarget || vPosTarget), false);
			lastSubBrowser = subbrowser;

			if (horizontalMax > 0 && pos == self.POSITION_BOTTOM) {
				/*
					行が変わったので、次のタブを水平に展開する際には、
					この新しい行の分割ブラウザを基準にする。
				*/
				vPosTarget = lastSubBrowser;
			}

			if (TBETabGroup && children && children.length) {
				children.forEach(function(aChildTab) {
					var t = subbrowser.browser.addTab();
					self.swapBrowser(aChildTab.linkedBrowser, t.linkedBrowser);
					b.removeTabInternal(aChildTab, { preventUndo : true });
				});
			}
		});
	},
	LAYOUT_GRID      : 0,
	LAYOUT_ON_X_AXIS : 1,
	LAYOUT_ON_Y_AXIS : 2,
 
	gatherSubBrowsers : function() 
	{
		this._browsers.forEach(function(aSubBrowser) {
			this.addTabsFromSubBrowserInto(aSubBrowser, gBrowser, true);
			window.setTimeout(function() {
				aSubBrowser.close();
			}, 0);
		}, this);
	},
	
	addTabsFromSubBrowserInto : function(aSubBrowser, aTabBrowser, aMove) 
	{
		var newTabs = [];
		var b = aSubBrowser.browser;
		if (this.tabbedBrowsingEnabled && 'TabbrowserService' in window && aTabBrowser.tabGroupsAvailable) {
			var tabs = Array.prototype.slice.call(b.mTabContainer.childNodes);

			var t = aTabBrowser.addTab();
			if (aMove)
				this.swapBrowser(tabs[0].linkedBrowser, t.linkedBrowser);
			else
				this.cloneBrowser(tabs[0].linkedBrowser, t.linkedBrowser);
			newTabs.push(t);

			tabs.forEach(function(aTab) {
				if (aTab == tabs[0]) return;
				var childT = aTabBrowser.addTab();
				if (aMove)
					this.swapBrowser(aTab.linkedBrowser, childT.linkedBrowser);
				else
					this.cloneBrowser(aTab.linkedBrowser, childT.linkedBrowser);
				childT.parentTab = t;
				aTabBrowser.moveTabToGroupEdge(childT, t);
			}, this);
		}
		else {
			var browsers = b.localName == 'tabbrowser' ? Array.slice(b.browsers) : [b] ;
			browsers.forEach(function(aBrowser) {
				var t = aTabBrowser.addTab();
				newTabs.push(t);
				if (aMove)
					this.swapBrowser(aBrowser, t.linkedBrowser);
				else
					this.cloneBrowser(aBrowser, t.linkedBrowser);
			}, this);
		}
		return newTabs;
	},
  
	activeBrowserOpenTab : function() 
	{
		var b = this.activeBrowser;
		if (b == gBrowser)
			BrowserOpenTab();
		else
			b.parentSubBrowser.openNewTab();
	},
 
	activeBrowserCloseWindow : function() 
	{
		var b = this.activeBrowser;
		if (b == gBrowser) {
			if (this._browsers.length)
				gBrowser.removeCurrentTab();
			else
				BrowserCloseWindow();
		}
		else {
			b.parentSubBrowser.close();
		}
	},
 
	activeBrowserCloseTabOrWindow : function() 
	{
		var b = this.activeBrowser;
		if (b == gBrowser) {
			BrowserCloseTabOrWindow();
		}
		else {
			if (b.localName == 'tabbrowser' && b.mTabContainer.childNodes.length > 1)
				b.removeTab(b.selectedTab);
			else
				b.parentSubBrowser.close();
		}
	},
 
	activeBrowserTryToCloseWindow : function() 
	{
		var b = this.activeBrowser;
		if (b == gBrowser) {
			BrowserTryToCloseWindow();
		}
		else {
			b.parentSubBrowser.close();
		}
	},
 
	activeBrowserBack : function(aEvent, aIgnoreAlt) 
	{
		var b = this.activeBrowser;
		if (b == gBrowser) {
			return window.BrowserBack.apply(window, arguments);
		}

		var where = whereToOpenLink(aEvent, false, aIgnoreAlt);
		if (where == 'current') {
			try {
				b.webNavigation.goBack();
			}
			catch(e) {
			}
		}
		else {
			var sessionHistory = b.webNavigation.sessionHistory;
			var currentIndex = sessionHistory.index;
			var entry = sessionHistory.getEntryAtIndex(currentIndex - 1, false);
			var url = entry.URI.spec;
			switch (where)
			{
				case 'tab':
				case 'tabshifted':
					if (b.localName == 'tabbrowser') {
						var loadInBackground = this.getPref('browser.tabs.loadBookmarksInBackground');
						if (where == 'tabshifted') loadInBackground = !loadInBackground;
						var t = b.addTab(url);
						if (!loadInBackground) b.selectedTab = t;
						return;
					}

				default:
					openUILinkIn(url, where);
					return;
			}
		}

		return;
	},
 
	activeBrowserForward : function(aEvent, aIgnoreAlt) 
	{
		var b = this.activeBrowser;
		if (b == gBrowser) {
			return window.BrowserForward.apply(window, arguments);
		}

		var where = whereToOpenLink(aEvent, false, aIgnoreAlt);
		if (where == 'current') {
			try {
				b.webNavigation.goForward();
			}
			catch(e) {
			}
		}
		else {
			var sessionHistory = b.webNavigation.sessionHistory;
			var currentIndex = sessionHistory.index;
			var entry = sessionHistory.getEntryAtIndex(currentIndex + 1, false);
			var url = entry.URI.spec;
			switch (where)
			{
				case 'tab':
				case 'tabshifted':
					if (b.localName == 'tabbrowser') {
						var loadInBackground = this.getPref('browser.tabs.loadBookmarksInBackground');
						if (where == 'tabshifted') loadInBackground = !loadInBackground;
						var t = b.addTab(url);
						if (!loadInBackground) b.selectedTab = t;
						return;
					}

				default:
					openUILinkIn(url, where);
					return;
			}
		}

		return;
	},
 
	activeBrowserStop : function() 
	{
		const nsIWebNavigation = Components.interfaces.nsIWebNavigation;
		this.activeBrowser.webNavigation.stop(nsIWebNavigation.STOP_ALL);
	},
 
	activeBrowserReload : function() 
	{
		const nsIWebNavigation = Components.interfaces.nsIWebNavigation;
		this.activeBrowserReloadWithFlags(nsIWebNavigation.LOAD_FLAGS_NONE);
	},
 
	activeBrowserReloadSkipCache : function() 
	{
		const nsIWebNavigation = Components.interfaces.nsIWebNavigation;
		this.activeBrowserReloadWithFlags(nsIWebNavigation.LOAD_FLAGS_BYPASS_PROXY | nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE);
	},
 
	activeBrowserReloadWithFlags : function(aReloadFlags) 
	{
		var webNav = this.activeBrowser.webNavigation;
		try {
			var sh = webNav.sessionHistory;
			if (sh)
				webNav = sh.QueryInterface(nsIWebNavigation);
		}
		catch (e) {
		}

		try {
			webNav.reload(aReloadFlags);
		}
		catch (e) {
		}
	},
 
	activeBrowserFocusURLBar : function() 
	{
		if (this.activeBrowser &&
			this.activeBrowser.parentSubBrowser &&
			this.activeBrowser.parentSubBrowser.localName == 'subbrowser') {
			var b = this.activeBrowser.parentSubBrowser;
			b.toggleNavigation(true);
			b.urlbar.focus();
		}
		else if (gURLBar) {
			gURLBar.focus();
		}
	},
 
	activeBrowserSelectURLBar : function() 
	{
		if (this.activeBrowser &&
			this.activeBrowser.parentSubBrowser &&
			this.activeBrowser.parentSubBrowser.localName == 'subbrowser') {
			var b = this.activeBrowser.parentSubBrowser;
			b.toggleNavigation(true);
			b.urlbar.select();
		}
		else if (gURLBar) {
			gURLBar.select();
		}
	},
 
	activeBrowserSavePage : function() 
	{
		saveDocument(this.activeBrowser.contentDocument);
	},
 
	activeBrowserViewPageSource : function() 
	{
		BrowserViewSourceOfDocument(this.activeBrowser.contentDocument);
	},
 
	activeBrowserViewPageInfo : function() 
	{
		BrowserPageInfo(this.activeBrowser.contentDocument);
	},
 
	activeBrowserAddBookmarkAs : function() 
	{
		if ('PlacesCommandHook' in window) // Firefox 3
			PlacesCommandHook.bookmarkPage(this.activeBrowser.selectedBrowser, PlacesUtils.bookmarksMenuFolderId, true);
		else // Firefox 2
			addBookmarkAs(this.activeBrowser, false);
	},
 
	activeBrowserBookmarkAllTabs : function() 
	{
		var b = this.activeBrowser;
		if (b.localName != 'tabbrowser') b = gBrowser;
		if ('PlacesUIUtils' in window) { // Firefox 3
			if (b == gBrowser) {
				gBookmarkAllTabsHandler.doCommand();
				return;
			}
			else {
				var done = {};
				PlacesUIUtils.showMinimalAddMultiBookmarkUI(
					Array.prototype.slice.call(b.mTabContainer.childNodes)
						.map(function(aTab) {
							return aTab.linkedBrowser.currentURI;
						})
						.filter(function(aURI) {
							if (aURI.spec in done) return false;
							done[aURI.spec] = true;
							return true;
						})
				);
			}
		}
		else {
			addBookmarkAs(b, true);
		}
	},
  
/* save / load */ 
	
	get SessionStore() { 
		if (!this._SessionStore) {
			this._SessionStore = Components.classes['@mozilla.org/browser/sessionstore;1'].getService(Components.interfaces.nsISessionStore);
		}
		return this._SessionStore;
	},
	_SessionStore : null,
 
	save : function() 
	{
		var state = this.getContainerState(document.getElementById('appcontent'));
		state = state.toSource();
//		this.SessionStore.setWindowValue(window, 'splitbrowser.state', state);
		this.setPref('splitbrowser.state', state);
	},
	
	getContainerState : function(aContainer) 
	{
		var state = {};
		state.children = [];

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
				state.content = this.serializeSubBrowserState(originalContent);
				state.content.type       = 'subbrowser';
				state.content.lastWidth  = aContainer.lastwidth;
				state.content.lastHeight = aContainer.lastheight;
			}
			else if (wrapper && hContainer.childNodes[i] == wrapper) {
				state.content = {
					type       : 'root',
					width      : gBrowser.boxObject.width,
					height     : gBrowser.boxObject.height
				};
			}
			else {
				state.children.push(this.getContainerState(originalContent));
				state.children[state.children.length-1].position = this.POSITION_RIGHT;
				state.children[state.children.length-1].width    = originalContent.boxObject.width;
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
			state.content = this.serializeSubBrowserState(originalContent);
			state.content.type       = 'subbrowser';
			state.content.lastWidth  = aContainer.lastwidth;
			state.content.lastHeight = aContainer.lastheight;
		}
		else if (!state.content) {
			state.children.push(this.getContainerState(originalContent));
			state.children[state.children.length-1].position = this.POSITION_BOTTOM;
			state.children[state.children.length-1].height   = originalContent.boxObject.height;
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
 
	serializeSubBrowserState : function(aBrowser) 
	{
		var state = this.serializeBrowserState(aBrowser.browser);

		state.uri         = aBrowser.src;
		state.width       = aBrowser.boxObject.width;
		state.height      = aBrowser.boxObject.height;
		state.collapsed   = aBrowser.contentCollapsed;
		state.toolbarMode = (aBrowser.getAttribute('toolbar-mode') == 'vertical' ? 'vertical' : 'horizontal' );
		state.syncScroll  = aBrowser.syncScroll;
		state.name        = aBrowser.name;

		return state;
	},
 
	serializeBrowserState : function(aBrowser) 
	{
		var state = {
				textZoom    : [aBrowser.markupDocumentViewer.textZoom],
				histories   : this.serializeBrowserSessionHistories(aBrowser)
			};

		if (aBrowser.localName == 'tabbrowser') {
			var tabs = aBrowser.mTabContainer.childNodes;
			for (var i = 0, maxi = tabs.length; i < maxi; i++)
			{
				state.textZoom[i] = tabs[i].linkedBrowser.markupDocumentViewer.textZoom;
				if (tabs[i] == aBrowser.selectedTab) {
					state.selectedTab = i;
				}
			}
		}

		return state;
	},
 
	// maximal amount of POSTDATA to be stored (in bytes, -1 = all of it) 
	DEFAULT_POSTDATA : 0,
 
	// on which sites to save text data, POSTDATA and cookies 
	// (0 = everywhere, 1 = unencrypted sites, 2 = nowhere) default = 1
	PRIVACY_NONE      : 0,
	PRIVACY_ENCRYPTED : 1,
	PRIVACY_FULL      : 2,
 
	checkPrivacyLevel : function sss_checkPrivacyLevel(aIsHTTPS) 
	{
		return this.getPref('sessionstore.privacy_level', this.PRIVACY_ENCRYPTED) < (aIsHTTPS ? this.PRIVACY_ENCRYPTED : this.PRIVACY_FULL );
	},
 
	serializeBrowserSessionHistories : function(aBrowser) 
	{
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
			for (var i = 0, maxi = SH.count; i < maxi; i++)
			{
				entry = this.serializeHistoryEntry(SH.getEntryAtIndex(i, false));
				if (entry) {
					if (i == SH.index)
						this.storePosition(aBrowser.contentWindow, entry);
					entries.push(entry);
				}
			}

		return {
			entries   : entries,
			index     : (SH ? SH.index : -1 ),
			userInput : this.serializeUserInput(aBrowser.contentWindow)
		};
	},
	 
	storePosition : function(aFrame, aEntry) 
	{
		aEntry.x = aFrame.scrollX;
		aEntry.y = aFrame.scrollY;

		var frames = aFrame.frames;
		if (frames.length && aEntry.children && aEntry.children.length) {
			for (var i = 0, maxi = frames.length; i < maxi; i++)
			{
				if (i in aEntry.children)
					this.storePosition(frames[i], aEntry.children[i]);
			}
		}
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

		if ('cacheKey' in aEntry && aEntry.cacheKey) {
			data.cacheKey = aEntry.cacheKey.QueryInterface(Components.interfaces.nsISupportsPRUint32).data;
		}
		else {
			data.cacheKey = 0;
		}

		// get post data
		try {
			var prefPostdata = this.getPref('sessionstore.postdata', this.DEFAULT_POSTDATA);
			if (prefPostdata && aEntry.postData && this.checkPrivacyLevel(aEntry.URI.schemeIs('https'))) {
				aEntry.postData
						.QueryInterface(Components.interfaces.nsISeekableStream)
						.seek(Components.interfaces.nsISeekableStream.NS_SEEK_SET, 0);
				var stream = Components.classes['@mozilla.org/scriptableinputstream;1']
						.createInstance(Components.interfaces.nsIScriptableInputStream);
				stream.init(aEntry.postData);
				var postdata = stream.read(stream.available());
				if (prefPostdata == -1 || postdata.replace(/^(Content-.*\r\n)+(\r\n)*/, '').length <= prefPostdata) {
					data.postdata = postdata;
				}
			}
		}
		catch (e) {
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
 
	serializeUserInput : function(aFrame) 
	{
		var data = {};

		var isHTTPS = aFrame.location.href.indexOf('https://') == 0;

		if ((aFrame.document.designMode || '') == 'on') {
			if (this.checkPrivacyLevel(isHTTPS))
				data.innerHTML = aFrame.document.body.innerHTML;
		}
		else if (this.checkPrivacyLevel(isHTTPS)) {
			try {
				var xpathResult = aFrame.document.evaluate(
						'descendant::xul:textbox | descendant::*[local-name() = "input" or local-name() = "INPUT" or local-name() = "textarea" or local-name() = "TEXTAREA"]',
						aFrame.document,
						this.NSResolver,
						XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
						null
					);
				if (xpathResult.snapshotLength) {
					var text = [];
					var node;
					for (var i = 0, maxi = xpathResult.snapshotLength; i < maxi; i++)
					{
						node = xpathResult.snapshotItem(i);
						if (node.wrappedJSObject) node = node.wrappedJSObject;
						switchByName:
						switch (node.localName.toLowerCase())
						{
							case 'input':
								if (/^(true|readonly|disabled)$/i.test(node.getAttribute('readonly') || node.getAttribute('disabled') || ''))
										break switchByName;

								switchByType:
								switch ((node.getAttribute('type') || '').toLowerCase())
								{
									case 'checkbox':
										text.push((node.id ? '#id:'+encodeURIComponent(node.id) : '#name:'+encodeURIComponent(node.name) )+'='+(node.checked ? true : false ));
										break switchByName;

									case 'radio':
										if (node.checked )
											text.push('#name:'+encodeURIComponent(node.name)+'='+encodeURIComponent(node.value));
										break switchByName;

									case 'submit':
									case 'reset':
									case 'button':
									case 'image':
										break switchByName;

									default:
										break switchByType;
								}
							case 'textbox':
							case 'textarea':
								if (node.value)
									text.push((node.id ? '#id:'+encodeURIComponent(node.id) : '#name:'+encodeURIComponent(node.name) )+'='+encodeURIComponent(node.value));
								break;

							default:
								break;
						}
					}
					if (text.length)
						data.text = text.join(' ');
				}
			}
			catch(e) {
dump(e+'\n');
			}
		}

		var frames = aFrame.frames;
		if (frames.length) {
			data.children = [];
			for (var i = 0, maxi = frames.length; i < maxi; i++)
			{
				data.children.push(this.serializeUserInput(frames[i]));
			}
		}

		return data;
	},
    
	load : function() 
	{
		var state = /*this.SessionStore.getWindowValue(window, 'splitbrowser.state') ||*/ this.getPref('splitbrowser.state');
//		this.SessionStore.setWindowValue(window, 'splitbrowser.state', '');
		if (!state) return;
		try {
			eval('state = '+state);
		}
		catch(e) {
alert(e+'\n\n'+state);
			return;
		}

		this.buildContent(state, document.getElementById('appcontent'));
	},
	
	buildContent : function(aState, aContainer) 
	{
		var content;
		if (aState.content && aState.content.type) {
			switch (aState.content.type)
			{
				case 'root':
					aContainer.contentWrapper.width  = aState.content.width;
					aContainer.contentWrapper.height = aState.content.height;
					content = aContainer.contentWrapper;
					break;

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

					aContainer.lastwidth  = aState.content.lastWidth;
					aContainer.lastheight = aState.content.lastHeight;
	/*
					if (aState.content.collapsed) {
						if (aState.position & this.POSITION_HORIZONTAL)
							aContainer.setAttribute('maxwidth', 0);
						else
							aContainer.setAttribute('maxheight', 0);
					}
	*/

					if (aState.content.toolbarMode)
						b.setAttribute('toolbar-mode', aState.content.toolbarMode);

					if (aState.content.syncScroll)
						b.setAttribute('sync-scroll', aState.content.syncScroll);
					else
						b.removeAttribute('sync-scroll');

					if (aState.content.name)
						b.setAttribute('name', aState.content.name);
					else
						b.removeAttribute('name');

					content = b;
					break;

				default:
					break;
			}
		}
		if (!content) {
			content = document.createElement('spacer');
			content.setAttribute('flex', 1);
			aContainer.hContainer.appendChild(content);
		}

		var container;
		var spacer = document.createElement('spacer');
		spacer.setAttribute('flex', 1);
		aState.children.forEach(function(aChild) {
			container = SplitBrowser.addContainerTo(
				aContainer,
				aChild.position,
				content,
				aChild.width,
				aChild.height
			);
			if (aChild.collapsed)
				(aChild.position & this.POSITION_BEFORE ? container.nextSibling : container.previousSibling).setAttribute('state', 'collapsed');
			SplitBrowser.buildContent(aChild, container);
		});

		if (content && content.localName == 'spacer') {
			if (content.nextSibling)
				aContainer.hContainer.removeChild(content.nextSibling);
			else if (content.previousSibling)
				aContainer.hContainer.removeChild(content.previousSibling);
			aContainer.hContainer.removeChild(content);
			this.cleanUpContainer(aContainer);
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

		if (aBrowserState.histories) {
			aBrowserState.histories.forEach(function(aHistory, aIndex) {
				if (aIndex) {
					tab     = aBrowser.addTab('about:blank');
					browser = aBrowser.getBrowserForTab(tab);
				}
				SplitBrowser.deserializeSessionHistory(browser, aHistory);

				if (aBrowserState.textZoom[aIndex])
					browser.markupDocumentViewer.textZoom = aBrowserState.textZoom[aIndex];

				if (aBrowser.localName == 'tabbrowser' &&
					aBrowserState.selectedTab == aIndex)
					aBrowser.selectedTab = tab;
			});
		}

		if (aCallback && typeof aCallback == 'function')
			aCallback();
	},
	
	deserializeSessionHistory : function(aBrowser, aData) 
	{
		var SHInternal = aBrowser.sessionHistory.QueryInterface(Components.interfaces.nsISHistoryInternal);
		aData.entries.forEach(function(aEntry) {
			SHInternal.addEntry(SplitBrowser.deserializeSessionHistoryEntry(aEntry), true);
		});

		aBrowser.addEventListener('DOMContentLoaded', function() {
			aBrowser.removeEventListener('DOMContentLoaded', arguments.callee, false);
			SplitBrowser.restorePosition(aBrowser.contentWindow, aData.entries[aData.index]);
			SplitBrowser.deserializeUserInput(aBrowser.contentWindow, aData.userInput);
		}, false);

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
	 
	restorePosition : function(aFrame, aEntry) 
	{
		aFrame.scrollTo(aEntry.x, aEntry.y);

		var frames = aFrame.frames;
		if (frames.length && aEntry.children && aEntry.children.length) {
			for (var i = 0, maxi = frames.length; i < maxi; i++)
			{
				if (i in aEntry.children)
					this.restorePosition(frames[i], aEntry.children[i]);
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

		if ('postdata' in aData && aData.postdata) {
			var stream = Components.classes['@mozilla.org/io/string-input-stream;1']
					.createInstance(Components.interfaces.nsIStringInputStream);
			stream.setData(aEntry.postdata, -1);
			entry.postData = stream;
		}

		if (!aData.children || !aData.children.length) return entry;

		entry = entry.QueryInterface(Components.interfaces.nsISHContainer);
		aData.children.forEach(function(aChild, aIndex) {
			entry.AddChild(SplitBrowser.deserializeSessionHistoryEntry(aChild), aIndex);
		});

		return entry;
	},
 
	deserializeUserInput : function(aFrame, aData) 
	{
		var isHTTPS = aFrame.location.href.indexOf('https://') == 0;

		if (aData.innerHTML) {
			aFrame.document.body.innerHTML = data.innerHTML;
		}
		else if (aData.text) {
			try {
				var xpathResult = aFrame.document.evaluate(
						'descendant::xul:textbox | descendant::*[local-name() = "input" or local-name() = "INPUT" or local-name() = "textarea" or local-name() = "TEXTAREA"]',
						aFrame.document,
						this.NSResolver,
						XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
						null
					);
				if (xpathResult.snapshotLength) {
					var node;
					var pos;
					var data;
					for (var i = 0, maxi = xpathResult.snapshotLength; i < maxi; i++)
					{
						node = xpathResult.snapshotItem(i);
						if (node.wrappedJSObject) node = node.wrappedJSObject;
						switchByName:
						switch (node.localName.toLowerCase())
						{
							case 'input':
								if (/^(true|readonly|disabled)$/i.test(node.getAttribute('readonly') || node.getAttribute('disabled') || ''))
										break switchByName;

								switchByType:
								switch ((node.getAttribute('type') || '').toLowerCase())
								{
									case 'checkbox':
										if (
											(node.id && (pos = aData.text.indexOf('#id:'+encodeURIComponent(node.id)+'=')) > -1) ||
											(node.name && (pos = aData.text.indexOf('#name:'+encodeURIComponent(node.name))) > -1)
											) {
											data = aData.text.substring(pos);
											if ((pos = data.indexOf(' ')) > -1)
												data = data.substring(data.indexOf('=')+1, pos);
											else
												data = data.substring(data.indexOf('=')+1, data.length);
											node.checked = (data == 'true');
										}
										break switchByName;

									case 'radio':
										if (
											(node.name && (pos = aData.text.indexOf('#name:'+encodeURIComponent(node.name)+'='+encodeURIComponent(node.value))) > -1)
											) {
											if ((pos = aData.text.indexOf(' ')) > -1)
												data = data.substring(data.indexOf('=')+1, pos);
											else
												data = data.substring(data.indexOf('=')+1, data.length);
											if (decodeURIComponent(data) == node.value)
												node.checked = true;
											else
												node.checked = false;
										}
										else
											node.checked = false;
										break switchByName;

									case 'submit':
									case 'reset':
									case 'button':
									case 'image':
										break switchByName;

									default:
										break switchByType;
								}

							case 'textbox':
							case 'textarea':
								if (
									(node.id && (pos = aData.text.indexOf('#id:'+encodeURIComponent(node.id)+'=')) > -1) ||
									(node.name && (pos = aData.text.indexOf('#name:'+encodeURIComponent(node.name)+'=')) > -1)
									) {
									data = aData.text.substring(pos);
									if ((pos = data.indexOf(' ')) > -1)
										data = data.substring(data.indexOf('=')+1, pos);
									else
										data = data.substring(data.indexOf('=')+1, data.length);
									node.value = decodeURIComponent(data);
								}
								break;

							default:
								break;
						}
					}
				}
			}
			catch(e) {
			}
		}

		var frames = aFrame.frames;
		if (frames.length && aData.children && aData.children.length) {
			for (var i = 0, maxi = frames.length; i < maxi; i++)
			{
				if (i in aData.children)
					this.deserializeUserInput(frames[i], aData.children[i]);
			}
		}
	},
     
/* popup-buttons */ 
	addButtonIsShown : false,
	
	get addButton() { 
		return document.getElementById(
				this.addButtonUsePanel ?
					'splitbrowser-add-button-in-panel' :
					'splitbrowser-add-button'
			);
	},
 
	get addButtonSize() { 
		return this.getPref('splitbrowser.appearance.addbuttons.size');
	},
	get addButtonAreaSize() {
		return this.getPref('splitbrowser.appearance.addbuttons.area');
	},
	get addButtonShowDelay() {
		return this.getPref('splitbrowser.delay.addbuttons.show');
	},
	get addButtonHideDelay() {
		return this.getPref('splitbrowser.delay.addbuttons.hide');
	},
	get addButtonFadeDelay() {
		return this.getPref('splitbrowser.delay.addbuttons.fade');
	},
 
	showAddButton : function(aEvent, aJustNow) 
	{
		if (this.addButtonIsShown) {
			if (this.hideAddButtonTimer)
				this.stopDelayedHideAddButtonTimer();
			this.delayedHideAddButton();
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

		this.addButtonIsShown = true;

		this.hideAddButton(null, true);

		var box = node.contentAreaSizeObject;
		if (!box) return;

		var button = this.addButton;
		this.setButtonSizeAndPosition(aEvent);
		button.targetSubBrowser = node;

		this.showHideAddButton(true, aJustNow);

		this.addButtonIsShown = true;

		if (this.hideAddButtonTimer)
			this.stopDelayedHideAddButtonTimer();
		this.delayedHideAddButton();
	},
	
	delayedShowAddButton : function(aEvent) 
	{
		if (this.showAddButtonTimer) {
			this.showAddButtonTimer = null;
			window.clearTimeout(this.showAddButtonTimer);
		}

		var button = this.addButton;
		if (
			this.addButtonIsShown &&
			(
				(button.buttonPos == 'top' && !aEvent.isTop) ||
				(button.buttonPos == 'bottom' && !aEvent.isBottom) ||
				(button.buttonPos == 'left' && !aEvent.isLeft) ||
				(button.buttonPos == 'right' && !aEvent.isRight) ||
				(button.targetSubBrowser != aEvent.targetSubBrowser)
			)
			) {
			this.hideAddButton();
		}

		if (aEvent.firedBy.indexOf('drag') == 0) {
			this.showAddButton(aEvent, true);
		}
		else if (aEvent.modifierKeyPressed) {
			this.showAddButton(aEvent);
		}
		else {
			this.showAddButtonTimer = window.setTimeout(this.delayedShowAddButtonCallback, this.addButtonShowDelay, this, aEvent);
		}
	},
	 
	delayedShowAddButtonCallback : function(aThis, aEvent) 
	{
		aThis.showAddButton(aEvent);
	},
   
	hideAddButton : function(aEvent, aJustNow) 
	{
		this.stopDelayedHideAddButtonTimer();
		if (!this.addButtonIsShown) return;

		var button = this.addButton;
		this.showHideAddButton(false, aJustNow);
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
   
	showHideAddButton : function(aShow, aJustNow) 
	{
		var button = this.addButton;
		if (button.showHideAddButtonTimer) {
			window.clearInterval(button.showHideAddButtonTimer);
			button.showHideAddButtonTimer = null;
		}
		if (aJustNow) {
			this.showHideAddButtonInternal(aShow);
			button.style.opacity = 1;
			this.addButtonIsActive = aShow;
			this.addButtonIsShown = aShow;
		}
		else {
			this.addButtonIsActive = false;
			this.initAddButtonAnimation(aShow);
			this.showHideAddButtonInternal(true);
			button.showHideAddButtonTimer = window.setInterval(this.showHideAddButtonCallback, 10, this, aShow);
		}
	},
	
	showHideAddButtonCallback : function(aSelf, aShow) 
	{
		var button = aSelf.addButton;
		var delta = new Date().getTime() - button.showHideAddButtonStart;
		if (delta >= aSelf.addButtonFadeDelay) {
			button.style.opacity = aShow ? 1 : 0 ;
			aSelf.showHideAddButtonInternal(aShow);
			window.clearInterval(button.showHideAddButtonTimer);
			button.showHideAddButtonTimer = null;
			aSelf.addButtonIsActive = aShow;
			aSelf.addButtonIsShown = aShow;
		}
		else {
			button.showHideAddButtonCurrent = delta / aSelf.addButtonFadeDelay;
			button.style.opacity = Math.floor((aShow ? button.showHideAddButtonCurrent : 1-button.showHideAddButtonCurrent ) * 100) / 100;
		}
	},
  
	onAddButtonCommand : function(aEvent) 
	{
		var browser = aEvent.target.targetSubBrowser;
		this.fireSubBrowserAddRequestEventFromFrame(browser.contentWindow, null, this['POSITION_'+aEvent.target.buttonPos.toUpperCase()], aEvent.target);
		SplitBrowser.hideAddButton(aEvent, true);
		window.setTimeout('SplitBrowser.hideAddButton(null, true)', 0);
	},
 
	addButtonDNDObserver : { 
		onDragOver : function() {},

		onDrop: function(aEvent, aXferData, aDragSession)
		{
			aEvent.preventDefault();
			aEvent.preventBubble();

			var uri = SplitBrowser.getURIFromDragData(aXferData, aDragSession, aEvent);
			if (!uri) return;

			var tab = SplitBrowser.getTabFromChild(aDragSession.sourceNode);
			var tabbrowser = SplitBrowser.getTabBrowserFromChild(tab);
			if (!tabbrowser) tab = null;

			SplitBrowser.fireSubBrowserAddRequestEventFromButton(
				tab || uri,
				SplitBrowser.isAccelKeyPressed(aEvent)
			);
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
 
/* for Firefox versions */ 
	
	get addButtonUsePanel() { 
		return 'openPopupAtScreen' in document.getElementById('splitbrowser-add-button-panel');
	},
 
	showHideAddButtonInternal : function(aShow) 
	{
		var button = this.addButton;
		button.parentNode.hidden = button.hidden = !aShow;
		if (!this.addButtonUsePanel) return;

		if (aShow) {
			var box = document.documentElement.boxObject;
			button.parentNode.openPopupAtScreen(
				button.parentNode.nextX + box.screenX,
				button.parentNode.nextY + box.screenY,
				false
			);
		}
		else {
			button.parentNode.hidePopup();
		}
	},
 
	setButtonSizeAndPosition : function(aEvent) 
	{
		var node   = aEvent.targetSubBrowser;
		var box    = node.contentAreaSizeObject;
		var button = this.addButton;

		var size = button.width = button.height = this.addButtonSize;
		button.style.width = button.style.height = size+'px';

		var x, y;
		var pos;
		if (aEvent.isTop) {
			pos = 'top';
			button.style.width = (button.width = box.areaWidth)+'px';
			x = box.areaX;
			y = box.y;
		}
		else if (aEvent.isBottom) {
			pos = 'bottom';
			button.style.width = (button.width = box.areaWidth)+'px';
			x = box.areaX;
			y = box.y + box.height - size;
		}
		else if (aEvent.isLeft) {
			pos = 'left';
			button.style.height = (button.height = box.areaHeight)+'px';
			x = box.x;
			y = box.areaY;
		}
		else if (aEvent.isRight) {
			pos = 'right';
			button.style.height = (button.height = box.areaHeight)+'px';
			x = box.x + box.width - size;
			y = box.areaY;
		}
		if (this.addButtonUsePanel) {
			button.parentNode.nextX = x;
			button.parentNode.nextY = y;
		}
		else {
			button.parentNode.style.top = y+'px';
			button.parentNode.style.left = x+'px';
		}

		var canvas = button.previousSibling;
		if (canvas) {
			button.canvasX = x;
			button.canvasY = y;
			canvas.width = button.width;
			canvas.height = button.height;
			canvas.style.width = button.style.width;
			canvas.style.height = button.style.height;
		}

		button.className = 'splitbrowser-add-button '+pos;
		button.buttonPos = pos;
		button.setAttribute('tooltiptext', button.getAttribute('tooltiptext-'+pos));
	},
 
	initAddButtonAnimation : function(aShow) 
	{
		var button = this.addButton;
		button.parentNode.hidden = button.hidden = aShow;
		button.showHideAddButtonCurrent = button.style.opacity = aShow ? 0 : 1 ;
		button.showHideAddButtonStart = new Date().getTime();
		if (!this.addButtonUsePanel)
			this.updateAddButtonBackground();
		button.parentNode.hidden = button.hidden = false;
	},
	 
	updateAddButtonBackground : function() 
	{
		var button = this.addButton;
		var canvas = button.previousSibling;

		var node   = button.targetSubBrowser;
		try {
			var context = canvas.getContext('2d');
			var w = node.browser.contentWindow;
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.save();
			var bBox = (node.browser.mCurrentBrowser || node.browser).boxObject;
			context.drawWindow(w, button.canvasX - bBox.x + w.scrollX, button.canvasY - bBox.y + w.scrollY, canvas.width, canvas.height, "rgb(255,255,255)");
			context.restore();
		}
		catch(e) {
		}
	},
    
/* drag-and-drop */ 
	
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
 
	getURIFromDragData : function(aXferData, aDragSession, aEvent) 
	{
		var uri = null;
try{
		if (aXferData.flavour.contentType == 'application/x-moz-splitbrowser') {
			uri = aXferData.data;
			if (this.isAccelKeyPressed(aEvent)) {
				try {
					var info;
					eval('info = '+uri.replace('subbrowser\n', ''));
					info.clone = true;
					uri = 'subbrowser\n'+info.toSource();
				}
				catch(e) {
				}
			}
		}
		else {
			// "window.retrieveURLFromData()" is old implementation
			uri = 'retrieveURLFromData' in window ? retrieveURLFromData(aXferData.data, aXferData.flavour.contentType) : transferUtils.retrieveURLFromData(aXferData.data, aXferData.flavour.contentType) ;

			if (!uri || !uri.length || uri.indexOf(' ', 0) != -1)
				return null;

			var sourceDoc = aDragSession.sourceDocument;
			if (sourceDoc &&
				sourceDoc.documentURI.indexOf('chrome://') < 0) {
				var sourceURI = sourceDoc.documentURI;
				const nsIScriptSecurityManager = Components.interfaces.nsIScriptSecurityManager;
				var secMan = Components.classes['@mozilla.org/scriptsecuritymanager;1'].getService(nsIScriptSecurityManager);
				try {
					secMan.checkLoadURIStr(sourceURI, uri, nsIScriptSecurityManager.STANDARD);
				}
				catch(e) {
					aEvent.stopPropagation();
					throw sourceURI+'\nDrop of ' + uri + ' denied.';
				}
			}

			uri = getShortcutOrURI(uri);
		}
}
catch(e) {
	alert(e);
}

		return uri;
	},
 
	fireSubBrowserAddRequestEventFromButton : function(aTabOrURI, aDuplicate) 
	{
		var button = this.addButton;
		var browser = button.targetSubBrowser || this.mainBrowserBox;
		var position = SplitBrowser['POSITION_'+button.buttonPos.toUpperCase()];
		if (typeof aTabOrURI == 'string') {
			this.fireSubBrowserAddRequestEvent(
				aTabOrURI,
				browser,
				position,
				button
			);
		}
		else {
			this.fireSubBrowserAddRequestEventFromFrame(
				aTabOrURI.linkedBrowser.contentWindow,
				browser,
				position,
				button,
				aDuplicate
			);
		}
	},
 
	performDropOnTabBrowser : function(aArgs, aTabBrowser) 
	{
		if (!aTabBrowser || aTabBrowser.localName != 'tabbrowser') return false;

		aArgs = Array.slice(aArgs);
		if (!aArgs.length) return false;
		var event = aArgs[0];

		var dragSession;
		if (aArgs.length == 1) { // Firefox 3.1 or later
			dragSession = Components
						.classes['@mozilla.org/widget/dragservice;1']
						.getService(Components.interfaces.nsIDragService)
						.getCurrentSession();
		}
		else { // Firefox 2.0.0.x or 3.0.x
			dragSession = aArgs[2];
		}
		if (!dragSession) return false;

		var isCopy = this.isAccelKeyPressed(event);

		var oldTab = this.getTabFromChild(dragSession.sourceNode);
		if (oldTab &&  'treeStyleTab' in aTabBrowser) return false;

		var oldTabBrowser = this.getTabBrowserFromChild(oldTab);
		if (oldTab &&
			oldTabBrowser != aTabBrowser) {
			var oldTabs = this.getDraggedTabs(oldTab);
			var isCloseAll = !isCopy && (oldTabBrowser.mTabContainer.childNodes.length == oldTabs.length);
			var newTabs = [];
			oldTabs.forEach(function(aTab) {
				var t = aTabBrowser.addTab();
				newTabs.push(t);
				if (isCopy)
					this.cloneBrowser(aTab.linkedBrowser, t.linkedBrowser);
				else
					this.swapBrowser(aTab.linkedBrowser, t.linkedBrowser);
			}, this);
			aTabBrowser.selectedTab = newTabs[0];
			this.selectNewTabsAfterDrop(newTabs, oldTabBrowser);
			if (!isCopy) {
				this.closeOldTabsAfterDrop(oldTabs, oldTabBrowser, isCloseAll);
			}
			return true;
		}

		var draggedSubBrowser = this.getSubBrowserFromChild(dragSession.sourceNode);
		if (draggedSubBrowser) {
			var tabs = this.addTabsFromSubBrowserInto(draggedSubBrowser, aTabBrowser, !isCopy);
			if (tabs.length < 1) return false;
			aTabBrowser.selectedTab = tabs[0];
			this.selectNewTabsAfterDrop(tabs, draggedSubBrowser);
			if (!isCopy) {
				window.setTimeout(function() {
					draggedSubBrowser.close();
				}, 0);
			}
			return true;
		}

		return false;
	},
 
	performDropOnContentArea : function(aArgs) 
	{
		var event = aArgs[0];
		var xferData = aArgs[1];
		var dragSession = aArgs[2];

		var uri = this.getURIFromDragData(xferData, dragSession, event);
		if (!uri) return true;

		// fallback for Linux
		// in Linux, "dragdrop" event doesn't fire on the button.

		var box = this.mainBrowserBox;

		var forceCheck = event.ctrlKey || xferData.flavour.contentType == 'application/x-moz-splitbrowser';
		var check = box.checkEventFiredOnEdge(event, forceCheck);
		if (!check) return true;

		if (xferData.flavour.contentType == 'application/x-moz-splitbrowser' &&
			this.isEventFiredOnTabBar(event)) {
			return;
		}

		if (
			(forceCheck || this.isLinux) &&
			this.addButton.targetSubBrowser == box &&
			(
				check.isTop ||
				check.isBottom ||
				check.isLeft ||
				check.isRight
			)
			) {
			this.fireSubBrowserAddRequestEventFromButton(uri, this.isAccelKeyPressed(event));
			event.preventDefault();
			event.preventBubble();
			return true;
		}

		return false;
	},
 
	getDraggedTabs : function(aNode)
	{
		var single = [aNode];
		var b = this.getTabBrowserFromChild(aNode);
		if (!b) return single;

		var tabs;

		if ('MultipleTabService' in window &&
			'getSelectedTabs' in MultipleTabService) {
			tabs = MultipleTabService.getSelectedTabs(b);
			if (tabs.length) return tabs;
		}

		if ('TreeStyleTabService' in window) {
			tabs = TreeStyleTabService.getDescendantTabs(aNode);
			if (tabs.length) return single.concat(tabs);
		}

		return single;
	},
 
	selectNewTabsAfterDrop : function(aTabs, aAnotherTabBrowser) 
	{
		if (
			!('MultipleTabService' in window) ||
			!('clearSelection' in MultipleTabService) ||
			!('setSelection' in MultipleTabService)
			)
			return;

		if (aAnotherTabBrowser) MultipleTabService.clearSelection(aAnotherTabBrowser);
		if (aTabs.length < 2) return;
		MultipleTabService.clearSelection(this.getTabBrowserFromChild(aTabs[0]));
		aTabs.forEach(function(aTab) {
			MultipleTabService.setSelection(aTab, true);
		});
	},
 
	closeOldTabsAfterDrop : function(aTabs, aTabBrowser, aIsCloseAll) 
	{
		// exclude already closed tabs
		aTabs = aTabs.filter(function(aTab) {
			return aTab.parentNode;
		});
		var b = aTabBrowser;
		if (aTabs.length) {
			b = b || this.getTabBrowserFromChild(aTabs[0]);
			aIsCloseAll = aIsCloseAll || (b.mTabContainer.childNodes.length == aTabs.length);
			if ('MultipleTabService' in window &&
				'closeTabs' in MultipleTabService) {
				MultipleTabService.closeTabs(aTabs);
			}
			else {
				aTabs.reverse().forEach(function(aTab) {
					b.removeTab(aTab);
				}, this);
			}
		}
		if (aIsCloseAll && b) {
			b = this.getSubBrowserFromChild(b);
			if (b) b.close();
		}
	},
  
	/* splitter context menu */ 
	
	getSplitterTarget : function(aSplitter) 
	{
		var node = aSplitter.previousSibling;
		if (node.getAttribute('splitter') == 'after')
			return node;
		else
			return aSplitter.nextSibling;
	},
 
	updateSplitterSideBoxes : function(aEvent, aProp) 
	{
		var splitter = aEvent.originalTarget || aEvent.target;
		this.updateSplitterSideBox(splitter, splitter.previousSibling, aEvent, aProp);
		this.updateSplitterSideBox(splitter, splitter.nextSibling, aEvent, aProp);
	},
	updateSplitterSideBox : function(aSplitter, aNode, aEvent, aProp)
	{
		if (aEvent.type == 'mousedown') {
			aNode.splitterDragging = true;
			if (aNode['last'+aProp] === void(0) || aNode['last'+aProp] < 0) {
				aNode['tempLast'+aProp] = aNode.boxObject[aProp];
			}
			else {
				aNode['tempLast'+aProp] = -1;
			}
			aNode.removeAttribute('max'+aProp);
		}
		else {
			var cCProp = aProp == 'width' ? 'hContentCompletelyCollapsed' : 'vContentCompletelyCollapsed' ;
			if (aNode[cCProp] &&
				aNode['tempLast'+aProp] !== void(0) &&
				aNode['tempLast'+aProp] > -1 &&
				(
					aNode['last'+aProp] === void(0) ||
					aNode['last'+aProp] < 0
				)
				) {
				aNode['last'+aProp] = aNode['tempLast'+aProp];
				aNode.setAttribute('max'+aProp, 0);
			}
			aNode['tempLast'+aProp] = -1;
			window.setTimeout(function() {
				aNode.splitterDragging = false;
			}, 0);
		}

		for (var i = 0, maxi = aNode.childNodes.length; i < maxi; i = i+2)
		{
			this.updateSplitterSideBox(aSplitter, aNode.childNodes[i], aEvent, aProp);
		}
	},
 
	updateSplitterContextMenu : function() 
	{
		var c = this.getSplitterTarget(document.popupNode);
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
  
	/* Web Search in split browser */ 
	
	initSearchBar : function() 
	{
		var search = this.searchbar;
		if (!search || search.splitbrowserInitialized) return;

		var textbox = this.textbox;

		if ('handleSearchCommand' in search) { // Firefox 2 or later
			var funcs = 'doSearch __secondsearch__doSearch'.split(' ');
			var source;
			for (var i in funcs)
			{
				source = search[funcs[i]].toSource();
				if (/^\(?function doSearch\(/.test(source)) {
					if (source.indexOf('openUILinkIn') > -1) { // Firefox 3
					eval(
						'search.'+funcs[i]+' = '+
							source
								.replace(
									'{',
									'$& SplitBrowser.readyToOpenSpecialPane("search");'
								).replace(
									/(\}\)?)$/,
									'SplitBrowser.specialPaneOpened("search"); $1'
								)
					);
					}
					else { // Firefox 2
					eval(
						'search.'+funcs[i]+' = '+
							source
								.replace(
									/(getBrowser\(\)|gBrowser)/g,
									'SplitBrowser.browserForSearch'
								).replace(
									/content.focus\(\)/g,
									'SplitBrowser.browserForSearch.contentWindow.focus()'
								).replace(
									/([^.])loadURI\(([^\),]+), ([^\),]+), ([^\),]+), ([^\),]+)\)/,
									'$1SplitBrowser.browserForSearch.webNavigation.loadURI($2, Components.interfaces.nsIWebNavigation.LOAD_FLAGS_NONE, $3, $4, null)'
								)
					);
					}
					break;
				}
			}
		}
		else if ('onEnginePopupCommand' in textbox && textbox.onEnginePopupCommand.toSource().indexOf('SplitBrowser') < 0) { // Firefox 1.5
			eval(
				'textbox.onEnginePopupCommand = '+
					textbox.onEnginePopupCommand.toSource()
						.replace(
							/([^.])loadURI\(/,
							'$1SplitBrowser.browserForSearch.loadURI('
						)
			);
		}

		search.splitbrowserInitialized = true;
	},
 
	get browserForSearch() 
	{
		if (!this.tabbedBrowsingEnabled) return gBrowser;

		var b;
		switch (this.getPref('splitbrowser.search.loadResultsIn'))
		{
			default:
			case 0:
				b = gBrowser ; // document.getElementById('content') ;
				break;
			case 1:
				b = this.activeBrowser;
				break;
			case 2:
				b = this.getSubBrowserByName('search');
				if (!b) {
					b = this.addSubBrowser('about:blank', null, this.POSITION_RIGHT, 'search');
				}
				b = b.browser;
				break;
		}
		return b;
	},
 
	get searchbar() 
	{
		var bar = document.getElementsByTagName('searchbar');
		return bar && bar.length ? bar[0] : null ;
	},
 
	get textbox() 
	{
		var bar = this.searchbar;
		return bar ? (
				bar._textbox || /* Firefox 2 */
				bar.mTextbox /* Firefox 1.5 */
			) : null ;
	},
  
	/* special panes */ 
	specialPane : null,
	
	readyToOpenSpecialPane : function(aType) 
	{
		this.specialPane = aType;
	},
 
	specialPaneOpened : function(aType) 
	{
		this.specialPane = null;
	},
 
	checkToOpenSpecialPane : function(aURI, aWhere, aAllowThirdPartyFixup, aPostData, aReferrerURI) 
	{
		switch (this.specialPane)
		{
			case 'search':
				var b = this.browserForSearch;
				if (b == gBrowser) return false;

				var loadInBackground = this.getPref('browser.tabs.loadInBackground');
				switch (aWhere)
				{
					default:
						b.webNavigation.loadURI(
							aURI,
							(aAllowThirdPartyFixup ?
								Components.interfaces.nsIWebNavigation.LOAD_FLAGS_ALLOW_THIRD_PARTY_FIXUP :
								Components.interfaces.nsIWebNavigation.LOAD_FLAGS_NONE
							),
							aReferrerURI,
							aPostData,
							null
						);
						break;

					case 'tabshifted':
						loadInBackground = !loadInBackground;
					case 'tab':
						b.loadOneTab(
							aURI,
							aReferrerURI,
							null,
							aPostData,
							loadInBackground,
							aAllowThirdPartyFixup || false
						);
						break;
				}
				b.contentWindow.focus();
				return true;

			default:
				return false;
		}
	},
  
/* Find Bar */ 
	
	overrideFindBar : function() 
	{
		var newGetBrowser = '(SplitBrowser.activeBrowser || getBrowser())';
		var functions = [
				'setCaseSensitivity', // Fx 2.0-
				'toggleCaseSensitivity', // Fx -1.5
				'finishFAYT',
				'delayedCloseFindBar',
				'shouldFastFind',
				'onFindBarBlur',
				'updateFoundLink',
				'find',
				'onFindAgainCmd',
				'onFindPreviousCmd',
				'findNext',
				'findPrevious'
			];
		var base = ('gFindBar' in window) ? gFindBar : window ;
		functions.forEach(function(aFunction) {
			if (base[aFunction])
				eval('base.'+aFunction+' = '+base[aFunction].toSource().replace(/getBrowser\(\)/g, newGetBrowser));
		});
	},
 
	updateFindBar : function(aEvent) 
	{
		var old = aEvent.lastFocused;
		var oldB;
		try {
			oldB = old ? (old.browser ? old.browser : gBrowser ) : null ;
			if (oldB) {
				oldB.fastFind.setSelectionModeAndRepaint(Components.interfaces.nsISelectionController.SELECTION_ON);

				if ('gFindBar' in window)
					gFindBar.highlightDoc(null, null, null, oldB.contentWindow);
				else
					highlightDoc(null, null, null, oldB.contentWindow);
			}
		}
		catch(e) {
		}


		var b = this.activeBrowser;

		var field = document.getElementById('find-field');
		if (field)
			field.value = b.findString;

		var bar = document.getElementById('FindToolbar');
		if (bar) bar.setAttribute('targetbrowser', b.getAttribute('id'));

/*
		var check = document.getElementById('highlight');
		if (check && check.checked) {
			if ('gFindBar' in window)
				gFindBar.toggleHighlight(true);
			else
				toggleHighlight(true);
		}
*/

		var check = document.getElementById('match-case-status');
		if (check)
			b.fastFind.caseSensitive = check.checked;
	},
  
/* Text Zoom */ 
	
	overrideZoomManager : function() 
	{
/*
		ZoomManager.prototype.__defineGetter__('textZoom', function() {
			var markupDocumentViewer = SplitBrowser.activeBrowser.markupDocumentViewer;
			var currentZoom;
			try {
				currentZoom = Math.round(markupDocumentViewer.textZoom * 100);
				if (this.indexOf(currentZoom) == -1) {
					if (currentZoom != this.factorOther) {
						this.factorOther = currentZoom;
						this.factorAnchor = this.factorOther;
					}
				}
			} catch (e) {
				currentZoom = 100;
			}
			return currentZoom;
		});
		ZoomManager.prototype.__defineSetter__('textZoom', function(aZoom) {
			if (aZoom < this.MIN || aZoom > this.MAX)
				throw Components.results.NS_ERROR_INVALID_ARG;

			var markupDocumentViewer = SplitBrowser.activeBrowser.markupDocumentViewer;
			alert(SplitBrowser.activeBrowser == gBrowser);
			markupDocumentViewer.textZoom = aZoom / 100;
		});
*/

		window.getMarkupDocumentViewer = function() {
			return SplitBrowser.activeBrowser.markupDocumentViewer;
		};
	},
  
	init : function() 
	{
		document.documentElement.addEventListener('SubBrowserAddRequest', this, true);
		document.documentElement.addEventListener('SubBrowserAddRequestFromContent', this, true, true);
		document.documentElement.addEventListener('SubBrowserRemoveRequest', this, true);
		document.documentElement.addEventListener('SubBrowserRemoveRequestFromContent', this, true, true);
		document.documentElement.addEventListener('SubBrowserAdded', this, true);
		document.documentElement.addEventListener('SubBrowserRemoved', this, true);
		document.documentElement.addEventListener('SubBrowserContentCollapsed', this, true);
		document.documentElement.addEventListener('SubBrowserContentExpanded', this, true);
		document.documentElement.addEventListener('SubBrowserEnterContentAreaEdge', this, true);
		document.documentElement.addEventListener('SubBrowserExitContentAreaEdge', this, true);
		document.documentElement.addEventListener('SubBrowserFocusMoved', this, true);
		document.documentElement.addEventListener('TabOpen', this, true);
		document.documentElement.addEventListener('TabClose', this, true);
		document.documentElement.addEventListener('keydown', this, true);
		document.documentElement.addEventListener('keyup', this, true);

		document.getElementById('contentAreaContextMenu').addEventListener('popupshowing', this, false);

		window.addEventListener('resize', this, false);
		window.addEventListener('fullscreen', this, false);
		window.addEventListener('unload', this, false);

		window.removeEventListener('load', this, false);

		this.updateTabBrowser(gBrowser);

		gBrowser.__splitbrowser__updateCurrentBrowser = gBrowser.updateCurrentBrowser;
		gBrowser.updateCurrentBrowser = this.newUpdateCurrentBrowser;

		if ('contentAreaDNDObserver' in window) {
			eval('contentAreaDNDObserver.onDrop = '+contentAreaDNDObserver.onDrop.toSource().replace(
				'{',
				'{ if (SplitBrowser.performDropOnContentArea(arguments)) return;'
			));
			eval('contentAreaDNDObserver.getSupportedFlavours = '+contentAreaDNDObserver.getSupportedFlavours.toSource().replace(
				'flavourSet.appendFlavour(',
				'flavourSet.appendFlavour("application/x-moz-splitbrowser"); $&'
			));
		}


		eval('window.nsBrowserAccess.prototype.openURI = '+
			window.nsBrowserAccess.prototype.openURI.toSource().replace(
				/switch\s*\(aWhere\)/,
				<><![CDATA[
					var pos = aOpener &&
							aOpener.document &&
							aOpener.document.documentElement &&
							(pos = aOpener.document.documentElement.getAttribute('_moz-split-browser-to')) &&
							/^(top|right|bottom|left|tab)$/i.test(pos) ? pos.toUpperCase() : null ;
					if (pos && pos == 'TAB') {
						aWhere = Components.interfaces.nsIBrowserDOMWindow.OPEN_NEWTAB;
					}
					else if (pos) {
						pos = SplitBrowser['POSITION_'+pos];
						var target = null;
						var browsers = SplitBrowser.getSubBrowserAndBrowserFromFrame(aOpener);
						if (browsers.subBrowser)
							target = browsers.subBrowser;

						var referrer = Components.classes['@mozilla.org/network/io-service;1']
								.getService(Components.interfaces.nsIIOService)
								.newURI(aOpener.location, null, null);

						url = url.replace(RegExp.$1, '');
						var subbrowser = SplitBrowser.addSubBrowser(null, target, pos);
						var win = subbrowser.browser.docShell
									.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
									.getInterface(Components.interfaces.nsIDOMWindow);
						try {
							win.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
								.getInterface(Components.interfaces.nsIWebNavigation)
								.loadURI(url, loadflags, referrer, null, null);
						}
						catch(e) {
						}

						return win;
					};

					switch(aWhere)
				]]></>
			)
		);
		eval('window.nsBrowserAccess.prototype.isTabContentWindow = '+
			window.nsBrowserAccess.prototype.isTabContentWindow.toSource().replace(
				'{',
				<><![CDATA[$&
					return SplitBrowser.getSubBrowserAndBrowserFromFrame(aWindow).browser ? true : false ;
				]]></>
			)
		);

		if (this.tabbedBrowsingEnabled) {
			eval('window.nsBrowserAccess.prototype.openURI = '+
				window.nsBrowserAccess.prototype.openURI.toSource().replace(
					/gBrowser/g,
					'SplitBrowser.activeBrowser'
				)
			);
		}

		window.QueryInterface(Components.interfaces.nsIDOMChromeWindow).browserDOMWindow = null;
		window.QueryInterface(Components.interfaces.nsIDOMChromeWindow).browserDOMWindow = new nsBrowserAccess();


		this.initSearchBar();
		var toolbox = document.getElementById('navigator-toolbox');
		if (toolbox.customizeDone) {
			toolbox.__splitbrowser__customizeDone = toolbox.customizeDone;
			toolbox.customizeDone = function(aChanged) {
				this.__splitbrowser__customizeDone(aChanged);
				SplitBrowser.initSearchBar();
			};
		}
		if ('BrowserToolboxCustomizeDone' in window) {
			window.__splitbrowser__BrowserToolboxCustomizeDone = window.BrowserToolboxCustomizeDone;
			window.BrowserToolboxCustomizeDone = function(aChanged) {
				window.__splitbrowser__BrowserToolboxCustomizeDone.apply(window, arguments);
				SplitBrowser.initSearchBar();
			};
		}

		if ('SearchLoadURL' in window) {
			eval('window.SearchLoadURL = '+
				window.SearchLoadURL.toSource().replace(
					/(getBrowser\(\)|gBrowser)/g,
					'SplitBrowser.browserForSearch'
				).replace(
					/content.focus\(\)/g,
					'SplitBrowser.browserForSearch.contentWindow.focus()'
				).replace(
					/([^.])loadURI\(/,
					'$1SplitBrowser.browserForSearch.loadURI('
				)
			);
		}

		// for Firefox 3
		eval('window.openUILinkIn = '+
			window.openUILinkIn.toSource().replace(
				'{',
				<><![CDATA[$&
					if (SplitBrowser.checkToOpenSpecialPane.apply(SplitBrowser, arguments))
						return;
				]]></>
			)
		);

		this.overrideFindBar();
		this.overrideZoomManager();
		this.hackForOtherExtensions();

		if (this.tabbedBrowsingEnabled) {
			window.__splitbrowser__handleLinkClick = window.handleLinkClick;
			window.handleLinkClick = this.contentAreaHandleLinkClick;
		}
		if (this.getPref('splitbrowser.tabs.enabled') != this.tabbedBrowsingEnabled)
			this.setPref('splitbrowser.tabs.enabled', this.tabbedBrowsingEnabled);

		gBrowser.parentSubBrowser = this.mainBrowserBox;
		this.activeSubBrowser = this.mainBrowserBox;

		this.addPrefListener(this);
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.syncScroll');
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.collapseexpand');
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.toolbar.navigation.always');
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.menu');
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.tab.context.split');
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.tab.context.layout.grid');
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.tab.context.layout.x');
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.tab.context.layout.y');
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.tab.context.gather');


		try {
			if (this.Prefs.prefHasUserValue('splitbrowser.show.addbuttons.hover')) {
				this.setPref('splitbrowser.show.addbuttons.hover.type', this.getPref('splitbrowser.show.addbuttons.hover') ? 0 : 1 );
				this.clearPref('splitbrowser.show.addbuttons.hover');
			}
		}
		catch(e) {
		}

		window.setTimeout('SplitBrowser.delayedInit();', 100);

		if (this.getPref('splitbrowser.state.restore')) {
//			this.load();
			window.setTimeout('SplitBrowser.load();', 0);
		}
	},
	
	delayedInit : function() 
	{
		if ('BrowserHandleBackspace' in window) {
			eval('window.BrowserHandleBackspace = '+
				window.BrowserHandleBackspace.toSource().replace(
					/BrowserBack\(/g,
					'SplitBrowser.activeBrowserBack('
				)
			);
		}
		if ('BrowserHandleShiftBackspace' in window) {
			eval('window.BrowserHandleShiftBackspace = '+
				window.BrowserHandleShiftBackspace.toSource().replace(
					/BrowserForward\(/g,
					'SplitBrowser.activeBrowserForward('
				)
			);
		}

		this.updateCommandElement('cmd_newNavigatorTab',
			'SplitBrowser.activeBrowserOpenTab();');
		this.updateCommandElement('cmd_close',
			'SplitBrowser.activeBrowserCloseTabOrWindow();');
		this.updateCommandElement('cmd_closeWindow',
			'SplitBrowser.activeBrowserTryToCloseWindow();');
		this.updateCommandElement('Browser:Back',
			'SplitBrowser.activeBrowserBack();');
		this.updateCommandElement('Browser:Forward',
			'SplitBrowser.activeBrowserForward();');
		this.updateCommandElement('Browser:Reload',
			'if (event.shiftKey) SplitBrowser.activeBrowserReloadSkipCache(); else SplitBrowser.activeBrowserReload();');
		this.updateCommandElement('Browser:ReloadSkipCache',
			'SplitBrowser.activeBrowserReloadSkipCache();');
		this.updateCommandElement('Browser:Stop',
			'SplitBrowser.activeBrowserStop();');
		this.updateCommandElement('Browser:SavePage',
			'SplitBrowser.activeBrowserSavePage();');
		this.updateCommandElement('View:PageSource',
			'SplitBrowser.activeBrowserViewPageSource();');
		this.updateCommandElement('View:PageInfo',
			'SplitBrowser.activeBrowserViewPageInfo();');
		this.updateCommandElement('Browser:AddBookmarkAs',
			'SplitBrowser.activeBrowserAddBookmarkAs();');
		this.updateCommandElement('Browser:BookmarkAllTabs',
			'SplitBrowser.activeBrowserBookmarkAllTabs();');

		var bar = document.getElementById('FindToolbar');
		if (bar && bar.localName == 'findbar') {
			bar.__defineGetter__('browser', function() {
				return SplitBrowser.activeBrowser;
			});
		}
	},
	 
	updateCommandElement : function(aId, aNewFeature) 
	{
		var node = document.getElementById(aId);
		if (node) {
			node.setAttribute('oncommand',
				'if (SplitBrowser.isEventFromKeyboardShortcut(event)) { '+aNewFeature+'; } else { '+node.getAttribute('oncommand')+'; }');
		}
	},
  
	updateTabBrowser : function(aBrowser) 
	{
		if (aBrowser.localName != 'tabbrowser') return;

		var onDropFunc = '_onDrop' in aBrowser ? '_onDrop' : 'onDrop' ;
		if (onDropFunc in aBrowser) {
			eval('aBrowser.'+onDropFunc+' = '+aBrowser[onDropFunc].toSource().replace(
				'{',
				'{ if (SplitBrowser.performDropOnTabBrowser(arguments, this)) return;'
			));
		}
		if ('getSupportedFlavours' in aBrowser) {
			eval('aBrowser.getSupportedFlavours = '+aBrowser.getSupportedFlavours.toSource().replace(
				'flavourSet.appendFlavour(',
				'flavourSet.appendFlavour("application/x-moz-splitbrowser"); $&'
			));
		}
		if ('swapBrowsersAndCloseOther' in aBrowser) {
			eval('aBrowser.swapBrowsersAndCloseOther = '+aBrowser.swapBrowsersAndCloseOther.toSource().replace(
				'{',
				'{ if (this.parentSubBrowser && this.parentSubBrowser.removeProgressListener) { this.parentSubBrowser.removeProgressListener(aOurTab); }'
			).replace(
				'ourBrowser.webProgress.removeProgressListener(',
				'var __splitbrowser__reRegister = false; if (this.mTabFilters.length) { __splitbrowser__reRegister = true; $&'
			).replace(
				'ourBrowser.swapDocShells(',
				'} $&'
			).replace(
				'tabListener = this.mTabProgressListener(',
				'if (__splitbrowser__reRegister) { $&'
			).replace(
				'if (tabCount == 1)',
				'} if (this.parentSubBrowser && this.parentSubBrowser.addProgressListener) { this.parentSubBrowser.addProgressListener(aOurTab); } $&'
			).replace(
				'aOtherTab.ownerDocument.defaultView.getBrowser()',
				'SplitBrowser.getTabBrowserFromChild(aOtherTab)'
			).replace(
				'aOtherTab.ownerDocument.defaultView.close();',
				'var subbrowser = SplitBrowser.getSubBrowserFromChild(aOtherTab); if (subbrowser) { subbrowser.close(); } else if (aOtherTab.ownerDocument.defaultView != window) { $&; }'
			));
		}

		var id = aBrowser.id || parseInt(Math.random() * 65000) ;

		var fragment = document.createDocumentFragment();
		fragment.appendChild(document.getElementById('splitbrowser-tab-context-item-split-template').cloneNode(true));
		fragment.appendChild(document.getElementById('splitbrowser-tab-context-separator-layout-grid-template').cloneNode(true));
		fragment.appendChild(document.getElementById('splitbrowser-tab-context-item-layout-grid-template').cloneNode(true));
		fragment.appendChild(document.getElementById('splitbrowser-tab-context-item-layout-x-template').cloneNode(true));
		fragment.appendChild(document.getElementById('splitbrowser-tab-context-item-layout-y-template').cloneNode(true));
		fragment.appendChild(document.getElementById('splitbrowser-tab-context-item-gather-template').cloneNode(true));

		Array.prototype.slice.call(fragment.childNodes).forEach(function(aNode) {
			aNode.setAttribute('id', aNode.getAttribute('id').replace('template', id));
		});

		var tabContext = document.getAnonymousElementByAttribute(aBrowser, 'anonid', 'tabContextMenu');
		var separator = tabContext.firstChild;
		while (separator.localName != 'menuseparator' && separator)
		{
			separator = separator.nextSibling;
		}
		if (separator)
			tabContext.insertBefore(fragment, separator);
		else
			tabContext.appendChild(fragment);

		tabContext.addEventListener('popupshowing', this, false);
		aBrowser.mTabContainer.addEventListener('select', this, false);
	},
 
	destroyTabBrowser : function(aBrowser) 
	{
		if (aBrowser.localName != 'tabbrowser') return;

		var tabContext = document.getAnonymousElementByAttribute(aBrowser, 'anonid', 'tabContextMenu');
		tabContext.removeEventListener('popupshowing', this, false);
		aBrowser.mTabContainer.removeEventListener('select', this, false);
	},
 
	hackForOtherExtensions : function() 
	{
	},
 
	moveAppContentContents : function(aContent, aDir) 
	{
		// this is a hack, mainly for ScrapBook
		var appcontent = document.getElementById('appcontent');
		var node = appcontent.removeChild(aContent);
		if (aDir > 0)
			appcontent.innerContainer.appendChild(aContent);
		else
			appcontent.innerContainer.insertBefore(aContent, appcontent.innerContainer.firstChild);
	},
 
	newUpdateCurrentBrowser : function(aEvent, aXferData, aDragSession) 
	{
		var result = this.__splitbrowser__updateCurrentBrowser.apply(this, arguments);

		SplitBrowser.mainBrowserBox.focused = SplitBrowser.mainBrowserBox.focused;

		var node = SplitBrowser.activeSubBrowser;
		if (node != SplitBrowser.mainBrowserBox)
			node.focused = node.focused;

		return result;
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

		var docURL = d.location.href;
		if (
			b.localName == 'tabbrowser' &&
			(
				(
					aEvent.button == 0 &&
					aEvent.ctrlKey
				) ||
				(
					aEvent.button == 1 &&
					SplitBrowser.getPref('browser.tabs.opentabfor.middleclick')
				)
			)
			) {
			var loadInBackground = SplitBrowser.getPref('browser.tabs.loadInBackground');
			if (aEvent && aEvent.shiftKey)
				loadInBackground = !loadInBackground;

			if (docURL)
				urlSecurityCheck(aURI, 'nodePrincipal' in d ? d.nodePrincipal : docURL );

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
		if (this.getPref('splitbrowser.state.restore'))
			this.save();

		document.documentElement.removeEventListener('SubBrowserAddRequest', this, true);
		document.documentElement.removeEventListener('SubBrowserAddRequestFromContent', this, true);
		document.documentElement.removeEventListener('SubBrowserRemoveRequest', this, true);
		document.documentElement.removeEventListener('SubBrowserRemoveRequestFromContent', this, true);
		document.documentElement.removeEventListener('SubBrowserAdded', this, true);
		document.documentElement.removeEventListener('SubBrowserRemoved', this, true);
		document.documentElement.removeEventListener('SubBrowserContentCollapsed', this, true);
		document.documentElement.removeEventListener('SubBrowserContentExpanded', this, true);
		document.documentElement.removeEventListener('SubBrowserEnterContentAreaEdge', this, true);
		document.documentElement.removeEventListener('SubBrowserExitContentAreaEdge', this, true);
		document.documentElement.removeEventListener('SubBrowserFocusMoved', this, true);
		document.documentElement.removeEventListener('TabOpen', this, true);
		document.documentElement.removeEventListener('TabClose', this, true);

		document.getElementById('contentAreaContextMenu').removeEventListener('popupshowing', this, false);

		window.removeEventListener('resize', this, false);
		window.removeEventListener('fullscreen', this, false);
		window.removeEventListener('unload', this, false);

		this.destroyTabBrowser(gBrowser);

		this.removePrefListener(this);

		this._browsers.forEach(function(aBrowser) {
			SplitBrowser.destroyTabBrowser(aBrowser.browser);
			aBrowser.destroy();
			aBrowser.parentNode.removeChild(aBrowser);
		});

		delete gBrowser.parentSubBrowser;
	},
 
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'load':
				this.init();
				return;

			case 'unload':
				this.destroy();
				return;


			case 'SubBrowserAddRequest':
				window.setTimeout('SplitBrowser.hideAddButton();', 0);
				if (aEvent.sourceTab) {
					var oldTabs = this.tabbedBrowsingEnabled ? this.getDraggedTabs(aEvent.sourceTab) : [aEvent.sourceTab] ;
					var oldTabBrowser = this.getTabBrowserFromChild(aEvent.sourceTab);
					var isCloseAll = !aEvent.isCopy && (oldTabBrowser.mTabContainer.childNodes.length == oldTabs.length);
					var subbrowser = this.addSubBrowserFromTab(oldTabs[0], aEvent.targetPosition, aEvent.targetSubBrowser, aEvent.isCopy);
					oldTabs.splice(0, 1);
					if (oldTabs.length) {
						var browser = subbrowser.browser;
						oldTabs.forEach(function(aTab) {
							var t = browser.addTab();
							if (aEvent.isCopy)
								this.cloneBrowser(aTab.linkedBrowser, t.linkedBrowser);
							else
								this.swapBrowser(aTab.linkedBrowser, t.linkedBrowser);
						}, this);
					}
					this.selectNewTabsAfterDrop([], oldTabBrowser);
					if (!aEvent.isCopy) {
						window.setTimeout(function(aSelf) {
							aSelf.closeOldTabsAfterDrop(oldTabs, oldTabBrowser, isCloseAll);
						}, 0, this);
					}
				}
				else if (aEvent.sourceBrowser) {
					var subbrowser = this.addSubBrowser(null, aEvent.targetSubBrowser, aEvent.targetPosition);
					window.setTimeout(
						this.cloneBrowser,
						0,
						aEvent.sourceBrowser,
						subbrowser.browser,
						null
					);
				}
				else {
					this.addSubBrowser(aEvent.targetURI, aEvent.targetSubBrowser, aEvent.targetPosition);
				}
				return;

			case 'SubBrowserAddRequestFromContent':
				var cmdEvent = aEvent.sourceEvent;
				if (!cmdEvent ||
					cmdEvent.type.indexOf('SubBrowserAddRequest') != 0)
					return;

				window.setTimeout('SplitBrowser.hideAddButton();', 0);
				var target = aEvent.originalTarget;
				var win = !('nodeType' in target) ? target :
						(target.nodeType == document.DOCUMENT_NODE) ? target.defaultView :
						target.ownerDocument.defaultView;
				var b = this.getSubBrowserAndBrowserFromFrame(win);
				if (!b.browser) return;

				var type = cmdEvent.type;
				var uri = type.match(/ur[li]\s*=\s*([^\&\;]*)/i) ? decodeURIComponent(RegExp.$1) : 'about:blank' ;
				urlSecurityCheck(uri, 'contentPrincipal' in b.browser ? b.browser.contentPrincipal : win.location.href );

				if (!type.match(/pos(ition)?\s*=\s*(top|right|bottom|left|tab)/i)) return;
				var pos = this['POSITION_'+RegExp.$2.toUpperCase()];
				if (pos == this.POSITION_TAB) {
					var browser = (b.browser.localName == 'tabbrowser') ? b.browser : gBrowser ;
					var tab = browser.addTab(uri) ;
					if (!this.getBoolPref('browser.tabs.loadInBackground'))
						browser.selectedTab = tab;
				}
				else {
					this.addSubBrowser(uri, b.subBrowser, pos);
				}
				return;

			case 'SubBrowserRemoveRequest':
				window.setTimeout('SplitBrowser.hideAddButton();', 0);
				this.destroyTabBrowser((aEvent.originalTarget || aEvent.target).browser);
				window.setTimeout(function(aSelf, aSubBrowser) {
					aSelf.removeSubBrowser(aSubBrowser);
				}, 0, this, aEvent.originalTarget || aEvent.target);
				return;

			case 'SubBrowserRemoveRequestFromContent':
				window.setTimeout('SplitBrowser.hideAddButton();', 0);
				var target = aEvent.originalTarget;
				var win = !('nodeType' in target) ? target :
						(target.nodeType == document.DOCUMENT_NODE) ? target.defaultView :
						target.ownerDocument.defaultView;
				var b = this.getSubBrowserAndBrowserFromFrame(win);
				if (b.subBrowser) b.subBrowser.close();
				return;


			case 'SubBrowserAdded':
			case 'SubBrowserRemoved':
			case 'SubBrowserContentCollapsed':
			case 'SubBrowserContentExpanded':
				this.updateStatus();
				return;

			case 'SubBrowserEnterContentAreaEdge':
				this.delayedShowAddButton(aEvent);
				return;

			case 'SubBrowserExitContentAreaEdge':
//				this.hideAddButton(aEvent);
				this.delayedHideAddButton();
				return;

			case 'SubBrowserFocusMoved':
				this.updateFindBar(aEvent);
				this.updateMultipleTabsState();
				return;

			case 'TabOpen':
			case 'TabClose':
				window.setTimeout('SplitBrowser.updateMultipleTabsState();', 0);
				return;

			case 'resize':
				window.setTimeout('SplitBrowser.hideAddButton();', 0);
				return;

			case 'fullscreen':
				window.setTimeout('SplitBrowser.toggleFullScreen();', 0);
				return;

			case 'popupshowing':
				if (aEvent.target.id == 'contentAreaContextMenu') {
					var item = document.getElementById('splitbrowser-context-item-link');
					if (gContextMenu.onLink)
						item.removeAttribute('hidden');
					else
						item.setAttribute('hidden', true);
				}
				else {
					this.updateMenu(aEvent.target);
				}
				return;

			case 'select': // ontabselect
				this.hideAddButton(aEvent, true);
				return;


			case 'keydown':
				if (aEvent.shiftKey ||
					aEvent.keyCode == aEvent.DOM_VK_SHIFT)
					this.modifierKeyPressed = true;
				return;

			case 'keyup':
				this.modifierKeyPressed = false;
				return;
		}
	},
	toggleFullScreen : function()
	{
		if (window.fullScreen)
			document.documentElement.setAttribute('splitbrowser-fullscreen', true);
		else
			document.documentElement.removeAttribute('splitbrowser-fullscreen');
	},
 
	domains : [ 
		'splitbrowser'
	],
 
	observe : function(aSubject, aTopic, aPrefstring) 
	{
		if (aTopic != 'nsPref:changed') return;

		switch (aPrefstring)
		{
			case 'splitbrowser.show.syncScroll':
				if (this.getPref(aPrefstring))
					document.documentElement.setAttribute('subbrowser-show-syncScroll-button', true);
				else
					document.documentElement.removeAttribute('subbrowser-show-syncScroll-button');
				break;

			case 'splitbrowser.show.collapseexpand':
				if (this.getPref(aPrefstring))
					document.documentElement.setAttribute('subbrowser-show-togglecollapsed-button', true);
				else
					document.documentElement.removeAttribute('subbrowser-show-togglecollapsed-button');
				break;

			case 'splitbrowser.show.toolbar.always':
				this.splitters.forEach(
					this.getPref(aPrefstring) ?
						function(aSplitter) {
							aSplitter.removeAttribute('collapse');
						} :
						function(aSplitter) {
							aSplitter.setAttribute('collapse', aSplitter.getAttribute('_collapse'));
						}
				);
				break;

			case 'splitbrowser.tabs.autoHide':
				if (!this.tabbedBrowsingEnabled) return;
				var visible = !this.getPref(aPrefstring);
				this.splitters.forEach(function(aBrowser) {
					if (aBrowser.browser.mTabContainer.childNodes.length == 1)
						aBrowser.browser.setStripVisibilityTo(visible);
				});
				break;

			case 'splitbrowser.show.toolbar.navigation.always':
				this._browsers.forEach(
					this.getPref(aPrefstring) ?
						function(aBrowser) {
							aBrowser.setAttribute('toolbar-navigation', true);
							if (!aBrowser.contentCollapsed)
								aBrowser.toggleToolbar(true, true);
						} :
						function(aBrowser) {
							aBrowser.removeAttribute('toolbar-navigation');
							aBrowser.toggleToolbar(false, true);
						}
				);
				break;

			case 'splitbrowser.show.menu':
				var ids = 'menu,file-remove-all,view-separator,view-collapse-all,view-expand-all'.split(',');
				if (this.getPref(aPrefstring)) {
					document.getElementById('splitbrowser-'+ids[0]).removeAttribute('hidden');
					ids.splice(0, 1);
					ids.forEach(function(aID) {
						document.getElementById('splitbrowser-'+aID).setAttribute('hidden', true);
					});
				}
				else {
					document.getElementById('splitbrowser-'+ids[0]).setAttribute('hidden', true);
					ids.splice(0, 1);
					ids.forEach(function(aID) {
						document.getElementById('splitbrowser-'+aID).removeAttribute('hidden');
					});
				}
				break;

			case 'splitbrowser.show.tab.context.split':
			case 'splitbrowser.show.tab.context.layout.grid':
			case 'splitbrowser.show.tab.context.layout.x':
			case 'splitbrowser.show.tab.context.layout.y':
			case 'splitbrowser.show.tab.context.gather':
				var attrName = aPrefstring.replace(/\./g, '-');
				if (this.getPref(aPrefstring))
					document.documentElement.setAttribute(attrName, true);
				else
					document.documentElement.removeAttribute(attrName);
				break;
		}
	},
 
/* Save/Load Prefs */ 
	
	get Prefs() 
	{
		if (!this._Prefs) {
			this._Prefs = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch);
		}
		return this._Prefs;
	},
	_Prefs : null,
 
	getPref : function(aPrefstring) 
	{
		try {
			switch (this.Prefs.getPrefType(aPrefstring))
			{
				case this.Prefs.PREF_STRING:
					return decodeURIComponent(escape(this.Prefs.getCharPref(aPrefstring)));
					break;
				case this.Prefs.PREF_INT:
					return this.Prefs.getIntPref(aPrefstring);
					break;
				default:
					return this.Prefs.getBoolPref(aPrefstring);
					break;
			}
		}
		catch(e) {
		}

		return null;
	},
 
	setPref : function(aPrefstring, aNewValue) 
	{
		var pref = this.Prefs ;
		var type;
		try {
			type = typeof aNewValue;
		}
		catch(e) {
			type = null;
		}

		switch (type)
		{
			case 'string':
				pref.setCharPref(aPrefstring, unescape(encodeURIComponent(aNewValue)));
				break;
			case 'number':
				pref.setIntPref(aPrefstring, parseInt(aNewValue));
				break;
			default:
				pref.setBoolPref(aPrefstring, aNewValue);
				break;
		}
		return true;
	},
 
	clearPref : function(aPrefstring) 
	{
		try {
			this.Prefs.clearUserPref(aPrefstring);
		}
		catch(e) {
		}

		return;
	},
 
	addPrefListener : function(aObserver) 
	{
		var domains = ('domains' in aObserver) ? aObserver.domains : [aObserver.domain || aObserver.PREFROOT] ;
		try {
			var pbi = this.Prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
			for (var i = 0; i < domains.length; i++)
				pbi.addObserver(domains[i], aObserver, false);
		}
		catch(e) {
		}
	},
 
	removePrefListener : function(aObserver) 
	{
		var domains = ('domains' in aObserver) ? aObserver.domains : [aObserver.domain || aObserver.PREFROOT] ;
		try {
			var pbi = this.Prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
			for (var i = 0; i < domains.length; i++)
				pbi.removeObserver(domains[i], aObserver, false);
		}
		catch(e) {
		}
	}
  
}; 
  
window.addEventListener('load', SplitBrowser, false); 
 
