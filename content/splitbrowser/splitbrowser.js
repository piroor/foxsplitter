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
 
	get subBrowserAutoFocusDelay() { 
		return nsPreferences.getBoolPref('splitbrowser.subbrowser.autoFocus') ? nsPreferences.getIntPref('splitbrowser.delay.subbrowser.autoFocus') : -1 ;
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
 
	_browsers : [], 
	get browsers() {
		return this._browsers;
	},
	splitters : {},
 
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
		for (var i = 0, maxi = this._browsers.length; i < maxi; i++)
		{
			if (this._browsers[i].browser.docShell == docShell)
				return this._browsers[i];
		}
		return null;
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
		var tabBroadcaster = this.featuresForMultipleTabsBroadcaster;
		var b = SplitBrowser.activeBrowser;
		if (b.localName != 'tabbrowser') b = gBrowser;
		if (b.mTabContainer.childNodes.length > 1)
			tabBroadcaster.removeAttribute('disabled');
		else
			tabBroadcaster.setAttribute('disabled', true);
	},
  
/* add sub-browser (split contents) */ 
	
	addSubBrowser : function(aURI, aBrowser, aPosition) 
	{
		if (!aURI) aURI = 'about:blank';
		if (!aPosition) aPosition = this.POSITION_BOTTOM;

		var appcontent = document.getElementById('appcontent');
		var b = aBrowser || this.getSubBrowserFromFrame(document.commandDispatcher.focusedWindow.top);
		var target = (b && b.parentContainer) ? b.parentContainer : appcontent ;
		var hContainer = target.hContainer;
		var vContainer = target.vContainer;

		var width  = (aPosition & this.POSITION_HORIZONAL) ? parseInt((b || gBrowser).boxObject.width / 5 * 2) : -1 ;
		var height = (aPosition & this.POSITION_VERTICAL) ? parseInt((b || gBrowser).boxObject.height / 5 * 2) : -1 ;

		var refNode = (aPosition & this.POSITION_HORIZONAL) ? (b || this.mainBrowserBox ) : hContainer ;

		var source = (aURI && aURI.split('\n')[0] == 'subbrowser') ? aURI.split('\n')[1].replace(/^id:/, '') : null ;
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
	 
	addSubBrowserFromTab : function(aTab, aPosition, aPositionTarget, aForceRemove) 
	{
		var b = aTab;
		while (b.localName != 'tabbrowser')
		{
			b = b.parentNode;
		}
		if (aTab.localName != 'tab')
			aTab = b.mCurrentTab;

		var uri = this.tabbedBrowsingEnabled ? null : aTab.linkedBrowser.currentURI.spec ;


		var browser = this.addSubBrowser(uri, (aPositionTarget || b.parentSubBrowser || this.mainBrowserBox), aPosition);

		if (this.tabbedBrowsingEnabled)
			window.setTimeout(
				this.duplicateBrowser,
				0,
				aTab.linkedBrowser,
				browser.browser,
				function() {
					if (aForceRemove || nsPreferences.getBoolPref('splitbrowser.tab.closetab'))
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
		if (!nsPreferences.getBoolPref('splitbrowser.show.toolbar.always'))
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
 
	tileTabs : function(aSubBrowser, aAlign) 
	{
		var b    = aSubBrowser.browser;
		var tabs = Array.prototype.slice.call(b.mTabContainer.childNodes);

		var isAfter      = false;
		var isHorizontal = (aAlign != this.TILE_HORIZONTAL);

		var self = this;

		var shouldDoFiltering = ('MultipleTabService' in window) ? MultipleTabService.hasSelection(b) : false ;

		var TBETabGroup = (!shouldDoFiltering && this.tabbedBrowsingEnabled && 'TabbrowserService' in window && b.tabGroupsAvailable);

		if (TBETabGroup)
			tabs = tabs.filter(function(aTab) { return !aTab.parentTab; });

		var horizontalMax   = (aAlign == this.TILE_2D) ? Math.ceil(Math.sqrt(tabs.length)) : -1 ;
		var horizontalCount = 0;

		if (shouldDoFiltering) {
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

			var subbrowser = self.addSubBrowserFromTab(aTab, pos, hPosTarget || vPosTarget, true);
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
					self.duplicateBrowser(aChildTab.linkedBrowser, t.linkedBrowser);
					b.removeTabInternal(aChildTab, { preventUndo : true });
				});
			}
		});
	},
	TILE_2D         : 0,
	TILE_HORIZONTAL : 1,
	TILE_VERTICAL   : 2,
 
	gatherSubBrowsers : function() 
	{
		var self = this;

		var TBETabGroup = (this.tabbedBrowsingEnabled && 'TabbrowserService' in window && gBrowser.tabGroupsAvailable);

		this._browsers.forEach(function(aSubBrowser) {
			var b = aSubBrowser.browser;
			if (TBETabGroup) {
				var tabs = Array.prototype.slice.call(b.mTabContainer.childNodes);

				var t = gBrowser.addTab();
				self.duplicateBrowser(tabs[0].linkedBrowser, t.linkedBrowser);

				tabs.forEach(function(aTab) {
					if (aTab == tabs[0]) return;
					var childT = gBrowser.addTab();
					self.duplicateBrowser(aTab.linkedBrowser, childT.linkedBrowser);
					childT.parentTab = t;
					gBrowser.moveTabToGroupEdge(childT, t);
				});
			}
			else {
				var browsers = b.localName == 'tabbrowser' ? b.browsers : [b] ;
				browsers.forEach(function(aBrowser) {
					var t = gBrowser.addTab();
					self.duplicateBrowser(aBrowser, t.linkedBrowser);
				});
			}
			window.setTimeout(function() {
				aSubBrowser.close();
			}, 0);
		});
	},
 
	activeBrowserOpenTab : function() 
	{
		if (this.activeBrowser == gBrowser)
			BrowserOpenTab();
		else
			this.activeBrowser.openNewTab();
	},
 
	activeBrowserCloseWindow : function() 
	{
		if (this.activeBrowser == gBrowser) {
			if (this._browsers.length)
				gBrowser.removeCurrentTab();
			else
				BrowserCloseWindow();
		}
		else {
			this.activeBrowser.parentSubBrowser.close();
		}
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
 
	activeBrowserPageInfo : function() 
	{
		BrowserPageInfo(this.activeBrowser.contentDocument);
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
  
/* save / load */ 
	
	save : function() 
	{
		var state = this.getContainerState(document.getElementById('appcontent'));
		nsPreferences.setUnicharPref('splitbrowser.state', state.toSource());
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
					type   : 'root',
					width  : gBrowser.boxObject.width,
					height : gBrowser.boxObject.height
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
 
	serializeSubBrowserState : function(aBrowser) { 
		var state = this.serializeBrowserState(aBrowser.browser);

		state.uri         = aBrowser.src;
		state.width       = aBrowser.boxObject.width;
		state.height      = aBrowser.boxObject.height;
		state.collapsed   = aBrowser.contentCollapsed;
		state.toolbarMode = (aBrowser.getAttribute('toolbar-mode') == 'vertical' ? 'vertical' : 'horizontal' );

		return state;
	},
 
	serializeBrowserState : function(aBrowser) { 
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
				if (aBrowserState.toolbarMode)
					browser.setAttribute('toolbar-mode', aBrowserState.toolbarMode);

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
		aData.children.forEach(function(aChild, aIndex) {
			entry.AddChild(SplitBrowser.deserializeSessionHistoryEntry(aChild), aIndex);
		});

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

		var box = node.contentAreaSizeObject;
		if (!box) return;

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
try{
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
}
catch(e) {
	alert(e);
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
			markupDocumentViewer.textZoom = aZoom / 100;
		});
	},
  
	init : function() 
	{
		document.documentElement.addEventListener('SubBrowserAddRequest', this, true);
		document.documentElement.addEventListener('SubBrowserRemoveRequest', this, true);
		document.documentElement.addEventListener('SubBrowserAdded', this, true);
		document.documentElement.addEventListener('SubBrowserRemoved', this, true);
		document.documentElement.addEventListener('SubBrowserContentCollapsed', this, true);
		document.documentElement.addEventListener('SubBrowserContentExpanded', this, true);
		document.documentElement.addEventListener('SubBrowserEnterContentAreaEdge', this, true);
		document.documentElement.addEventListener('SubBrowserExitContentAreaEdge', this, true);
		document.documentElement.addEventListener('SubBrowserFocusMoved', this, true);

		document.getElementById('contentAreaContextMenu').addEventListener('popupshowing', this, false);

		window.addEventListener('resize', this, false);
		window.addEventListener('fullscreen', this, false);
		window.addEventListener('unload', this, false);

		window.removeEventListener('load', this, false);

		this.updateTabBrowser(gBrowser);

		gBrowser.__splitbrowser__updateCurrentBrowser = gBrowser.updateCurrentBrowser;
		gBrowser.updateCurrentBrowser = this.newUpdateCurrentBrowser;

		if ('contentAreaDNDObserver' in window) {
			contentAreaDNDObserver.__splitbrowser__onDrop = contentAreaDNDObserver.onDrop;
			contentAreaDNDObserver.onDrop = this.contentAreaOnDrop;
			contentAreaDNDObserver.__splitbrowser__getSupportedFlavours = contentAreaDNDObserver.getSupportedFlavours;
			contentAreaDNDObserver.getSupportedFlavours = this.contentAreaGetSupportedFlavours;
		}

		if (this.tabbedBrowsingEnabled) {
			eval('window.nsBrowserAccess.prototype.openURI = '+
				window.nsBrowserAccess.prototype.openURI.toSource().replace(
					/gBrowser/g,
					'SplitBrowser.activeBrowser'
				)
			);
		}

		this.overrideFindBar();
		this.overrideZoomManager();
		this.hackForOtherExtensions();

		if (this.tabbedBrowsingEnabled) {
			window.__splitbrowser__handleLinkClick = window.handleLinkClick;
			window.handleLinkClick = this.contentAreaHandleLinkClick;
		}
		if (nsPreferences.getBoolPref('splitbrowser.tabs.enabled') != this.tabbedBrowsingEnabled)
			nsPreferences.setBoolPref('splitbrowser.tabs.enabled', this.tabbedBrowsingEnabled);

		gBrowser.parentSubBrowser = this.mainBrowserBox;
		this.activeSubBrowser = this.mainBrowserBox;

		try {
			var pbi = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranchInternal);
			pbi.addObserver('splitbrowser', this, false);
		}
		catch(e) {
		}
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.collapseexpand');
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.toolbar.navigation.always');
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.menu');
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.tab.context.split');
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.tab.context.tile');
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.tab.context.tile.horizontal');
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.tab.context.tile.vertical');
		this.observe(window, 'nsPref:changed', 'splitbrowser.show.tab.context.gather');

		if (nsPreferences.getBoolPref('splitbrowser.state.restore')) {
//			this.load();
			window.setTimeout('SplitBrowser.load();', 0);
		}
	},
	 
	updateTabBrowser : function(aBrowser) 
	{
		if (aBrowser.localName != 'tabbrowser') return;

		var id = aBrowser.id || parseInt(Math.random() * 65000) ;

		var fragment = document.createDocumentFragment();
		fragment.appendChild(document.getElementById('splitbrowser-tab-context-item-split-template').cloneNode(true));
		fragment.appendChild(document.getElementById('splitbrowser-tab-context-separator-tile-template').cloneNode(true));
		fragment.appendChild(document.getElementById('splitbrowser-tab-context-item-tile-template').cloneNode(true));
		fragment.appendChild(document.getElementById('splitbrowser-tab-context-item-tile-horizontal-template').cloneNode(true));
		fragment.appendChild(document.getElementById('splitbrowser-tab-context-item-tile-vertical-template').cloneNode(true));
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
	},
 
	destroyTabBrowser : function(aBrowser) 
	{
		if (aBrowser.localName != 'tabbrowser') return;

		var tabContext = document.getAnonymousElementByAttribute(aBrowser, 'anonid', 'tabContextMenu');
		tabContext.removeEventListener('popupshowing', this, false);
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
 
	contentAreaOnDrop : function(aEvent, aXferData, aDragSession) 
	{
		var uri = SplitBrowser.getURIFromDragData(aXferData, aDragSession, aEvent);
		if (!uri) return;

		// fallback for Linux
		// in Linux, "dragdrop" event doesn't fire on the button.

		var box = SplitBrowser.mainBrowserBox;

		var forceCheck = aEvent.ctrlKey || aXferData.flavour.contentType == 'application/x-moz-splitbrowser';
		var check = box.checkEventFiredOnEdge(aEvent, forceCheck);
		if (!check) return;

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

		document.documentElement.removeEventListener('SubBrowserAddRequest', this, true);
		document.documentElement.removeEventListener('SubBrowserRemoveRequest', this, true);
		document.documentElement.removeEventListener('SubBrowserAdded', this, true);
		document.documentElement.removeEventListener('SubBrowserRemoved', this, true);
		document.documentElement.removeEventListener('SubBrowserContentCollapsed', this, true);
		document.documentElement.removeEventListener('SubBrowserContentExpanded', this, true);
		document.documentElement.removeEventListener('SubBrowserEnterContentAreaEdge', this, true);
		document.documentElement.removeEventListener('SubBrowserExitContentAreaEdge', this, true);
		document.documentElement.removeEventListener('SubBrowserFocusMoved', this, true);

		document.getElementById('contentAreaContextMenu').removeEventListener('popupshowing', this, false);

		window.removeEventListener('resize', this, false);
		window.removeEventListener('fullscreen', this, false);
		window.removeEventListener('unload', this, false);

		this.destroyTabBrowser(gBrowser);

		try {
			var pbi = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranchInternal);
			pbi.removeObserver('splitbrowser', this);
		}
		catch(e) {
		}

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
				this.destroyTabBrowser((aEvent.originalTarget || aEvent.target).browser);
				this.removeSubBrowser(aEvent.originalTarget || aEvent.target);
				break;

			case 'SubBrowserAdded':
				this.updateTabBrowser((aEvent.originalTarget || aEvent.target).browser);
			case 'SubBrowserRemoved':
			case 'SubBrowserContentCollapsed':
			case 'SubBrowserContentExpanded':
				this.updateStatus();
				break;

			case 'SubBrowserEnterContentAreaEdge':
				this.showAddButton(aEvent);
				break;

			case 'SubBrowserExitContentAreaEdge':
//				this.hideAddButton(aEvent);
				this.delayedHideAddButton();
				break;

			case 'SubBrowserFocusMoved':
				this.updateFindBar(aEvent);
				break;

			case 'resize':
				window.setTimeout('SplitBrowser.hideAddButton();', 0);
				break;

			case 'fullscreen':
				window.setTimeout('SplitBrowser.toggleFullScreen();', 0);
				break;

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
				break;
		}
	},
	toggleFullScreen : function()
	{
		if (window.fullScreen)
			document.documentElement.setAttribute('splitbrowser-fullscreen', true);
		else
			document.documentElement.removeAttribute('splitbrowser-fullscreen');
	},
 
	observe : function(aSubject, aTopic, aPrefstring) 
	{
		if (aTopic != 'nsPref:changed') return;

		switch (aPrefstring)
		{
			case 'splitbrowser.show.collapseexpand':
				if (nsPreferences.getBoolPref(aPrefstring))
					document.documentElement.setAttribute('subbrowser-show-togglecollapsed-button', true);
				else
					document.documentElement.removeAttribute('subbrowser-show-togglecollapsed-button');
				break;

			case 'splitbrowser.show.toolbar.always':
				this.splitters.forEach(
					nsPreferences.getBoolPref(aPrefstring) ?
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
				var visible = !nsPreferences.getBoolPref(aPrefstring);
				this.splitters.forEach(function(aBrowser) {
					if (aBrowser.browser.mTabContainer.childNodes.length == 1)
						aBrowser.browser.setStripVisibilityTo(visible);
				});
				break;

			case 'splitbrowser.show.toolbar.navigation.always':
				this._browsers.forEach(
					nsPreferences.getBoolPref(aPrefstring) ?
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
			case 'splitbrowser.show.tab.context.split':
			case 'splitbrowser.show.tab.context.tile':
			case 'splitbrowser.show.tab.context.tile.horizontal':
			case 'splitbrowser.show.tab.context.tile.vertical':
			case 'splitbrowser.show.tab.context.gather':
				var attrName = aPrefstring.replace(/\./g, '-');
				if (nsPreferences.getBoolPref(aPrefstring))
					document.documentElement.setAttribute(attrName, true);
				else
					document.documentElement.removeAttribute(attrName);
				break;
		}
	}
 
}; 
  
window.addEventListener('load', SplitBrowser, false); 
 
