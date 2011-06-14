load('base');
load('group');
load('lib/jsdeferred');

var EXPORTED_SYMBOLS = ['FoxSplitterWindow'];

const TAB_DROP_TYPE = 'application/x-moz-tabbrowser-tab';

const XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
					.getService(Ci.nsIXULAppInfo)
					.QueryInterface(Ci.nsIXULRuntime);
 
function FoxSplitterWindow(aWindow, aOnInit) 
{
	this.init(aWindow, aOnInit);
}
FoxSplitterWindow.prototype = {
	__proto__ : FoxSplitterBase.prototype,

	STATE_MAXIMIZED  : Ci.nsIDOMChromeWindow.STATE_MAXIMIZED,
	STATE_MINIMIZED  : Ci.nsIDOMChromeWindow.STATE_MINIMIZED,
	STATE_NORMAL     : Ci.nsIDOMChromeWindow.STATE_NORMAL,
	STATE_FULLSCREEN : Ci.nsIDOMChromeWindow.STATE_FULLSCREEN,

	DROP_INDICATOR : 'foxsplitter-drop-indicator',

	// opacity=0 panel isn't shown on Linux
	MIN_OPACITY : (XULAppInfo.OS == 'Linux' ? '0.01' : '0' ),
	// too small window isn't shown on Linux
	MIN_WIDTH : 16,
	MIN_HEIGHT : 16,

	BASE_STYLESHEET : <![CDATA[
/*
		:root[ACTIVE="false"] toolbox,
		:root[ACTIVE="false"] .treestyletab-tabbar,
		:root[ACTIVE="false"] .treestyletab-tabbar-ready {
			visibility: collapse !important;
		}
*/
		.DROP_INDICATOR {
			background: rgba(0, 0, 0, 0.75);
			border: 0 solid rgba(255, 255, 255, 0.75);
			border-radius: 0;
			line-height: 0;
			margin: 0;
			opacity: MIN_OPACITY;
			padding: 0;
			-moz-appearance: none;
			-moz-border-radius: 0;
			-moz-box-align: center;
			-moz-box-pack: center;
			-moz-transition: opacity 0.25s ease-in;
		}

		.DROP_INDICATOR.top {
			border-top-width: 1px;
		}
		.DROP_INDICATOR.right {
			border-right-width: 1px;
		}
		.DROP_INDICATOR.bottom {
			border-bottom-width: 1px;
		}
		.DROP_INDICATOR.left {
			border-left-width: 1px;
		}

		.DROP_INDICATOR label {
			color: white;
			line-height: 0;
			margin: 0;
			min-height: 0;
			min-width: 0;
			padding: 0;
		}
	]]>.toString(),

	lastX      : null,
	lastY      : null,
	lastWidth  : null,
	lastHeight : null,
	syncScroll : false,

	get dropZoneSize() { return FoxSplitterWindow.dropZoneSize; },
	set dropZoneSize(aValue) { return FoxSplitterWindow.dropZoneSize = aValue; },
	get handleDragWithShiftKey() { return FoxSplitterWindow.handleDragWithShiftKey; },
	set handleDragWithShiftKey(aValue) { return FoxSplitterWindow.handleDragWithShiftKey = aValue; },
	get shouldAutoHideTabs() { return FoxSplitterWindow.shouldAutoHideTabs; },
	set shouldAutoHideTabs(aValue) { return FoxSplitterWindow.shouldAutoHideTabs = aValue; },
	get shouldAutoSmallizeToolbarMode() { return FoxSplitterWindow.shouldAutoSmallizeToolbarMode; },
	set shouldAutoSmallizeToolbarMode(aValue) { return FoxSplitterWindow.shouldAutoSmallizeToolbarMode = aValue; },
	get syncScrollX() { return FoxSplitterWindow.syncScrollX; },
	set syncScrollX(aValue) { return FoxSplitterWindow.syncScrollX = aValue; },
	get syncScrollY() { return FoxSplitterWindow.syncScrollY; },
	set syncScrollY(aValue) { return FoxSplitterWindow.syncScrollY = aValue; },

	get x()
	{
		return this.window.screenX;
	},
	get y()
	{
		return this.window.screenY;
	},
	get width()
	{
		return this.window.outerWidth;
	},
	get height()
	{
		return this.window.outerHeight;
	},

	get window()
	{
		if (!this._window) {
			let error = new Error('illegal access to "window"');
			this.dumpError(error);
			throw error;
		}
		return this._window;
	},
	set window(aValue)
	{
		return this._window = aValue;
	},

	get position()
	{
		return (
			this._position ||
			(this._position = parseInt(this.documentElement.getAttribute(this.ATTACHED_POSITION)))
		);
	},
	set position(aValue)
	{
		this.documentElement.setAttribute(this.ATTACHED_POSITION, aValue);
		return this._position = aValue;
	},

	get id()
	{
		return (
			this._id ||
			(this._id = this.documentElement.getAttribute(this.kID))
		);
	},
	set id(aValue)
	{
		this.documentElement.setAttribute(this.kID, aValue);
		return this._id = aValue;
	},

	get active()
	{
		return this._active;
	},
	set active(aValue)
	{
		this._active = !!aValue;
		if (aValue && this.parent) {
			this.root.allWindows.forEach(function(aFSWindow) {
				if (aFSWindow != this)
					aFSWindow.active = false;
			}, this);
		}
		this.documentElement.setAttribute(this.ACTIVE, this._active);
		this._updateChromeHidden();
		return this._active;
	},

	get windowState()
	{
		var state = this._window ? this.window.windowState : -1 ;
/*
		if (// on Windows, minimized window is possibly normal and out of screen
			state == this.STATE_NORMAL && 
			this.x == -32000 &&
			this.y == -32000
			)
			state = this.STATE_MINIMIZED;
*/
		return state;
	},

	get minimized()
	{
		return this.windowState == this.STATE_MINIMIZED;
	},

	get documentElement()
	{
		return this.document.documentElement;
	},
	get document()
	{
		return this.window.document;
	},
	get browser()
	{
		return this._window && this.window.gBrowser;
	},
	get visibleTabs()
	{
		return !this._window ? [] :
			(this.browser.visibleTabs || this.allTabs);
	},
	get allTabs()
	{
		return !this.browser ? [] :
			Array.slice(this.browser.mTabContainer.childNodes);
	},
	get toolbars()
	{
		return !this._window ? [] : Array.slice(this.document.querySelectorAll('toolbar, toolbox')) ;
	},


	init : function FSW_init(aWindow, aOnInit) 
	{
		this.window = aWindow;

		this.positioning = 0;
		this.resizing    = 0;
		this.raising     = 0;
		this.scrolling   = 0;
		this.windowStateUpdating = 0;

		this.active = true;

		this.id = this.id || ('window-' + Date.now() + '-' + parseInt(Math.random() * 65000));
		this.parent = null;
		FoxSplitterWindow.instances.push(this);
		FoxSplitterWindow.instancesById[this.id] = this;

		this._installStyleSheet();

		if (!aOnInit)
			aWindow.addEventListener('load', this, false);

		aWindow.addEventListener('unload', this, false);

		if (aOnInit)
			this._initAfterLoad();
	},

	_installStyleSheet : function FSW_installStyleSheet()
	{
		if (this._styleSheet)
			return;
		var styles = this.BASE_STYLESHEET
						.replace(/ACTIVE/g, this.ACTIVE)
						.replace(/DROP_INDICATOR/g, this.DROP_INDICATOR)
						.replace(/MIN_OPACITY/g, this.MIN_OPACITY);
		this._styleSheet = this.document.createProcessingInstruction('xml-stylesheet',
			'type="text/css" href="data:text/css,'+encodeURIComponent(styles)+'"');
		this.document.insertBefore(this._styleSheet, this.documentElement);
	},

	_uninstallStyleSheet : function FSW_uninstallStyleSheet()
	{
		if (!this._styleSheet)
			return;
		this.document.removeChild(this._styleSheet);
		delete this._styleSheet;
	},

	_initAfterLoad : function FSW_initAfterLoad()
	{
		// for _preDestroy()
		Cc['@mozilla.org/embedcomp/window-watcher;1']
			.getService(Ci.nsIWindowWatcher)
			.registerNotification(this);

		var self = this;
		Deferred.next(function() {
			self.updateLastPositionAndSize();

			// workaround to fix misrendering by resizing on DOMContentLoaded
			self.resizeBy(0, -1);
			self.resizeBy(0, 1);

			if (self.parent)
				self.parent.reserveResetPositionAndSize(); // for safety

			self.startListen();
		})
		.error(this.defaultHandleError);
	},

	_updateChromeHidden : function FSW_updateChromeHidden(aForceRestore)
	{
		var hiddenItems = [
				'menubar',
//				'toolbar',
//				'location',
				'directories',
//				'status',
				'extrachrome'
			].join(' ');
		if (this._originalChromeHidden === undefined)
			this._originalChromeHidden = this.documentElement.getAttribute('chromehidden');

		if (this.active || !this.parent)
			this.documentElement.setAttribute('chromehidden', this._originalChromeHidden);
		else
			this.documentElement.setAttribute('chromehidden', hiddenItems);
	},
	_originalChromeHidden : undefined,


	/**
	 * This process must be done at the timing between "close/DOMWindowClose"
	 * and "unload".
	 * On "close" (and "DOMWindowClose"), we cannot know whether the window
	 * is really closed or not. However, on "unload" it's too late to do
	 * this process.
	 * The nsWindowWatcher notifies "domwindowclosed" event before "unload"
	 * so it is the best timing.
	 */
	_preDestroy : function FSW_preDestroy(aOnQuit) 
	{
		this._preDestroyDone = true;

		Cc['@mozilla.org/embedcomp/window-watcher;1']
			.getService(Ci.nsIWindowWatcher)
			.unregisterNotification(this);

		if (this.parent && !aOnQuit)
			this._exportHiddenTabs();
	},
	_preDestroyDone : false,

	destroy : function FSW_destroy(aOnQuit) 
	{
		if (!this._preDestroyDone)
			this._preDestroy(aOnQuit);

		this.hideDropIndicator();
		this.unwatchWindowState();
		this.clearGroupedAppearance(aOnQuit);
		this._updateChromeHidden();

		var id = this.id;

		this.detach(aOnQuit);

		var w = this.window;
		w.removeEventListener('unload', this, false);
		this.endListen();

		this._uninstallStyleSheet();

		this.window = null;

		FoxSplitterWindow.instances = FoxSplitterWindow.instances.filter(function(aFSWindow) {
			return aFSWindow != this;
		}, this);
		delete FoxSplitterWindow.instancesById[id];
	},

	_exportHiddenTabs : function FSW_exportHiddenTabs()
	{
		if (!this.parent || !this.sibling)
			return;

		var target = this.sibling;
		this.allTabs.forEach(function(aTab) {
			if (aTab.hidden)
				target.importTab(aTab);
		}, this);
	},


	moveTo : function FSW_moveTo(aX, aY)
	{
		if (this.minimized || !this._window)
			return;

		this.positioning++;
		this.window.moveTo(aX, aY);
		this.updateLastPositionAndSize();
		var self = this;
		Deferred.next(function() {
			self.updateLastPositionAndSize();
			self.positioning--;
		})
		.error(this.defaultHandleError);
	},

	moveBy : function FSW_moveBy(aDX, aDY)
	{
		if (this.minimized || !this._window)
			return;

		this.positioning++;
		this.window.moveBy(aDX, aDY);
		this.updateLastPositionAndSize();
		var self = this;
		Deferred.next(function() {
			self.updateLastPositionAndSize();
			self.positioning--;
		})
		.error(this.defaultHandleError);
	},

	resizeTo : function FSW_resizeTo(aW, aH)
	{
		if (this.minimized || !this._window)
			return;

		this.resizing++;
		this.window.resizeTo(
			Math.max(this.MIN_WIDTH, aW),
			Math.max(this.MIN_HEIGHT, aH)
		);
		this.updateLastPositionAndSize();
		var self = this;
		Deferred.next(function() {
			self.updateLastPositionAndSize();
			self.resizing--;
		})
		.error(this.defaultHandleError);
	},

	resizeBy : function FSW_resizeBy(aDW, aDH)
	{
		if (this.minimized || !this._window)
			return;

		this.resizing++;
		this.window.resizeBy(
			Math.max(-this.window.innerWidth+this.MIN_WIDTH, aDW),
			Math.max(-this.window.innerHeight+this.MIN_HEIGHT, aDH)
		);
		this.updateLastPositionAndSize();
		var self = this;
		Deferred.next(function() {
			self.updateLastPositionAndSize();
			self.resizing--;
		})
		.error(this.defaultHandleError);
	},

	raise : function FSW_raise()
	{
		var deferred = new Deferred();
		if (!this._window || this.raising || this.minimized) {
			Deferred.next(function() {
				deferred.call();
			});
			return deferred;
		}

		this.raising++;

		/**
		 * on Windows:
		 *   (event loop 1) focused => "activate" event is fired
		 *     => (event loop 2) Deferred.next() is processed
		 *       => ready to decrement the "raising" counter
		 * on Linux:
		 *   (event loop 1) focused
		 *     => (event loop 2) Deferred.next() is processed
		 *       => (event loop 3) "activate" event is fired
		 *         => ready to decrement the "raising" counter
		 *
		 * Grouped windows flick each other infinitely, if I decrement
		 * the counter too early. To avoid this flick, I have to wait
		 * until this window is surely activated.
		 */
		var self = this;
		Deferred
			.parallel(
				this._waitWindowActivated(this.window),
				Deferred.next(function() {})
			)
			.next(function() {
				self.raising--;
				deferred.call();
			});

		try {
			var fm = Cc['@mozilla.org/focus-manager;1'].getService(Ci.nsIFocusManager);

			var focusedWindow = {};
			var focusedElement = fm.getFocusedElementForWindow(this.window, true, focusedWindow);
			var reason = fm.getLastFocusMethod(focusedWindow.value);
			var flags = Ci.nsIFocusManager.FLAG_RAISE |
						Ci.nsIFocusManager.FLAG_NOSCROLL |
						Ci.nsIFocusManager.FLAG_NOSWITCHFRAME |
						reason;

			focusedWindow.value.focus();

			if (focusedElement)
				fm.setFocus(focusedElement, flags);
		}
		catch(e) {
			this.dumpError(e, 'FoxSplitter: FAILED TO RAISE A WINDOW!');
		}

		return deferred;
	},
	_waitWindowActivated : function FSW_waitWindowActivated(aDOMWindow)
	{
		var deferred = new Deferred();

		var handleEvent = function() {
				aDOMWindow.removeEventListener('activate', handleEvent, true);
				aDOMWindow.removeEventListener('deactivate', handleEvent, true);
				if (timer) timer.cancel();
				deferred.call();
			};

		aDOMWindow.addEventListener('activate', handleEvent, true);
		aDOMWindow.addEventListener('deactivate', handleEvent, true);

		// timeout (for safety)
		let timer = Deferred.wait(0.5);
		timer
			.next(function() {
				timer = null;
				handleEvent();
			})
			.error(this.defaultHandleError);

		return deferred;
	},


	openLinkAt : function FSW_openLinksAt(aURIOrTab, aPositionAndSize)
	{
		if (!this._window)
			return Deferred.next(function() { return null; });

		var options = [
				'chrome,dialog=no,all',
				'screenX='+aPositionAndSize.x,
				'screenY='+aPositionAndSize.y,
				'outerWidth='+aPositionAndSize.width,
				'outerHeight='+aPositionAndSize.height
			].join(',');
		var deferred = new Deferred();
		var window = this.window.openDialog(
				'chrome://browser/content/browser.xul',
				'_blank',
				options,
				aURIOrTab
			);
		var self = this;
		window.addEventListener('load', function() {
			window.removeEventListener('load', arguments.callee, false);
			deferred.call(window);
		}, false);
		return deferred
				.error(this.defaultHandleError);
	},

	openLinksIn : function FSW_openLinkIn(aURIs, aPosition, aBase)
	{
		if (!this._window)
			return Deferred.next(function() { return null; });

		aURIs = aURIs.slice(0);
		var first = aURIs.shift(); // only the first element can be tab

		var base = aBase || this;
		var positionAndSize = this._calculatePositionAndSize(base, aPosition);

		return this.openLinkAt(first, positionAndSize)
				.next(function(aWindow) {
					aWindow.FoxSplitter.attachTo(base, aPosition);
					aURIs.forEach(function(aURI) {
						aWindow.gBrowser.addTab(aURI);
					});
					return aWindow;
				});
	},

	openLinkIn : function FSW_openLinkIn(aURIOrTab, aPosition, aBase)
	{
		return this.openLinksIn([aURIOrTab], aPosition, aBase);
	},

	duplicateTabsIn : function FSW_duplicateTabsIn(aTabs, aPosition, aBase)
	{
		return this.openLinkIn('about:blank', aPosition, aBase)
				.next(function(aWindow) {
					let firstTab = aWindow.gBrowser.selectedTab;
					aTabs.forEach(function(aTab) {
						aWindow.gBrowser.duplicateTab(aTab);
					});
					aWindow.gBrowser.removeTab(firstTab);
					return aWindow;
				});
	},
	duplicateTabIn : function FSW_duplicateTabIn(aTab, aPosition, aBase)
	{
		return this.duplicateTabsIn([aTab], aPosition, aBase);
	},

	moveTabsTo : function FSW_moveTabsTo(aTabs, aPosition, aBase)
	{
		aTabs = aTabs.slice(0);

		var first = aTabs.shift();
		return this.openLinkIn(first, aPosition, aBase)
				.next(function(aWindow) {
					aTabs.forEach(function(aTab) {
						var tab = aWindow.gBrowser.addTab();
						tab.stop();
						tab.docShell;
						aWindow.gBrowser.swapBrowsersAndCloseOther(tab, aTab);
					});
					return aWindow;
				});
	},
	moveTabTo : function FSW_moveTabTo(aTab, aPosition, aBase)
	{
		return this.moveTabsTo([aTab], aPosition, aBase);
	},


	tileTabs : function FSW_tileTabs(aTabs, aMode)
	{
		var isAllTabs = aTabs.length == this.visibleTabs.length;
		if (
			!this._window ||
			(isAllTabs && aTabs.length == 1)
			) {
			return Deferred.next(function() {
				return [];
			});
		}

		var selectedTab = this.browser.selectedTab;
		var tilesCount = aTabs.length + (isAllTabs ? 0 : 1 );

		var beforeTabs = aTabs.filter(function(aTab) {
				return aTab._tPos < selectedTab._tPos;
			});
		var afterTabs = aTabs.filter(function(aTab) {
				if (aTab.selected && isAllTabs)
					return false;
				return aTab._tPos >= selectedTab._tPos;
			});

		var baseX = this.x;
		var baseY = this.y;
		var totalWidth = this.width;
		var totalHeight = this.height;

		var maxRows, maxCols, lastMaxCols;
		switch (aMode)
		{
			case this.TILE_MODE_GRID:
			default:
				maxRows = Math.floor(Math.sqrt(tilesCount));
				maxCols = Math.floor(tilesCount / maxRows);
				lastMaxCols = maxCols + tilesCount - (maxCols * maxRows);
				break;

			case this.TILE_MODE_X_AXIS:
				maxRows = 1;
				maxCols = tilesCount;
				lastMaxCols = tilesCount;

			case this.TILE_MODE_Y_AXIS:
				maxRows = tilesCount;
				maxCols = 1;
				lastMaxCols = 1;
		}

		var width              = Math.round(totalWidth / maxCols);
		var lastWidth          = totalWidth - (width * (maxCols - 1)) ;
		var widthInLastRow     = Math.round(totalWidth / lastMaxCols);
		var lastWidthInLastRow = totalWidth - (widthInLastRow * (lastMaxCols - 1)) ;
		var height             = Math.round(totalHeight / maxRows);
		var lastHeight         = totalHeight - (height * (maxRows - 1)) ;

		var col = 0;
		var row = 0;
		var deferreds = [];
		var self = this;
		var tiles = beforeTabs.concat([null]).concat(afterTabs)
					.map(function(aTab) {
						let isLastRow = (row == maxRows - 1);
						let currentMaxCols = isLastRow ? lastMaxCols : maxCols ;
						let offsetWidth = isLastRow ? widthInLastRow : width ;
						let tile = {
								col       : col,
								row       : row,
								first     : col == 0,
								last      : (col == currentMaxCols- 1 ),
								direction : ((aTab && aTab._tPos < selectedTab._tPos) ? -1 : aTab ? 1 : 0 ),
								width     : ((col == currentMaxCols - 1) ?
												(isLastRow ? lastWidthInLastRow : lastWidth ) :
												offsetWidth
											),
								height    : isLastRow ? lastHeight : height
							};
						tile.x = baseX + (offsetWidth * col);
						tile.y = baseY + (height * row);
						if (aTab) {
							deferreds.push(this.openLinkAt(aTab, tile));
						}
						else {
							this.moveTo(tile.x, tile.y);
							this.resizeTo(tile.width, tile.height);
							deferreds.push(Deferred.next(function() {
								return self.window;
							}));
						}
						col++;
						if (col == currentMaxCols) {
							col = 0;
							row++;
						}
						return tile;
					}, this);

		return Deferred
				.parallel(deferreds)
				.next(function(aWindows) {
					var beforeXTiles = [];
					var beforeYTiles = [];
					var afterXTiles  = [];
					var afterYTiles  = [];
					var rows = [];

					/**
					 * JSDeferred doesn't return results as an array
					 * if parallel() received an array from another namespace.
					 * So, we manuall make it an array.
					 */
					aWindows.length = tilesCount;
					Array.forEach(aWindows, function(aWindow, aIndex) {
						var tile = tiles[aIndex];
						tile.FSWindow = aWindow.FoxSplitter;
						if (tile.direction == -1) {
							if (tile.last)
								beforeYTiles.unshift(tile);
							else
								beforeXTiles.unshift(tile);
						}
						else if (tile.direction == 1) {
							if (tile.first)
								afterYTiles.push(tile);
							else
								afterXTiles.push(tile);
						}
						let row = rows[tile.row] || [];
						row[tile.col] = tile;
						rows[tile.row] = row;
					});

					beforeYTiles.forEach(function(aTile, aIndex) {
						var base = !aIndex ? self : beforeYTiles[aIndex-1];
						aTile.FSWindow.attachTo(base, self.POSITION_TOP, true);
					});
					beforeXTiles.forEach(function(aTile) {
						var row = rows[aTile.row]
						aTile.FSWindow.attachTo(row[aTile.col+1].FSWindow, self.POSITION_LEFT, true);
					});

					afterYTiles.forEach(function(aTile, aIndex) {
						var base = !aIndex ? self : afterYTiles[aIndex-1];
						aTile.FSWindow.attachTo(base, self.POSITION_BOTTOM, true);
					});
					afterXTiles.forEach(function(aTile) {
						var row = rows[aTile.row]
						aTile.FSWindow.attachTo(row[aTile.col-1].FSWindow, self.POSITION_RIGHT, true);
					});

					self.parent.resetPositionAndSize(self); // for safety

					return tiles.map(function(aTile) {
						return aTile.FSWindow.window;
					})
				})
				.error(this.defaultHandleError);
	},

	tileAllTabs : function FSW_tileAllTabs(aMode)
	{
		return this.tileTabs(this.visibleTabs, aMode);
	},

	tileSelectedTabs : function FSW_tileSelectedTabs(aMode)
	{
		var tabs = this.visibleTabs.filter(function(aTab) {
				return aTab.getAttribute('multiselected') == 'true';
			});
		return this.tileTabs(tabs, aMode);
	},


	gatherWindows : function FSW_gatherWindows()
	{
		if (!this.parent || !this._window)
			return Deferred.next(function() {
				return [];
			});

		var FSWindows = this.root.allWindows;
		var current = FSWindows.indexOf(this);
		var offset = 0;
		var deferreds = [];
		FSWindows.forEach(function(aFSWindow, aIndex) {
			if (aIndex == current)
				return;

			var count = aFSWindow.allTabs.length;
			deferreds.push(this.importTabsFrom(aFSWindow.window, offset));
			offset += count;
		}, this);

		if (deferreds.length) {
			let self = this;
			return Deferred
					.parallel(deferreds)
					.error(this.defaultHandleError);
		}

		return Deferred.next(function() {
			return [];
		});
	},

	importTabsFrom : function FSW_importTabsFrom(aWindow, aOffset)
	{
		if (!this.parent || !this._window || !aWindow.FoxSplitter)
			return Deferred.next(function() {
				return [];
			});

		var FSWindows = this.root.allWindows;
		var current = FSWindows.indexOf(this);
		var importSource = FSWindows.indexOf(aWindow.FoxSplitter);
		var allTabsCount = this.allTabs.length;
		var offset = importSource > -1 && current > importSource ?
						allTabsCount :
						0 ;
		if (aOffset)
			offset += aOffset;

		offset = Math.min(allTabsCount, offset);

		var selectedTab = this.browser.selectedTab;
		var deferreds = [];
		// importTab() removes tab so we have to clone an array before do it.
		aWindow.FoxSplitter.allTabs.forEach(function(aTab) {
			/**
			 * before windows should be imported as leftmost tabs.
			 * after windows should be imported as rightmost tabs.
			 */
			deferreds.push(this.importTab(aTab, offset++));
		}, this);

		if (deferreds.length) {
			let self = this;
			return Deferred
					.parallel(deferreds)
					.next(function(aImportedTabs) {
						/**
						 * swapBrowsersAndCloseOther() focuses to the imported tab,
						 * so we have to focus to the original selected tab again.
						 */
						self.browser.selectedTab = selectedTab;
						return aImportedTabs.filter(function(aTab) {
							return aTab;
						});
					})
					.error(this.defaultHandleError);
		}

		return Deferred.next(function() {
			return [];
		});
	},

	importTab : function FSW_importTab(aTab, aPosition)
	{
		if (!this._window)
			return Deferred.next(function() {
				return null;
			});

		var newTab = this.browser.addTab('about:blank');
		newTab.linkedBrowser.stop();
		newTab.linkedBrowser.docShell;
		if (aPosition !== undefined && aPosition > -1)
			this.browser.moveTabTo(newTab, aPosition);

		var groupInfo = this._getGroupInfo(aTab);
		if (aTab.hidden) aTab.hidden = false; // we cannot import hidden tab!
		this.browser.swapBrowsersAndCloseOther(newTab, aTab);

		var deferred = new Deferred();
		var self = this;
		Deferred.next(function() {
			if (groupInfo)
				self._moveImportedTabToNamedGroup(newTab, groupInfo)
					.next(function() {
						deferred.call(newTab);
					});
			else
				deferred.call(newTab);
		});

		return deferred
				.error(this.defaultHandleError);
	},

	_getExistingGroups : function FSW_getExistingGroups()
	{
		var deferred = new Deferred();
		var self = this;
		Deferred.next(function() {
			self.window.TabView._initFrame(function() {
				deferred.call(self.window.TabView._window.GroupItems.groupItems);
			});
		});
		return deferred;
	},

	_getGroupInfo : function FSW_getGroupInfo(aTab)
	{
		var item = aTab._tabViewTabItem;
		if (!item)
			return null;

		var parent = item.parent;
		if (!parent)
			return null;

		var groupInfo = {
				id     : parent.id,
				title  : parent.getTitle(),
				window : aTab.ownerDocument.defaultView.FoxSplitter.id
			};
		if (!groupInfo.title)
			groupInfo.title = this._generateTemporaryNameForAnonymousGroup(groupInfo);
		return groupInfo;
	},

	_generateTemporaryNameForAnonymousGroup : function FSW_generateTemporaryNameForAnonymousGroup(aGroupInfo)
	{
		// XXX need to be localized!
		return 'imported anonymous group '+aGroupInfo.id+' from window '+aGroupInfo.window;
	},

	_moveImportedTabToNamedGroup : function FSW_moveImportedTabToNamedGroup(aTab, aTargetGroupInfo)
	{
		var self = this;
		return this._getExistingGroups()
				.next(function(aGroups) {
					var targetGroup;
					aGroups.some(function(aGroup) {
						if (aGroup.getTitle() != aTargetGroupInfo.title)
							return false;
						return targetGroup = aGroup;
					});
					var groupId = targetGroup ? targetGroup.id : null ;
					self.window.TabView.moveTabTo(aTab, groupId);
					// newly created group has no title yet!
					if (!groupId && aTab._tabViewTabItem && aTargetGroupInfo.title)
						aTab._tabViewTabItem.parent.setTitle(aTargetGroupInfo.title);
				})
				.error(this.defaultHandleError);
	},


	canClose : function FSW_canClose()
	{
		if (
			!this._window ||
			!this.window.WindowIsClosing
			)
			return true;

		return this.window.WindowIsClosing();
	},

	close : function FSW_close(aForce)
	{
		if (aForce || this.canClose())
			this.window.close();
	},

	closeAll : function FSW_closeAll()
	{
		if (this.parent)
			this.root.close();
		else
			this.close();
	},

	closeOther : function FSW_closeOther()
	{
		if (this.parent)
			this.root.closeExcept(this);
	},


	// event handling

	startListen : function FSW_startListen()
	{
		if (this._listening || !this._window) return;
		this.window.addEventListener('DOMAttrModified', this, false);
		this.window.addEventListener('resize', this, false);
		this.window.addEventListener('activate', this, true);
		this.window.addEventListener('deactivate', this, true);
		this.window.addEventListener('scroll', this, true);
		this.window.addEventListener('dragover', this, false);
		this.window.addEventListener('dragleave', this, true);
		this.window.addEventListener('drop', this, true);
		this.window.addEventListener('dragend', this, true);
		this._listening = true;
	},
	_listening : false,

	endListen : function FSW_endListen()
	{
		if (!this._listening || !this._window) return;
		this.window.removeEventListener('DOMAttrModified', this, false);
		this.window.removeEventListener('resize', this, false);
		this.window.removeEventListener('activate', this, true);
		this.window.removeEventListener('deactivate', this, true);
		this.window.removeEventListener('scroll', this, true);
		this.window.removeEventListener('dragover', this, false);
		this.window.removeEventListener('dragleave', this, true);
		this.window.removeEventListener('drop', this, true);
		this.window.removeEventListener('dragend', this, true);
		this._listening = false;
	},

	watchWindowState : function FSW_watchWindowState()
	{
		if (this._watchingWindowStateTimer || !this._window) return;
		this.lastWindowState = this.windowState;
		this._watchingWindowStateTimer = this.window.setInterval(function(aSelf) {
			aSelf._checkWindowState();
		}, 500, this);
	},
	_watchingWindowStateTimer : undefined,

	unwatchWindowState : function FSW_unwatchWindowState()
	{
		if (!this._watchingWindowStateTimer) return;
		this.window.clearInterval(this._watchingWindowStateTimer);
		this._watchingWindowStateTimer = undefined;
	},

	handleEvent : function FSW_handleEvent(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'load':
				this.window.removeEventListener('load', this, false);
				this._initAfterLoad();
				return;

			case 'unload':
				return this.destroy();


			case 'DOMAttrModified':
				return this._onDOMAttrModified(aEvent);

			case 'resize':
				if (aEvent.target == this.window)
					this.onResize();
				return;

			case 'activate':
				return this.onActivate();

			case 'deactivate':
				return this.onDeactivate();

			case 'scroll':
				return this.onScroll(aEvent);


			case 'dragover':
				return this._onDragOver(aEvent);

			case 'dragleave':
				return this._onDragLeave(aEvent);

			case 'drop':
				return this._onDrop(aEvent);

			case 'dragend':
				return this._onDragEnd(aEvent);
		}
	},

	observe : function FSW_observe(aSubject, aTopic, aData)
	{
		switch (aTopic)
		{
			case 'domwindowclosed':
				if (aSubject == this.window)
					this._preDestroy();
				return;
		}
	},

	_onDOMAttrModified : function FSW_onDOMAttrModified(aEvent)
	{
		if (aEvent.target != this.documentElement)
			return;

		switch (aEvent.attrName)
		{
			case 'screenX':
			case 'screenY':
				return this.onMove();

			case 'sizemode':
				return this.onSizeModeChange(aEvent.newValue);
		}
	},

	_checkWindowState : function FSW_checkWindowState()
	{
		if (this.lastWindowState != this.windowState) {
			this._onWindowStateChange();
		}
		else if (
			!this.positioning &&
			(this.x != this.lastX || this.y != this.lastY)
			) {
			this.onMove();
		}
	},

	_onWindowStateChange : function FSW_onWindowStateChange()
	{
		if (!this._window)
			return;

		var state = this.windowState;
		var lastState = this.lastWindowState;
		if (state == lastState)
			return;

		this.lastWindowState = state;

		if (!this.parent || this.windowStateUpdating)
			return;

		this.windowStateUpdating++;

		try {
			switch (state)
			{
				case this.STATE_MINIMIZED:
					/**
					 * When the active window is minimized, another member can be focused.
					 * So we have to minimize other windows with a delay.
					 */
					let self = this;
					Deferred.next(function() {
						self.root.minimize(this);
					})
					.error(this.defaultHandleError);
					break;

				default:
					if (lastState == this.STATE_MINIMIZED) {
						this.root.restore(this);
					}
					break;
			}
		}
		catch(e) {
			this.dumpError(e, 'FoxSplitter: FAILED TO MINIMIZE/RESTORE WINDOWS!');
		}

		this.windowStateUpdating--;
	},

	onMove : function FSW_onMove()
	{
		if (
			!this._window ||
			this.lastX === null ||
			this.lastY === null ||
			this.positioning ||
			this.minimized
			)
			return;

		var x = this.x;
		var y = this.y;
		var root = this.root;
		if (root) {
			root.moveBy(x - this.lastX, y - this.lastY, this);
			this.parent.reserveResetPositionAndSize(this); // for safety
		}

		this.lastX = x;
		this.lastY = y;
	},

	onResize : function FSW_onResize()
	{
		if (!this._window || this.resizing || this.minimized)
			return;

		var x = this.x;
		var y = this.y;
		var width  = this.width;
		var height = this.height;

		if (x != this.lastX)
			this.onResizeLeft(this.lastX - x);
		else if (width != this.lastWidth)
			this.onResizeRight(width - this.lastWidth);

		if (y != this.lastY)
			this.onResizeTop(this.lastY - y);
		else if (height != this.lastHeight)
			this.onResizeBottom(height - this.lastHeight);

		this.lastX      = x;
		this.lastY      = y;
		this.lastWidth  = width;
		this.lastHeight = height;

		if (this.parent)
			this.parent.reserveResetPositionAndSize(this); // for safety
	},

	onActivate : function FSW_onActivate()
	{
		if (!this._window || this.raising || this.minimized)
			return;

		this.active = true;
		this.raising++;

		if (this._reservedHandleRaised)
			this._reservedHandleRaised.cancel();

		var self = this;
		this._reservedHandleRaised = Deferred.next(function() {
			delete self._reservedHandleRaised;
			self._handleRaised();
		});
		this._reservedHandleRaised
			.error(this.defaultHandleError)
			.next(function() {
				self.raising--;
			});

		if (this._reservedHandleLowered) {
			this._reservedHandleLowered.cancel();
			delete this._reservedHandleLowered;
		}
	},
	_handleRaised : function FSW_handleRaised()
	{
		if (!this._window || this.minimized)
			return;

		if (!this.parent)
			this.clearGroupedAppearance();

		if (!this.parent || this.root.hasMinimizedWindow) {
			// _onWindowStateChange() should handle this event instead of this method.
			return;
		}

		this.root.raise(this);
	},

	onDeactivate : function FSW_onDeactivate()
	{
		if (!this._window || this.raising || this.minimized)
			return;

		if (this._reservedHandleRaised) {
			this._reservedHandleRaised.cancel();
			delete this._reservedHandleRaised;
		}

		if (this._reservedHandleLowered)
			this._reservedHandleLowered.cancel();

		var self = this;
		this._reservedHandleLowered = Deferred.next(function() {
			delete self._reservedHandleLowered;
			self._handleLowered();
		});
		this._reservedHandleLowered
			.error(this.defaultHandleError);
	},
	_handleLowered : function FSW_handleLowered()
	{
		if (!this._window || !this.parent || this.raising)
			return;

		this.setGroupedAppearance();
	},

	onScroll : function FSW_onScroll(aEvent)
	{
		if (!this._window || !this.parent || this.scrolling || !this.syncScroll)
			return;

		var scrolledFrame = aEvent.originalTarget.defaultView;
		if (
			// ignore scrolling in Firefox UI
			scrolledFrame.top == this.window ||
			// ignore scrolling in background tabs
			scrolledFrame.top != this.browser.contentWindow
			)
			return;

		this.scrolling++;

		try {
			var xFactor = scrolledFrame.scrollX / scrolledFrame.scrollMaxX;
			var yFactor = scrolledFrame.scrollY / scrolledFrame.scrollMaxY;
			var frames = this._collectAllFrames(scrolledFrame.top);
			var index = frames.indexOf(scrolledFrame);
			this.root.allWindows.forEach(function(aFSWindow) {
				if (aFSWindow.syncScroll)
					aFSWindow._setScrollPosition(xFactor, yFactor, index);
			}, this);
		}
		catch(e) {
			this.dumpError(e, 'FoxSplitter: FAILED TO SYNC SCROLL!');
		}

		this.scrolling--;
	},

	_collectAllFrames : function FSW_getAllFrames(aFrame)
	{
		var frames = [aFrame];
		frames.push(aFrame);
		Array.forEach(aFrame.frames, function(aFrame) {
			frames = frames.concat(this._collectAllFrames(aFrame));
		}, this);
		return frames;
	},

	_setScrollPosition : function FSW_applyScroll(aXFactor, aYFactor, aFrameIndex)
	{
		if (!this._window || this.scrolling)
			return;

		this.scrolling++;

		var frames = this._collectAllFrames(this.browser.contentWindow);
		if (!aFrameIndex || aFrameIndex >= frames.length)
			aFrameIndex = 0;

		var frame = frames[aFrameIndex];
		frame.scrollTo(
			(this.syncScrollX ? (aXFactor * frame.scrollMaxX) : frame.scrollX ),
			(this.syncScrollY ? (aYFactor * frame.scrollMaxY) : frame.scrollY )
		);
		var self = this;
		Deferred.next(function() {
			self.scrolling--;
		});
	},

	onSizeModeChange : function FSW_onSizeModeChange(aMode)
	{
		switch (aMode)
		{
			case 'maximized':
				return this._onMaximized(false);
			case 'fullscreen':
				return this._onMaximized(true);
		}
	},

	_onMaximized : function FSW_onMaximized(aFullScreen)
	{
		if (!this._window || !this.parent)
			return;

		this.resizing++;
		this.positioning++;

		var root = this.root;
		try {
			root.readyToMaximize();
		}
		catch(e) {
			this.dumpError(e, 'FoxSplitter: FAILED TO MAXIMIZE!');
			this.resizing--;
			this.positioning--;
			return;
		}

		var maximizedX, maximizedY, maximizedWidth, maximizedHeight;
		var self = this;
		Deferred
			.next(function() {
				maximizedX = self.x;
				maximizedY = self.y;
				maximizedWidth = self.width;
				maximizedHeight = self.height;

				if (aFullScreen)
					self.window.fullScreen = false;
				else
					self.window.restore();
			})
			.error(function(aError) {
				self.dumpError(e, 'FoxSplitter: FAILED TO MAXIMIZE!');
			})
			.next(function() {
				self.resizing--;
				self.positioning--;
			})
			.next(function() {
				if (root.maximized)
					root.restore();
				else
					root.maximizeTo({
						x          : maximizedX,
						y          : maximizedY,
						width      : maximizedWidth,
						height     : maximizedHeight,
						fullScreen : aFullScreen
					});
			})
			.error(this.defaultHandleError);
	},

	// called by the parent group
	setGroupedAppearance : function FSW_setGroupedAppearance()
	{
		if (!this._window)
			return;

		this._initToolbarState();

		if (
			this.shouldAutoHideTabs &&
			this.browser &&
			this._autoHideWasEnabled === undefined
			) {
			let treeStyleTab = this.browser.treeStyleTab;
			if (treeStyleTab && treeStyleTab.autoHide && treeStyleTab.toggleAutoHide) {
				let enabled = treeStyleTab.autoHide.mode != treeStyleTab.autoHide.kMODE_DISABLED;
				this._autoHideWasEnabled = enabled;
				if (treeStyleTab.toggleAutoHide && !enabled) {
					treeStyleTab.toggleAutoHide();
				}
			}
		}
	},
	get _autoHideWasEnabled()
	{
		return FoxSplitterWindow._autoHideWasEnabled;
	},
	set _autoHideWasEnabled(aValue)
	{
		return FoxSplitterWindow._autoHideWasEnabled = aValue;
	},
	_initToolbarState : function FSW_initToolbarState()
	{
		if (
			!this._window ||
			!this.shouldAutoSmallizeToolbarMode ||
			this._originalToolbarState
			)
			return;

		var state = {};
		this.toolbars.forEach(function(aToolbar, aIndex) {
			let key = aToolbar.id ? 'id:'+aToolbar.id : 'index:'+aIndex;
			state[key] = {
				mode     : aToolbar.getAttribute('mode'),
				iconsize : aToolbar.getAttribute('iconsize')
			};
			aToolbar.setAttribute('mode', 'icons');
			aToolbar.setAttribute('iconsize', 'small');
		}, this);
		this._originalToolbarState = state;
	},

	// called by the parent group
	clearGroupedAppearance : function FSW_clearGroupedAppearance(aForce)
	{
		if (!this._window)
			return;

		this._restoreToolbarState(aForce);

		if (
			this.shouldAutoHideTabs &&
			this.browser &&
			this._autoHideWasEnabled !== undefined &&
			(
				aForce ||
				(
					!this.parent &&
					FoxSplitterWindow.instances.length == 1
				)
			)
			) {
			let treeStyleTab = this.browser.treeStyleTab;
			if (treeStyleTab && treeStyleTab.autoHide && treeStyleTab.toggleAutoHide) {
				let enabled = treeStyleTab.autoHide.mode != treeStyleTab.autoHide.kMODE_DISABLED;
				if (treeStyleTab.toggleAutoHide && enabled != this._autoHideWasEnabled)
					treeStyleTab.toggleAutoHide();
			}
			this._autoHideWasEnabled = undefined;
		}
	},
	_restoreToolbarState : function FSW_restoreToolbarState(aForce)
	{
		if (!this._window || !this.shouldAutoSmallizeToolbarMode)
			return;

		var state = this._originalToolbarState;
		delete this._originalToolbarState;
		if (state && this._window) {
			this.toolbars.forEach(function(aToolbar, aIndex) {
				let key = aToolbar.id ? 'id:'+aToolbar.id : 'index:'+aIndex;

				if (state[key].mode)
					aToolbar.setAttribute('mode', state[key].mode);
				else
					aToolbar.removeAttribute('mode');

				if (state[key].iconsize)
					aToolbar.setAttribute('iconsize', state[key].iconsize);
				else
					aToolbar.removeAttribute('iconsize');
			}, this);
		}
	},


	_getDragInfo : function FSW_getDragInfo(aEvent)
	{
		var dragInfo = {
				tabs     : [],
				links    : [],
				canDrop  : false,
				position : this.POSITION_OUTSIDE,
				allTabs  : false,
				target   : this
			};
		if (aEvent.shiftKey != this.handleDragWithShiftKey)
			return dragInfo;

		dragInfo.tabs  = this._getDraggedTabs(aEvent);
		dragInfo.links = this._getDraggedLinks(aEvent);

		var sourceFSWindow = dragInfo.tabs.length && dragInfo.tabs[0].ownerDocument.defaultView.FoxSplitter;
		if (sourceFSWindow && sourceFSWindow.visibleTabs.length == dragInfo.tabs.length)
			dragInfo.allTabs = true;

		dragInfo.canDrop = !!(
			dragInfo.tabs.length ?
				(
					this.handleDragWithShiftKey ||
					!this._isEventFiredOnTabbar(aEvent)
				) :
				dragInfo.links.length
		);
		dragInfo.position = this._getDropPosition(aEvent);

		/**
		 * If this window has a parent, then the dragged tab can be
		 * attached to a FoxSplitterGroup itself (not a FoxSplitterWindow).
		 */
		if (this.parent) {
			let parent = this.sameAxisRoot;
			/**
			 * ...However, we must ignore an edge case. If the dragging
			 * will move the window itself and the dragged window is the
			 * sibling of this window, then, Fox Splitter will do following
			 * processes:
			 *
			 *  1. The dragged window is detached from its parent group.
			 *  2. The parent group of the dragged window automatically
			 *     destroys itself, *because there is only one member left (A)*.
			 *     (If the dragged window is the sibling of this window,
			 *     this window also loses its parent.)
			 *  3. Fox Splitter tries to attach the dragged window to the
			 *     drop target goup.
			 *  4. However, *if the drop target is the parent of both windows
			 *     this and the dragged (B)*, it has been already destroyed
			 *     and we cannot attach the dragged window anymore.
			 *
			 * As the result, Fox Splitter will fail to move the dragged
			 * window. So, we should ignore the "possibly drop target" group
			 * if both (A) and (B) are true.
			 */
			if (!dragInfo.allTabs || parent != this.parent) {
				if (dragInfo.position & this.POSITION_HORIZONTAL &&
					this.position & this.POSITION_VERTICAL) {
					let parentY = parent.y;
					let area = this.height / 3;
					let y = aEvent.screenY - this.y;
					if (
						y < area ?
							this.y != parentY :
						y > area * 2 ?
							this.y + this.height != parentY + parent.height :
							false
						)
						dragInfo.target = parent;
				}
				else if (dragInfo.position & this.POSITION_VERTICAL &&
						this.position & this.POSITION_HORIZONTAL) {
					let parentX = parent.x;
					let area = this.width / 3;
					let x = aEvent.screenX - this.x;
					if (
						x < area ?
							this.x != parentX :
						x > area * 2 ?
							this.x + this.width != parentX + parent.width :
							false
						)
						dragInfo.target = parent;
				}
			}
		}

		// window move?
		if (dragInfo.canDrop && dragInfo.allTabs && !this.isAccelKeyPressed(aEvent))
			dragInfo.canDrop = (
				// Ignore dropping on the dragged window itself.
				dragInfo.target != sourceFSWindow &&
				(// Ignore dropping to the position between this and the dragged window.
					dragInfo.target != sourceFSWindow.sibling ||
					dragInfo.position != sourceFSWindow.position
				)
			);

		if (!dragInfo.canDrop)
			dragInfo.position = this.POSITION_OUTSIDE;

		return dragInfo;
	},

	_onDragOver : function FSW_onDragOver(aEvent)
	{
		var dragInfo = this._getDragInfo(aEvent);
		if (!dragInfo.canDrop ||
			!(dragInfo.position & this.POSITION_VALID)) {
			this._reserveHideAllDropIndicator();
			return;
		}

		this._cancelReserveHideAllDropIndicator();
		this._reserveHandleDragOver(dragInfo);

		aEvent.dataTransfer.effectAllowed = 'all';
		aEvent.dataTransfer.dropEffect = dragInfo.tabs.length ?
				(this.isAccelKeyPressed(aEvent) ? 'copy' : 'move' ) :
				'link' ;
		aEvent.preventDefault();
	},
	_reserveHandleDragOver : function FSW_reserveHandleDragOver(aDragInfo)
	{
		if (this._reservedHandleDragOver)
			return;

		var self = this;
		this._reservedHandleDragOver = Deferred.wait(0.25);
		this._reservedHandleDragOver
			.next(function() {
				delete self._reservedHandleDragOver;
				self._updateDropIndicator(aDragInfo.position, aDragInfo.target);
			})
			.error(this.defaultHandleError);
	},

	_onDragLeave : function FSW_onDragLeave(aEvent)
	{
		this._reserveHideAllDropIndicator();
	},

	_onDrop : function FSW_onDrop(aEvent)
	{
		var dragInfo = this._getDragInfo(aEvent);
		if (!dragInfo.canDrop)
			return;

		var tabs = dragInfo.tabs;
		var links = dragInfo.links;
		var position = dragInfo.position;
		var target = dragInfo.target;

		FoxSplitterWindow.instances.forEach(function(aFSWindow) {
			aFSWindow.hideDropIndicator();
		});

		if (!(position & this.POSITION_VALID))
			return;

		aEvent.stopPropagation();
		aEvent.preventDefault();

		var deferred;
		if (tabs.length) {
			let browser = this._getTabBrowserFromTab(tabs[0]);
			let allTabs = browser.visibleTabs || browser.mTabContainer.childNodes;
			if (this.isAccelKeyPressed(aEvent)) {
				deferred = this.duplicateTabsIn(tabs, position);
			}
			else if (allTabs.length == tabs.length) {
				let window = tabs[0].ownerDocument.defaultView;
				window.FoxSplitter.detach();
				window.FoxSplitter.attachTo(this, position);
				deferred = Deferred.next(function() {
					return window;
				});
			}
			else {
				deferred = this.moveTabsTo(tabs, position);
			}
		}
		else {
			deferred = this.openLinksIn(links, position);
		}

		if (target != this)
			deferred.next(function(aWindow) {
				var FSWindow = aWindow.FoxSplitter;
				var position = FSWindow.opposite[FSWindow.position];
				FSWindow.detach();
				FSWindow.moveTo(target.x, target.y);
				FSWindow.resizeTo(target.width, target.height);
				target.attachTo(FSWindow, position);
			})
			.error(this.defaultHandleError);
	},

	_onDragEnd : function FSW_onDragEnd(aEvent)
	{
		if (!this._window)
			return;

		Deferred.next(function() {
			FoxSplitterWindow.instances.forEach(function(aFSWindow) {
				aFSWindow.hideDropIndicator();
			});
		})
		.error(this.defaultHandleError);
	},

	_getTabFromEvent : function FSW_getTabFromEvent(aEvent)
	{
		var node = aEvent.originalTarget;
		var d = node.ownerDocument;
		if (!d)
			return null;
		return d.evaluate(
				'ancestor-or-self::*[local-name()="tab" and contains(concat(" ", @class, " "), " tabbrowser-tab ")][1]',
				node,
				null,
				Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue;
	},

	_isEventFiredOnTabbar : function FSW_isEventFiredOnTabbar(aEvent)
	{
		var node = aEvent.originalTarget;
		var d = node.ownerDocument;
		if (!d)
			return false;
		return d.evaluate(
				'ancestor-or-self::*[local-name()="tabs" and contains(concat(" ", @class, " "), " tabbrowser-tabs ")][1]',
				node,
				null,
				Ci.nsIDOMXPathResult.BOOLEAN_TYPE,
				null
			).booleanValue;
	},

	_getDraggedTabs : function FSW_getDraggedTabs(aEvent)
	{
		var dt = aEvent.dataTransfer;
		var tabs = [];
		if (dt.mozItemCount < 1 ||
			!dt.mozTypesAt(0).contains(TAB_DROP_TYPE))
			return tabs;

		for (let i = 0, maxi = dt.mozItemCount; i < maxi; i++)
		{
			tabs.push(dt.mozGetDataAt(TAB_DROP_TYPE, i));
		}
		return tabs.sort(function(aA, aB) { return aA._tPos - aB._tPos; });
	},

	_getDraggedLinks : function FSW_getDraggedLinks(aEvent)
	{
		var dt = aEvent.dataTransfer;
		var urls = [];
		var types = [
				'text/uri-list',
				'text/x-moz-text-internal',
				'text/x-moz-url',
				'text/plain',
				'application/x-moz-file'
			];
		for (let i = 0; i < types.length; i++) {
			let dataType = types[i];
			for (let i = 0, maxi = dt.mozItemCount; i < maxi; i++)
			{
				let urlData = dt.mozGetDataAt(dataType, i);
				if (urlData) {
					urls = urls.concat(this._retrieveURLsFromData(urlData, dataType));
				}
			}
			if (urls.length)
				break;
		}
		return urls;
	},
	_retrieveURLsFromData : function FSW_retrieveURLsFromData(aData, aType)
	{
		switch (aType)
		{
			case 'text/uri-list':
				return aData.replace(/\r/g, '\n')
							.replace(/^\#.+$/gim, '')
							.replace(/\n\n+/g, '\n')
							.split('\n');

			case 'text/unicode':
			case 'text/plain':
			case 'text/x-moz-text-internal':
				return [aData.replace(/^\s+|\s+$/g, '')];

			case 'text/x-moz-url':
				return [((aData instanceof Ci.nsISupportsString) ? aData.toString() : aData)
							.split('\n')[0]];

			case 'application/x-moz-file':
				let fileHandler = Cc['@mozilla.org/network/io-service;1']
									.getService(Ci.nsIIOService)
									.getProtocolHandler('file')
									.QueryInterface(Ci.nsIFileProtocolHandler);
				return [fileHandler.getURLSpecFromFile(aData)];
		}
		return [];
	},

	_getTabBrowserFromTab : function FSW_getTabBrowserFromTab(aTab)
	{
		return aTab.ownerDocument.defaultView.FoxSplitter.browser;
	},

	_getDropPosition : function FSW_getDropPosition(aEvent)
	{
		var oX = this.x;
		var oY = this.y;
		var x = aEvent.screenX - oX;
		var y = aEvent.screenY - oY;
		var width = this.width;
		var height = this.height;

		// out of area
		if (x < 0 || x > width || y < 0 || y > height)
			return this.POSITION_OUTSIDE;

		// too inside
		if (
			this.dropZoneSize < x && width - this.dropZoneSize > x &&
			this.dropZoneSize < y && height - this.dropZoneSize > y
			)
			return this.POSITION_INSIDE;

		var isTopLeft    = x <= width - (y * width / height);
		var isBottomLeft = x <= y * width / height;

		return (isTopLeft && isBottomLeft) ? this.POSITION_LEFT :
			(isTopLeft && !isBottomLeft) ? this.POSITION_TOP :
			(!isTopLeft && isBottomLeft) ? this.POSITION_BOTTOM :
			this.POSITION_RIGHT ;
	},

	_updateDropIndicator : function FSW_updateDropIndicator(aPosition, aTarget)
	{
		if (!this._window || !(aPosition & this.POSITION_VALID)) {
			this._reserveHideAllDropIndicator();
			return;
		}

		this._cancelReserveHideAllDropIndicator();

		if (this._lastDropPosition != aPosition) {
			let self = this;
			this.hideDropIndicator()
				.next(function() {
					self._showDropIndicatorAt(aPosition, aTarget);
				});
		}
		else if (!this._dropIndicator || this._dropIndicator.state != 'open') {
			this._showDropIndicatorAt(aPosition, aTarget);
		}
	},

	_showDropIndicatorAt : function FSW_showDropIndicatorAt(aPosition, aTarget)
	{
		if (!this._window)
			return Deferred.next(function() {});

		var deferred = new Deferred();

		var size = 10;
		var indicator = this._dropIndicator;

		if (!indicator) {
			indicator = this._dropIndicator = this.document.createElement('panel');
			indicator.setAttribute('class', this.DROP_INDICATOR+' '+this.positionName[aPosition]);
			let label = indicator.appendChild(this.document.createElement('label'));
			label.style.fontSize = Math.round(size * 0.8)+'px';
			this.documentElement.appendChild(indicator);
		}

		var target = aTarget || this;

		var x = target.x;
		var y = target.y;
		var width  = aPosition & this.POSITION_HORIZONTAL ? size : target.width ;
		var height = aPosition & this.POSITION_VERTICAL ? size : target.height ;
		switch (aPosition)
		{
			case this.POSITION_TOP:
				y = this.y - size;
				indicator.firstChild.setAttribute('value', '\u25B2');
				break;
			case this.POSITION_RIGHT:
				x = this.x + this.width;
				indicator.firstChild.setAttribute('value', '\u25B6');
				break;
			case this.POSITION_BOTTOM:
				y = this.y + this.height;
				indicator.firstChild.setAttribute('value', '\u25BC');
				break;
			case this.POSITION_LEFT:
				x = this.x - size;
				indicator.firstChild.setAttribute('value', '\u25C0');
				break;
		}

		indicator.width = width;
		indicator.height = height;
		indicator.addEventListener('popupshown', function() {
			indicator.removeEventListener('popupshown', arguments.callee, false);
			indicator.style.opacity = 1;
			deferred.call();
		}, false);

		indicator.openPopupAtScreen(x, y, false, null);

		this._lastDropPosition = aPosition;

		return deferred
				.error(this.defaultHandleError);
	},

	hideDropIndicator : function FSW_hideDropIndicator()
	{
		if (!this._window)
			return;

		this._cancelReserveHideAllDropIndicator();

		if (this._reservedHandleDragOver) {
			this._reservedHandleDragOver.cancel();
			delete this._reservedHandleDragOver;
		}

		var deferred = new Deferred();
		var indicator = this._dropIndicator;
		if (!indicator) {
			Deferred.next(function() {
				deferred.call();
			});
			return deferred;
		}

		indicator.style.opacity = 0;

		if (this.window.getComputedStyle(indicator, null).getPropertyValue('opacity') == '0') {
			Deferred.next(function() {
				deferred.call();
			});
		}
		else {
			indicator.addEventListener('transitionend', function() {
				indicator.removeEventListener('transitionend', arguments.callee, false);
				deferred.call();
			}, false);
		}

		var self = this;
		return deferred
				.next(function() {
					return self._hideDropIndicatorPostProcess();
				})
				.error(this.defaultHandleError);
	},
	_hideDropIndicatorPostProcess : function FSW_hideDropIndicatorPostProcess()
	{
		if (!this._window)
			return;

		var deferred = new Deferred();

		var indicator = this._dropIndicator;
		delete this._lastDropPosition;

		if (indicator) {
			delete this._dropIndicator;
			if (indicator.state == 'closed') {
				indicator.parentNode.removeChild(indicator);
				Deferred.next(function() {
					deferred.call();
				});
			}
			else {
				indicator.addEventListener('popuphidden', function() {
					indicator.removeEventListener('popuphidden', arguments.callee, false);
					indicator.parentNode.removeChild(indicator);
					deferred.call();
				}, false);
				indicator.hidePopup();
			}
		}
		else {
			Deferred.next(function() {
				deferred.call();
			});
		}
		return deferred
				.error(this.defaultHandleError);
	},

	_reserveHideAllDropIndicator : function FSW_reserveHideAllDropIndicator()
	{
		this._cancelReserveHideAllDropIndicator();
		var self = this;
		this._reservedHideAllDropIndicator = Deferred.next(function() {
			self._reservedHideAllDropIndicator = undefined;
			FoxSplitterWindow.instances.forEach(function(aFSWindow) {
				aFSWindow.hideDropIndicator();
			});
		});
		this._reservedHideAllDropIndicator.error(this.defaultHandleError);
	},

	_cancelReserveHideAllDropIndicator : function FSW_cancelReserveHideAllDropIndicator()
	{
		if (!this._reservedHideAllDropIndicator)
			return;
		this._reservedHideAllDropIndicator.cancel();
		this._reservedHideAllDropIndicator = undefined;
	},

	get _reservedHideAllDropIndicator()
	{
		return FoxSplitterWindow._reservedHideAllDropIndicator;
	},
	set _reservedHideAllDropIndicator(aValue)
	{
		return FoxSplitterWindow._reservedHideAllDropIndicator = aValue;
	},


	// compatibility for old versions

	LAYOUT_GRID      : FoxSplitterBase.prototype.TILE_MODE_GRID,
	LAYOUT_ON_X_AXIS : FoxSplitterBase.prototype.TILE_MODE_X_AXIS,
	LAYOUT_ON_Y_AXIS : FoxSplitterBase.prototype.TILE_MODE_Y_AXIS,

	get activeBrowser()
	{
		return this.browser;
	},
	getSubBrowserAndBrowserFromFrame : function FSW_getSubBrowserAndBrowserFromFrame(aFrame)
	{
		if (aFrame && this._window) {
			let docShell = aFrame.top
				.QueryInterface(Ci.nsIInterfaceRequestor)
				.getInterface(Ci.nsIWebNavigation)
				.QueryInterface(Ci.nsIDocShell);

			let browsers = this.activeBrowser.browsers;
			for (let i = 0, maxi = browsers.length; i < maxi; i++)
			{
				if (browsers[i].docShell == docShell)
					return {
						subBrowser : null,
						browser    : browsers[i]
					};
			}
		}

		return {
			subBrowser : null,
			browser    : null
		};
	}
};

FoxSplitterWindow.instances = [];
FoxSplitterWindow.instancesById = {};

FoxSplitterWindow.dropZoneSize = 64;
FoxSplitterWindow.handleDragWithShiftKey = false;
FoxSplitterWindow.shouldAutoHideTabs = true;
FoxSplitterWindow.shouldAutoSmallizeToolbarMode = true;
FoxSplitterWindow.syncScrollX = true;
FoxSplitterWindow.syncScrollY = true;

