SplitBrowser.hackForOtherExtensions = function() {

	var appcontent = document.getElementById('appcontent');

	// hack for Multiple Tab Handler
	if ('MultipleTabService' in window &&
		this.tabbedBrowsingEnabled) {
		MultipleTabService.__defineGetter__('browser', function() {
			return SplitBrowser.activeBrowser;
		});
		var initMTS = function(aEvent) {
			MultipleTabService.initTabBrowser(aEvent.originalTarget.browser);
		};
		var destroyMTS = function(aEvent) {
			MultipleTabService.destroyTabBrowser(aEvent.originalTarget.browser);
		};
		appcontent.addEventListener('SubBrowserAdded', initMTS, false);
		appcontent.addEventListener('SubBrowserRemoveRequest', destroyMTS, false);
		window.addEventListener('unload', function() {
			appcontent.removeEventListener('SubBrowserAdded', initMTS, false);
			appcontent.removeEventListener('SubBrowserRemoveRequest', destroyMTS, false);
			window.removeEventListener('unload', arguments.callee, false);
		}, false);
	}

	// hack for Informational Tab
	if ('InformationalTabService' in window &&
		this.tabbedBrowsingEnabled) {
		InformationalTabService.__defineGetter__('browser', function() {
			return SplitBrowser.activeBrowser;
		});
		var initITS = function(aEvent) {
			InformationalTabService.initTabBrowser(aEvent.originalTarget.browser);
		};
		var destroyITS = function(aEvent) {
			InformationalTabService.destroyTabBrowser(aEvent.originalTarget.browser);
		};
		appcontent.addEventListener('SubBrowserAdded', initITS, false);
		appcontent.addEventListener('SubBrowserRemoveRequest', destroyITS, false);
		window.addEventListener('unload', function() {
			appcontent.removeEventListener('SubBrowserAdded', initITS, false);
			appcontent.removeEventListener('SubBrowserRemoveRequest', destroyITS, false);
			window.removeEventListener('unload', arguments.callee, false);
		}, false);
	}

	// hack for ScrapBook
	var scrapBookToolbox;
	if (scrapBookToolbox = document.getElementById('ScrapBookToolbox')) {
		this.moveAppContentContents(scrapBookToolbox, 1);
	}

	// hack for FireBug
	var fbSplitter;
	if (fbSplitter = document.getElementById('fbContentSplitter')) {
		this.moveAppContentContents(fbSplitter, 1);
		this.moveAppContentContents(document.getElementById('fbContentBox'), 1);
/*
		var getTabBrowser = function() {
			return window.__splitbrowser_firebug__lastBrowser || SplitBrowser.activeBrowser ;
		};

		window.__defineGetter__('tabBrowser', getTabBrowser);
		window.__defineSetter__('tabBrowser', getTabBrowser);
		Firebug.__defineGetter__('tabBrowser', getTabBrowser);
		Firebug.__defineSetter__('tabBrowser', getTabBrowser);

		eval(
			'Firebug.toggleBar = '+
			Firebug.toggleBar.toSource().replace(
				'{',
				'{ if (contentBox.collapsed) { window.__splitbrowser_firebug__lastBrowser = SplitBrowser.activeBrowser; } '
			)
		);
		eval(
			'Firebug.showBar = '+
			Firebug.showBar.toSource().replace(
				'{',
				'{ if (contentBox.collapsed) { window.__splitbrowser_firebug__lastBrowser = SplitBrowser.activeBrowser; } '
			)
		);
		var funcs = 'initialize,destroy,activate,deactivate,watchTopWindow,getBrowserByWindow'.split(',');
		funcs.forEach(function(aFunc) {
			eval(
				'TabWatcher.'+aFunc+' = '+
				TabWatcher[aFunc].toSource().replace(
					/tabBrowser/g,
					'window.tabBrowser'
				)
			);
		});
		window.__splitbrowser_firebug__fireBugToggle = function(aEvent) {
			if (aEgent &&
				(aEvent.originalTarget || aEvent.target) != window.__splitbrowser_firebug__lastBrowser)
				return;
			if (!contentBox.collapsed)
				Firebug.toggleBar();
			window.__splitbrowser_firebug__lastBrowser = null;
		};
		document.documentElement.addEventListener('SubBrowserRemoveRequest', __splitbrowser_firebug__fireBugToggle, true);
		window.addEventListener('unload', function() {
			document.documentElement.removeEventListener('SubBrowserRemoveRequest', __splitbrowser_firebug__fireBugToggle, true);
			window.removeEventListener('unload', arguments.callee, false);
		}, false);
*/
		FirebugChrome.initialize();
	}

	// hack for MultiSidebar
	var sidebarTop;
	if (sidebarTop = document.getElementById('sidebar-3-box')) {
		this.moveAppContentContents(document.getElementById('sidebar-3-splitter'), -1);
		this.moveAppContentContents(sidebarTop, -1);
		this.moveAppContentContents(document.getElementById('sidebar-4-splitter'), 1);
		this.moveAppContentContents(document.getElementById('sidebar-4-box'), 1);
	}

	// hack for Grab and Drag
	if ('gadInit' in window) {
		eval(
			'window.gadInit = '+
			window.gadInit.toSource().replace(
				/document\.getElementById\(['"]content['"]\)/g,
				'SplitBrowser.activeBrowser'
			)
		);
		document.documentElement.addEventListener('SubBrowserFocusMoved', gadInit, false);
		window.addEventListener('unload', function() {
			document.documentElement.removeEventListener('SubBrowserFocusMoved', gadInit, false);
			window.removeEventListener('unload', arguments.callee, false);
		}, false);
		gadInit();
	}

	// hack for Google Notebook Extension
	var gnotesBox;
	if (gnotesBox = document.getElementById('gnotes-overlay')) {
		var gnotesReattach = function(aEvent) {
			if (window.getComputedStyle(gnotesBox, '').getPropertyValue('display') != 'block') return;

			var target = (aEvent.originalTarget || aEvent.target);

			var box  = gnotesBox.boxObject;
			var bBox = target.boxObject;
			var forceUpdate = false;

			if (aEvent.type == 'TabClose') {
				var b = target;
				while (b.localName != 'tabbrowser')
					b = b.parentNode;

				var cIndex = -1,
					sIndex = -1,
					tabs = b.mTabContainer.childNodes;
				for (var i = 0, maxi = tabs.length; i < maxi; i++)
				{
					if (tabs[i] == target)
						cIndex = i;
					else if (tabs[i] == b.selectedTab)
						sIndex = i;

					if (cIndex > -1 && sIndex > -1)
						break;
				}

				if (cIndex > sIndex) return;

				bBox = target.linkedBrowser.boxObject;
			}

			if (
				!forceUpdate &&
				(
				box.screenX + box.width < bBox.screenX ||
				box.screenX > bBox.screenX + bBox.width ||
				box.screenY + box.height < bBox.screenY ||
				box.screenY > bBox.screenY + bBox.height
				)
				)
				return;

			gnotesBox.style.display = 'none';
			window.setTimeout(function() {
				gnotesBox.style.display = 'block';
			}, 500);
		};

		document.documentElement.addEventListener('SubBrowserAdded', gnotesReattach, false);
		document.documentElement.addEventListener('SubBrowserTabSelect', gnotesReattach, false);
		document.documentElement.addEventListener('TabClose', gnotesReattach, false);

		window.addEventListener('unload', function() {
			document.documentElement.removeEventListener('SubBrowserAdded', gnotesReattach, false);
			document.documentElement.removeEventListener('SubBrowserTabSelect', gnotesReattach, false);
			document.documentElement.removeEventListener('TabClose', gnotesReattach, false);
			delete gnotesBox;
			window.removeEventListener('unload', arguments.callee, false);
		}, false);
	}

	// hack for Tab Clicking Options
	if ('tabClicking' in window &&
		this.tabbedBrowsingEnabled) {
		var funcs = 'switchCase,onTabClick,onTabBarDblClick,duplicateInTab,closeAllTabs'.split(',');
		funcs.forEach(function(aFunc) {
			eval(
				'tabClicking.'+aFunc+' = '+
				tabClicking[aFunc].toSource().replace(
					/gBrowser|getBrowser\(\)/g,
					'SplitBrowser.activeBrowser'
				).replace(
					/gURLBar.select()/g,
					'SplitBrowser.activeBrowserSelectURLBar()'
				)
			);
		});
		tabClicking.__splitbrowser__selectURLBar = tabClicking.selectURLBar;
		tabClicking.selectURLBar = function() {
			if (SplitBrowser.activeBrowser &&
				SplitBrowser.activeBrowser.parentSubBrowser &&
				SplitBrowser.activeBrowser.parentSubBrowser.localName == 'subbrowser') {
				SplitBrowser.activeBrowserFocusURLBar();
				return;
			}
			return this.__splitbrowser__selectURLBar();
		};
		var initTCO = function(aEvent) {
			var b = aEvent.originalTarget.browser;
			b.onTabClick = tabClicking.onTabClick;
			b.mTabContainer.setAttribute('ondblclick', 'tabClicking.onTabBarDblClick(event);');
		};
		appcontent.addEventListener('SubBrowserAdded', initTCO, false);
		window.addEventListener('unload', function() {
			appcontent.removeEventListener('SubBrowserAdded', initTCO, false);
			window.removeEventListener('unload', arguments.callee, false);
		}, false);
	}

	// hack for All-in-One Gestures
	if ('aioInit' in window) {
		gBrowser.aioTabsNb = gBrowser.mPanelContainer.childNodes.length;

		try {
			aioRendering.removeEventListener('contextmenu', aioContextMenuEnabler, true);
			aioRendering.removeEventListener('mousedown', aioMouseDown, true);
			gBrowser.mTabBox.removeEventListener('select', aioTabFocus, true);
			gBrowser.mTabBox.removeEventListener('load', aioTabLoad, true);
		}
		catch(e) {
		}

		if (this.tabbedBrowsingEnabled) {
			window.__splitbrowser__aioInit = window.aioInit;
			window.aioInit = function() {
				window.__splitbrowser__aioInit();
				SplitBrowser._browsers.forEach(
					aioTabSwitching ?
						function(aBrowser) {
							aBrowser.browser.mStrip.addEventListener('DOMMouseScroll', aioSwitchTabs, true);
						} :
						function(aBrowser) {
							aBrowser.browser.mStrip.removeEventListener('DOMMouseScroll', aioSwitchTabs, true);
						}
				);
			};
		}

		eval('window.aioTabFocus = '+window.aioTabFocus.toSource()
			.replace(
				/\{/,
				'{'+
					'if (e.originalTarget.ownerDocument != document) return;'+
					'var b = e.originalTarget;'+
					'while (b.localName != "tabbrowser")'+
						'b = b.parentNode;'
			).replace(
				/aioTabsNb/g,
				'b.aioTabsNb'
			).replace(
				/aioContent/g,
				'b'
			).replace(
				/aioRendering/g,
				'(b.mPanelContainer || b)'
			)
		);
		eval('window.aioTabLoad = '+window.aioTabLoad.toSource()
			.replace(
				/\{/,
				'{'+
					'if ((e.originalTarget.ownerDocument || e.originalTarget) == document) return;'+
					'var b, w = (e.originalTarget.ownerDocument || e.originalTarget).defaultView.top;'+
					'if (gBrowser.browsers.some(function(aBrowser) { return w == aBrowser.contentWindow; })) {'+
						'b = gBrowser;'+
					'}'+
					'else {'+
						'for (var i = 0, maxi = SplitBrowser.browsers.length; i < maxi; i++)'+
						'{'+
							'if ((b = SplitBrowser.browsers[i].browser).browsers.some(function(aBrowser) { return w == aBrowser.contentWindow; })) break;'+
						'}'+
					'}'
			).replace(
				/aioTabsNb/g,
				'b.aioTabsNb'
			).replace(
				/aioRendering/g,
				'(b.mPanelContainer || b)'
			)
		);
		var funcs = 'aioStartTrail,aioIsAreaOK,aioIsPastable,aioMouseDown,aioAddMarker,aioWheelScroll'.split(',');
		funcs.forEach(function(aFunc) {
			eval(
				'window.'+aFunc+' = '+
				window[aFunc].toSource().replace(
					/e.target/g,
					'e.originalTarget'
				)
			);
		});
		eval('window.aioOpenInNewTab = '+window.aioOpenInNewTab.toSource().replace(
			/BrowserOpenTab\(\);/,
			'SplitBrowser.activeBrowserOpenTab();'
		));
		eval('window.aioCloseCurrTab = '+window.aioCloseCurrTab.toSource().replace(
			/BrowserCloseWindow\(\);/,
			'SplitBrowser.activeBrowserCloseWindow();'
		));
		var initAIOG = function(aEvent) {
			var b = aEvent.originalTarget.browser;
			b.mTabBox.addEventListener('select', aioTabFocus, true);
			b.mTabBox.addEventListener('load', aioTabLoad, true);
			b.aioTabsNb = b.mPanelContainer.childNodes.length;
		};
		var destroyAIOG = function(aEvent) {
			var b = aEvent.originalTarget.browser;
			b.mTabBox.removeEventListener('select', aioTabFocus, true);
			b.mTabBox.removeEventListener('load', aioTabLoad, true);
		};
		appcontent.addEventListener('SubBrowserAdded', initAIOG, false);
		appcontent.addEventListener('SubBrowserRemoveRequest', destroyAIOG, false);
		window.addEventListener('unload', function() {
			appcontent.removeEventListener('SubBrowserAdded', initAIOG, false);
			appcontent.removeEventListener('SubBrowserRemoveRequest', destroyAIOG, false);
			window.removeEventListener('unload', arguments.callee, false);
		}, false);

		eval('window.aioActionTable = '+window.aioActionTable.toSource()
			.replace(
				/addBookmarkAs\(aioContent\)/g,
				'addBookmarkAs\(SplitBrowser.activeBrowser\)'
			).replace(
				/BrowserReload\(\)/g,
				'SplitBrowser.activeBrowserReload()'
			).replace(
				/BrowserReloadSkipCache\(\)/g,
				'SplitBrowser.activeBrowserReloadSkipCache()'
			).replace(
				/BrowserOpenTab\(\)/g,
				'SplitBrowser.activeBrowserOpenTab()'
			).replace(
				/BrowserStop\(\)/g,
				'SplitBrowser.activeBrowserStop()'
			).replace(
				/BrowserPageInfo\(\)/g,
				'SplitBrowser.activeBrowserPageInfo()'
			).replace(
				/aioSrcEvent.target/g,
				'aioSrcEvent.originalTarget'
			)
		);
	}

	window.setTimeout('SplitBrowser.hackForOtherExtensionsWithDelay()', 0);
};



SplitBrowser.hackForOtherExtensionsWithDelay = function() {

	var appcontent = document.getElementById('appcontent');

	// hack for All-in-One Gestures
	if ('aioInit' in window) {
		gBrowser.aioTabsNb = gBrowser.mPanelContainer.childNodes.length;

		try {
			aioRendering.removeEventListener('contextmenu', aioContextMenuEnabler, true);
			aioRendering.removeEventListener('mousedown', aioMouseDown, true);
			gBrowser.mTabBox.removeEventListener('select', aioTabFocus, true);
			gBrowser.mTabBox.removeEventListener('load', aioTabLoad, true);
		}
		catch(e) {
		}

		appcontent.addEventListener('contextmenu', aioContextMenuEnabler, true);
		appcontent.addEventListener('mousedown', aioMouseDown, true);
		gBrowser.mTabBox.addEventListener('select', aioTabFocus, true);
		gBrowser.mTabBox.addEventListener('load', aioTabLoad, true);

		window.aioContent = {
			get mTabBox() {
				return SplitBrowser.activeBrowser.mTabBox;
			},
			get mTabContainer() {
				return SplitBrowser.activeBrowser.mTabContainer;
			},
			get mPanelContainer() {
				return SplitBrowser.activeBrowser.mPanelContainer;
			},
			get mStrip() {
				return SplitBrowser.activeBrowser.mStrip;
			},
			get ownerDocument() {
				return SplitBrowser.activeBrowser.ownerDocument;
			},
			get selectedBrowser() {
				return SplitBrowser.activeBrowser.selectedBrowser;
			},
			addEventListener : function()
			{
				SplitBrowser.activeBrowser.addEventListener.apply(SplitBrowser.activeBrowser, arguments);
			},
			removeEventListener : function()
			{
				SplitBrowser.activeBrowser.removeEventListener.apply(SplitBrowser.activeBrowser, arguments);
			},
			reloadAllTabs : function()
			{
				return SplitBrowser.activeBrowser.reloadAllTabs.apply(SplitBrowser.activeBrowser, arguments);
			},
			removeAllTabsBut : function()
			{
				return SplitBrowser.activeBrowser.removeAllTabsBut.apply(SplitBrowser.activeBrowser, arguments);
			},
			removeCurrentTab : function()
			{
				return SplitBrowser.activeBrowser.removeCurrentTab.apply(SplitBrowser.activeBrowser, arguments);
			},
			warnAboutClosingTabs : function()
			{
				return SplitBrowser.activeBrowser.addTab.apply(SplitBrowser.activeBrowser, arguments);
			},
			getBrowserForTab : function()
			{
				return SplitBrowser.activeBrowser.getBrowserForTab.apply(SplitBrowser.activeBrowser, arguments);
			},
			get undoRemoveTab()
			{
				return this.wrappedUndoRemoveTab;
			},
			wrappedUndoRemoveTab : function() {
				SplitBrowser.activeBrowser.undoRemoveTab.apply(SplitBrowser.activeBrowser, arguments);
			},
			get webNavigation()
			{
				return SplitBrowser.activeBrowser.webNavigation;
			},
			get mTabContainer()
			{
				return SplitBrowser.activeBrowser.mTabContainer;
			},
			get removeTab()
			{
				return this.wrappedRemoveTab;
			},
			wrappedRemoveTab : function() {
				SplitBrowser.activeBrowser.removeTab.apply(SplitBrowser.activeBrowser, arguments);
			},
			set removeTab(val)
			{
				return SplitBrowser.activeBrowser.removeTab = val;
			},
			get selectedTab()
			{
				return SplitBrowser.activeBrowser.selectedTab;
			},
			set selectedTab(val)
			{
				return SplitBrowser.activeBrowser.selectedTab = val;
			},
			get aioNativeRemoveTab()
			{
				return this.wrappedNativeRemoveTab ;
			},
			wrappedNativeRemoveTab : function() {
				SplitBrowser.activeBrowser.aioNativeRemoveTab.apply(SplitBrowser.activeBrowser, arguments);
			},
			set aioNativeRemoveTab(val)
			{
				return SplitBrowser.activeBrowser.aioNativeRemoveTab = val;
			},
			get moveTabTo()
			{
				return this.wrappedNativeMoveTabTo;
			},
			wrappedNativeMoveTabTo : function() {
				SplitBrowser.activeBrowser.moveTabTo.apply(SplitBrowser.activeBrowser, arguments);
			},
			set moveTabTo(val)
			{
				return SplitBrowser.activeBrowser.moveTabTo = val;
			},
			get addTab()
			{
				return this.wrappedNativeAddTab;
			},
			wrappedNativeAddTab : function() {
				SplitBrowser.activeBrowser.addTab.apply(SplitBrowser.activeBrowser, arguments);
			},
			set addTab(val)
			{
				return SplitBrowser.activeBrowser.addTab = val;
			}
		};

		window.aioRendering = {
			addEventListener : function()
			{
				appcontent.addEventListener.apply(appcontent, arguments);
			},
			removeEventListener : function()
			{
				appcontent.removeEventListener.apply(appcontent, arguments);
			},
			get childNodes() {
				return window.aioContent.mPanelContainer.childNodes;
			},
			get selectedIndex() {
				return window.aioContent.mPanelContainer.selectedIndex;
			},
			set selectedIndex(val) {
				return window.aioContent.mPanelContainer.selectedIndex = val;
			}
		};
	}
};
