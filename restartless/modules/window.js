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

	DROP_INDICATOR : 'foxsplitter-drop-indicator',

	// opacity=0 panel isn't shown on Linux
	MIN_OPACITY : (XULAppInfo.OS == 'Linux' ? '0.01' : '0' ),

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

	lastX : null,
	lastY : null,
	lastWidth   : null,
	lastHeight  : null,

	dropZoneSize : 64,
	handleDragWithShiftKey : false,

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
			let stack = Components.stack;
			let stacks = [stack];
			while (stack.caller)
			{
				stacks.push(stack.caller);
				stack = stack.caller;
			}
			let message = 'illegal access to "window":\n'+stacks.join('\n');
			dump(message+'\n');
			throw new Error(message);
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
		aValue = !!aValue;
		if (aValue && this.parent) {
			this.root.allWindows.forEach(function(aFSWindow) {
				aFSWindow.active = false;
			});
		}

		this.documentElement.setAttribute(this.ACTIVE, aValue);
//		this._updateChromeHidden();

		return this._active = aValue;
	},

	get windowState()
	{
		var state = this.window.windowState;
/*
		if (// on Windows, minimized window is possibly normal and out of screen
			state == this.window.STATE_NORMAL && 
			this.x == -32000 &&
			this.y == -32000
			)
			state = this.window.STATE_MINIMIZED;
*/
		return state;
	},

	get minimized()
	{
		return this.windowState == this.window.STATE_MINIMIZED;
	},

	get documentElement()
	{
		return this.document.documentElement;
	},
	get document() {
		return this.window.document;
	},
	get browser() {
		return this._window && this.window.gBrowser;
	},
	get visibleTabs() {
		return this.browser.visibleTabs ||
				Array.slice(this.browser.mTabContainer.childNodes);
	},


	init : function FSW_init(aWindow, aOnInit) 
	{
		this.window = aWindow;

		this.positioning = 0;
		this.resizing    = 0;
		this.raising     = 0;
		this.windowStateUpdating = 0;

		this.id = this.id || ('window-' + Date.now() + '-' + parseInt(Math.random() * 65000));
		this.parent = null;
		FoxSplitterWindow.instances.push(this);
		FoxSplitterWindow.instancesById[this.id] = this;

		this._installStyleSheet();

		if (!aOnInit)
			aWindow.addEventListener('load', this, false);

		aWindow.addEventListener('unload', this, false);

		this._initGroup(aOnInit);

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
		var self = this;
		Deferred.next(function() {
			self.updateLastPositionAndSize();

			// workaround to fix misrendering by resizing on DOMContentLoaded
			self.resizeBy(0, -1);
			self.resizeBy(0, 1);

			if (self.parent)
				self.parent.reserveResetPositionAndSize(); // for safety

			self.startListen();
		});
	},

	_initGroup : function FSW_initGroup(aOnInit)
	{
		var arguments = this.window.arguments;
		var sourceTab = (
				arguments &&
				arguments.length > 0 &&
				arguments[0] instanceof Ci.nsIDOMElement &&
				arguments[0].localName == 'tab' &&
				arguments[0].hasAttribute(this.ATTACHED_POSITION) &&
				arguments[0].hasAttribute(this.ATTACHED_BASE)
			) ? arguments[0] : null ;

		if (!sourceTab)
			return;

		var baseFSWindow = FoxSplitterWindow.instancesById[sourceTab.getAttribute(this.ATTACHED_BASE)];
		var position = parseInt(sourceTab.getAttribute(this.ATTACHED_POSITION));
		this.attachTo(baseFSWindow, position, aOnInit);
	},

	_updateChromeHidden : function FSW_updateChromeHidden()
	{
		if (!this.active && this.parent)
			this.documentElement.setAttribute('chromehidden', 'menubar toolbar location directories status extrachrome');
		else
			this.documentElement.removeAttribute('chromehidden');
	},


	attachTo : function FSW_attach(aBaseFSWindow, aPosition, aSilent)
	{
		if (!aBaseFSWindow || !(aPosition & this.POSITION_VALID))
			return;

		this.detach();

		var newGroup = new FoxSplitterGroup();
		newGroup.register(this);

		var existingGroup = aBaseFSWindow.parent;
		if (existingGroup) {
			// swap existing relations
			newGroup.position = aBaseFSWindow.position;
			existingGroup.register(newGroup);
			existingGroup.unregister(aBaseFSWindow);
		}
		newGroup.register(aBaseFSWindow);

		this.position = aPosition;
		aBaseFSWindow.position = this.opposite[aPosition];

		Deferred.next(function() {
			aBaseFSWindow.active = true; // always attach new window as a background window
		});

		if (!aSilent)
			this._initPositionAndSize();
	},

	_initPositionAndSize : function FSW_initPositionAndSize()
	{
		var base = this.sibling;
		var positionAndSize = this._calculatePositionAndSize(base, this.position);

		if (positionAndSize.base.deltaX || positionAndSize.base.deltaY)
			base.moveBy(positionAndSize.base.deltaX, positionAndSize.base.deltaY);
		if (positionAndSize.base.deltaWidth || positionAndSize.base.deltaHeight)
			base.resizeBy(positionAndSize.base.deltaWidth, positionAndSize.base.deltaHeight);

		if (this.x != positionAndSize.x || this.y != positionAndSize.y)
			this.moveTo(positionAndSize.x, positionAndSize.y);
		if (this.width != positionAndSize.width || this.height != positionAndSize.height)
			this.resizeTo(positionAndSize.width, positionAndSize.height);
	},

	_calculatePositionAndSize : function FSW_calculatePositionAndSize(aBaseFSWidnow, aPosition)
	{
		var x, y, width, height;
		var base = {
				deltaX      : 0,
				deltaY      : 0,
				deltaWidth  : 0,
				deltaHeight : 0
			};
		if (aPosition & this.POSITION_HORIZONTAL) {
			y = aBaseFSWidnow.y;
			width = Math.round(aBaseFSWidnow.width * 0.5);
			height = aBaseFSWidnow.height;
			if (aPosition == this.POSITION_LEFT) {
				x = aBaseFSWidnow.x;
				base.deltaX = width;
			}
			else {
				x = aBaseFSWidnow.x + width;
			}
			base.deltaWidth = -width;
		}
		else {
			x = aBaseFSWidnow.x;
			width = aBaseFSWidnow.width;
			height = Math.round(aBaseFSWidnow.height * 0.5);
			if (aPosition == this.POSITION_TOP) {
				y = aBaseFSWidnow.y;
				base.deltaY = height;
			}
			else {
				y = aBaseFSWidnow.y + height;
			}
			base.deltaHeight = -height;
		}
		return {
			x      : x,
			y      : y,
			width  : width,
			height : height,
			base   : base
		};
	},

	detach : function FSW_detach()
	{
		if (!this.parent)
			return;

		this._expandSibling();
		this.parent.unregister(this);
	},


	destroy : function FSW_destroy(aOnQuit) 
	{
		this.hideDropIndicator();
		this.unwatchWindowState();

		var id = this.id;

		if (this.parent) {
			if (!aOnQuit)
				this._expandSibling();
			this.parent.unregister(this);
		}

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

	_expandSibling : function FSW_expandSibling()
	{
		var sibling = this.sibling;
		if (!sibling)
			return;

		if (sibling.position & this.POSITION_HORIZONTAL) {
			if (sibling.position == this.POSITION_RIGHT)
				sibling.moveBy(-this.width, 0);
			sibling.resizeBy(this.width, 0);
		}
		else {
			if (sibling.position == this.POSITION_BOTTOM)
				sibling.moveBy(0, -this.height);
			sibling.resizeBy(0, this.height);
		}
	},


	moveTo : function FSW_moveTo(aX, aY)
	{
		if (this.minimized) return;

		this.positioning++;
		this.window.moveTo(aX, aY);
		this.updateLastPositionAndSize();
		var self = this;
		Deferred.next(function() {
			self.updateLastPositionAndSize();
			self.positioning--;
		});
	},

	moveBy : function FSW_moveBy(aDX, aDY)
	{
		if (this.minimized) return;

		this.positioning++;
		this.window.moveBy(aDX, aDY);
		this.updateLastPositionAndSize();
		var self = this;
		Deferred.next(function() {
			self.updateLastPositionAndSize();
			self.positioning--;
		});
	},

	resizeTo : function FSW_resizeTo(aW, aH)
	{
		if (this.minimized) return;

		this.resizing++;
		this.window.resizeTo(aW, aH);
		this.updateLastPositionAndSize();
		var self = this;
		Deferred.next(function() {
			self.updateLastPositionAndSize();
			self.resizing--;
		});
	},

	resizeBy : function FSW_resizeBy(aDW, aDH)
	{
		if (this.minimized) return;

		this.resizing++;
		this.window.resizeBy(aDW, aDH);
		this.updateLastPositionAndSize();
		var self = this;
		Deferred.next(function() {
			self.updateLastPositionAndSize();
			self.resizing--;
		});
	},

	raise : function FSW_raise()
	{
		if (this.minimized) return;

		this.raising++;

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
			dump('FoxSplitter: FAILED TO RAISE A WINDOW!\n'+e+'\n');
		}

		var self = this;
		Deferred.next(function() {
			self.raising--;
		});
	},


	openLinkAt : function FSW_openLinksAt(aURIOrTab, aPositionAndSize)
	{
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
		return deferred;
	},

	openLinksIn : function FSW_openLinkIn(aURIs, aPosition, aBase)
	{
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

		var tab = aTabs.shift();
		tab.setAttribute(this.ATTACHED_POSITION, aPosition);
		tab.setAttribute(this.ATTACHED_BASE, (aBase || this).id);

		return this.openLinkIn(tab, aPosition, aBase)
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
		if (isAllTabs && aTabs.length == 1) {
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
				});
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
		if (!this.parent)
			return;

		var FSWindows = this.root.allWindows;
		var current = FSWindows.indexOf(this);
		var offset = 0;
		var selectedTab = this.browser.selectedTab;
		FSWindows.forEach(function(aFSWindow, aIndex) {
			if (aIndex == current)
				return;

			Array.forEach(aFSWindow.browser.mTabContainer.childNodes, function(aTab) {
				/**
				 * before windows should be imported as leftmost tabs.
				 * after windows should be imported as rightmost tabs.
				 */
				this.importTab(aTab, aIndex < current ? offset++ : -1 );
			});
		}, this);
		/**
		 * swapBrowsersAndCloseOther() focuses to the imported tab,
		 * so we have to focus to the original selected tab again.
		 */
		this.browser.selectedTab = selectedTab;
	},

	importTab : function FSW_importTab(aTab, aPosition)
	{
		var newTab = this.browser.addTab('about:blank');
		newTab.linkedBrowser.stop();
		newTab.linkedBrowser.docShell;
		if (aPosition > -1)
			this.browser.moveTabTo(newTab, aPosition);
		this.browser.swapBrowsersAndCloseOther(newTab, aTab);
		return newTab;
	},


	// event handling

	startListen : function FSW_startListen()
	{
		if (this._listening) return;
		this.window.addEventListener('DOMAttrModified', this, false);
		this.window.addEventListener('resize', this, false);
		this.window.addEventListener('activate', this, true);
		this.window.addEventListener('dragover', this, false);
		this.window.addEventListener('dragleave', this, true);
		this.window.addEventListener('drop', this, true);
		this.window.addEventListener('dragend', this, true);
		this._listening = true;
	},
	_listening : false,

	endListen : function FSW_endListen()
	{
		if (!this._listening) return;
		this.window.removeEventListener('DOMAttrModified', this, false);
		this.window.removeEventListener('resize', this, false);
		this.window.removeEventListener('activate', this, true);
		this.window.removeEventListener('dragover', this, false);
		this.window.removeEventListener('dragleave', this, true);
		this.window.removeEventListener('drop', this, true);
		this.window.removeEventListener('dragend', this, true);
		this._listening = false;
	},

	watchWindowState : function FSW_watchWindowState()
	{
		if (this._watchingWindowStateTimer) return;
		this.lastWindowState = this.windowState;
		this._watchingWindowStateTimer = this.window.setInterval(function(aSelf) {
			aSelf._checkWindowState();
		}, 500, this);
	},
	_watchingWindowStateTimer : null,

	unwatchWindowState : function FSW_unwatchWindowState()
	{
		if (!this._watchingWindowStateTimer) return;
		this.window.clearInterval(this._watchingWindowStateTimer);
		this._watchingWindowStateTimer = null;
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
				return this.onRaised();


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
				case this.window.STATE_MINIMIZED:
					/**
					 * When the active window is minimized, another member can be focused.
					 * So we have to minimize other windows with a delay.
					 */
					let self = this;
					Deferred.next(function() {
						self.root.minimize(this);
					});
					break;

				default:
					if (lastState == this.window.STATE_MINIMIZED) {
						this.root.restore(this);
					}
					break;
			}
		}
		catch(e) {
			dump('FoxSplitter: FAILED TO MINIMIZE/RESTORE WINDOWS!\n'+e+'\n');
		}

		this.windowStateUpdating--;
	},

	onMove : function FSW_onMove()
	{
		if (
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
		if (this.resizing || this.minimized)
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

	onRaised : function FSW_onRaised()
	{
		if (this.raising || this.minimized)
			return;

		if (!this.parent || this.root.hasMinimizedWindow) {
			this.active = true;
			return;
		}

		var self = this;
		Deferred.next(function() {
			if (self.root.hasMinimizedWindow) {
				// _onWindowStateChange() should handle this event instead of this method.
				return;
			}
			self.root.raise();
			self.raise();
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
		if (!this.parent)
			return;

		this.resizing++;
		this.positioning++;

		var root = this.root;
		try {
			root.readyToMaximize();
		}
		catch(e) {
			dump('FoxSplitter: FAILED TO MAXIMIZE!\n'+e+'\n');
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
				dump('FoxSplitter: FAILED TO MAXIMIZE!\n'+aError+'\n');
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
			});
	},


	_getDragInfo : function FSW_getDragInfo(aEvent)
	{
		var dragInfo = {
				tabs     : [],
				links    : [],
				canDrop  : false,
				position : this.POSITION_OUTSIDE,
				allTabs  : false
			};
		if (aEvent.shiftKey != this.handleDragWithShiftKey)
			return dragInfo;

		dragInfo.tabs  = this._getDraggedTabs(aEvent);
		dragInfo.links = this._getDraggedLinks(aEvent);

		var sourceFSWindow = dragInfo.tabs.length && dragInfo.tabs[0].ownerDocument.defaultView.FoxSplitter;
		if (sourceFSWindow && sourceFSWindow.visibleTabs.length == dragInfo.tabs.length)
			dragInfo.allTabs = true;

		dragInfo.canDrop = (
			dragInfo.tabs.length ?
				(
					this.handleDragWithShiftKey ||
					!this._isEventFiredOnTabbar(aEvent)
				) :
				dragInfo.links.length
		);

		var position = this._getDropPosition(aEvent);
		if (dragInfo.allTabs && dragInfo.canDrop && !this.isAccelKeyPressed(aEvent))
			dragInfo.canDrop = (
				this != sourceFSWindow &&
				(
					this != sourceFSWindow.sibling ||
					position != sourceFSWindow.position
				)
			);

		if (dragInfo.canDrop)
			dragInfo.position = position;

		return dragInfo;
	},

	_onDragOver : function FSW_onDragOver(aEvent)
	{
		var dragInfo = this._getDragInfo(aEvent);
		if (!dragInfo.canDrop)
			return;

		this._updateDropIndicator(dragInfo.position);
		if (!(dragInfo.position & this.POSITION_VALID))
			return;

		aEvent.dataTransfer.effectAllowed = 'all';
		aEvent.dataTransfer.dropEffect = dragInfo.tabs.length ?
				(this.isAccelKeyPressed(aEvent) ? 'copy' : 'move' ) :
				'link' ;
		aEvent.preventDefault();
	},

	_onDragLeave : function FSW_onDragLeave(aEvent)
	{
		this._reserveHideDropIndicator();
	},

	_onDrop : function FSW_onDrop(aEvent)
	{
		var dragInfo = this._getDragInfo(aEvent);
		if (!dragInfo.canDrop)
			return;

		var tabs = dragInfo.tabs;
		var links = dragInfo.links;
		var position = dragInfo.position;

		FoxSplitterWindow.instances.forEach(function(aFSWindow) {
			aFSWindow.hideDropIndicator();
		});

		if (!(position & this.POSITION_VALID))
			return;

		if (tabs.length) {
			let browser = this._getTabBrowserFromTab(tabs[0]);
			let allTabs = browser.visibleTabs || browser.mTabContainer.childNodes;
			if (this.isAccelKeyPressed(aEvent))
				this.duplicateTabsIn(tabs, position);
			else if (allTabs.length == tabs.length)
				tabs[0].ownerDocument.defaultView.FoxSplitter.attachTo(this, position);
			else
				this.moveTabsTo(tabs, position);
		}
		else {
			this.openLinksIn(links, position);
		}
		aEvent.stopPropagation();
		aEvent.preventDefault();
	},

	_onDragEnd : function FSW_onDragEnd(aEvent)
	{
		if (!this._window)
			return;

		Deferred.next(function() {
			FoxSplitterWindow.instances.forEach(function(aFSWindow) {
				aFSWindow.hideDropIndicator();
			});
		});
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

	_updateDropIndicator : function FSW_updateDropIndicator(aPosition)
	{
		if (!(aPosition & this.POSITION_VALID)) {
			this._reserveHideDropIndicator();
			return;
		}

		this._cancelReserveHideDropIndicator();

		if (this._lastDropPosition != aPosition) {
			let self = this;
			this.hideDropIndicator()
				.next(function() {
					self._showDropIndicatorAt(aPosition);
				});
		}
		else {
			this._showDropIndicatorAt(aPosition);
		}
	},

	_showDropIndicatorAt : function FSW_showDropIndicatorAt(aPosition)
	{
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

		var x = this.x;
		var y = this.y;
		var width  = aPosition & this.POSITION_HORIZONTAL ? size : this.width ;
		var height = aPosition & this.POSITION_VERTICAL ? size : this.height ;
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

		return deferred;
	},

	hideDropIndicator : function FSW_hideDropIndicator()
	{
		this._cancelReserveHideDropIndicator();

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
				});
	},
	_hideDropIndicatorPostProcess : function FSW_hideDropIndicatorPostProcess()
	{
		var deferred = new Deferred();

		var indicator = this._dropIndicator;
		delete this._dropIndicator;
		delete this._lastDropPosition;

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
		return deferred;
	},

	_reserveHideDropIndicator : function FSW_reserveHideDropIndicator()
	{
		this._cancelReserveHideDropIndicator();
		var self = this;
		this._reservedHideDropInidicator = Deferred.next(function() {
			self.hideDropIndicator();
			delete self._reservedHideDropInidicator;
		});
	},

	_cancelReserveHideDropIndicator : function FSW_cancelReserveHideDropIndicator()
	{
		if (!this._reservedHideDropInidicator)
			return;
		this._reservedHideDropInidicator.cancel();
		delete this._reservedHideDropInidicator;
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
		if (aFrame) {
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
