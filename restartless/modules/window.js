load('base');
load('group');
load('lib/jsdeferred');

var EXPORTED_SYMBOLS = ['FoxSplitterWindow'];

const TAB_DROP_TYPE = 'application/x-moz-tabbrowser-tab';
 
function FoxSplitterWindow(aWindow, aOnInit) 
{
	this.init(aWindow, aOnInit);
}
FoxSplitterWindow.prototype = {
	__proto__ : FoxSplitterBase.prototype,

	kDROP_INDICATOR : 'foxsplitter-drop-indicator',

	kBASE_STYLESHEET : <![CDATA[
/*
		:root[kACTIVE="false"] toolbox,
		:root[kACTIVE="false"] .treestyletab-tabbar,
		:root[kACTIVE="false"] .treestyletab-tabbar-ready {
			visibility: collapse !important;
		}
*/
		.kDROP_INDICATOR {
			background: rgba(0, 0, 0, 0.75);
			border: 0 solid rgba(255, 255, 255, 0.75);
			border-radius: 0;
			line-height: 0;
			margin: 0;
			opacity: 0;
			padding: 0;
			-moz-appearance: none;
			-moz-border-radius: 0;
			-moz-box-align: center;
			-moz-box-pack: center;
			-moz-transition: opacity 0.25s ease-in;
		}

		.kDROP_INDICATOR.top {
			border-top-width: 1px;
		}
		.kDROP_INDICATOR.right {
			border-right-width: 1px;
		}
		.kDROP_INDICATOR.bottom {
			border-bottom-width: 1px;
		}
		.kDROP_INDICATOR.left {
			border-left-width: 1px;
		}

		.kDROP_INDICATOR label {
			color: white;
			line-height: 0;
			margin: 0;
			min-height: 0;
			min-width: 0;
			padding: 0;
		}
	]]>.toString(),

	lastScreenX : null,
	lastScreenY : null,
	lastWidth   : null,
	lastHeight  : null,

	dropZoneSize : 64,
	handleDragWithShiftKey : false,

	get screenX()
	{
		return this.window.screenX;
	},
	get screenY()
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
			(this._position = parseInt(this.documentElement.getAttribute(this.kATTACHED_POSITION)))
		);
	},
	set position(aValue)
	{
		this.documentElement.setAttribute(this.kATTACHED_POSITION, aValue);
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

		this.documentElement.setAttribute(this.kACTIVE, aValue);
//		this._updateChromeHidden();

		return this._active = aValue;
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


	init : function FSW_init(aWindow, aOnInit) 
	{
		this.window = aWindow;

		this.positioning = 0;
		this.resizing    = 0;
		this.raising     = 0;

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
		var styles = this.kBASE_STYLESHEET
						.replace(/kACTIVE/g, this.kACTIVE)
						.replace(/kDROP_INDICATOR/g, this.kDROP_INDICATOR);
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
				arguments[0].hasAttribute(this.kATTACHED_POSITION) &&
				arguments[0].hasAttribute(this.kATTACHED_BASE)
			) ? arguments[0] : null ;

		if (!sourceTab)
			return;

		var baseFSWindow = FoxSplitterWindow.instancesById[sourceTab.getAttribute(this.kATTACHED_BASE)];
		var position = parseInt(sourceTab.getAttribute(this.kATTACHED_POSITION));
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
		if (!aBaseFSWindow || !(aPosition & this.kPOSITION_VALID))
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
		var x, y, width, height;
		if (this.position & this.kPOSITION_HORIZONTAL) {
			y = base.screenY;
			width = Math.round(base.width * 0.5);
			height = base.height;
			if (this.position == this.kPOSITION_LEFT) {
				x = base.screenX;
				base.moveBy(width, 0);
			}
			else {
				x = base.screenX + width;
			}
			base.resizeBy(-width, 0);
		}
		else {
			x = base.screenX;
			width = base.width;
			height = Math.round(base.height * 0.5);
			if (this.position == this.kPOSITION_TOP) {
				y = base.screenY;
				base.moveBy(0, height);
			}
			else {
				y = base.screenY + height;
			}
			base.resizeBy(0, -height);
		}
		this.moveTo(x, y);
		this.resizeTo(width, height);
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

		if (sibling.position & this.kPOSITION_HORIZONTAL) {
			if (sibling.position == this.kPOSITION_RIGHT)
				sibling.moveBy(-this.width, 0);
			sibling.resizeBy(this.width, 0);
		}
		else {
			if (sibling.position == this.kPOSITION_BOTTOM)
				sibling.moveBy(0, -this.height);
			sibling.resizeBy(0, this.height);
		}
	},


	moveTo : function FSW_moveTo(aX, aY)
	{
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
		this.raising++;

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

		var self = this;
		Deferred.next(function() {
			self.raising--;
		});
	},


	openLinksIn : function FSW_openLinkIn(aURIs, aPosition)
	{
		aURIs = aURIs.slice(0);
		var first = aURIs.shift(); // only the first element can be tab
		var deferred = new Deferred();
		var window = this.window.openDialog(
				'chrome://browser/content/browser.xul',
				'_blank',
				'chrome,dialog=no,all',
				first
			);
		var self = this;
		window.addEventListener('load', function() {
			window.removeEventListener('load', arguments.callee, false);
			window.FoxSplitter.attachTo(self, aPosition);
			deferred.call(window);
		}, false);
		return deferred
				.next(function(aWindow) {
					aURIs.forEach(function(aURI) {
						aWindow.gBrowser.addTab(aURI);
					});
					return aWindow;
				});
	},

	openLinkIn : function FSW_openLinkIn(aURIOrTab, aPosition)
	{
		return this.openLinksIn([aURIOrTab], aPosition);
	},

	duplicateTabsIn : function FSW_duplicateTabsIn(aTabs, aPosition)
	{
		return this.openLinkIn('about:blank', aPosition)
				.next(function(aWindow) {
					let firstTab = aWindow.gBrowser.selectedTab;
					aTabs.forEach(function(aTab) {
						aWindow.gBrowser.duplicateTab(aTab);
					});
					aWindow.gBrowser.removeTab(firstTab);
					return aWindow;
				});
	},
	duplicateTabIn : function FSW_duplicateTabIn(aTab, aPosition)
	{
		return this.duplicateTabsIn([aTab], aPosition);
	},

	moveTabsTo : function FSW_moveTabsTo(aTabs, aPosition)
	{
		aTabs = aTabs.slice(0);
		var tab = aTabs.shift();
		tab.setAttribute(this.kATTACHED_POSITION, aPosition);
		tab.setAttribute(this.kATTACHED_BASE, this.id);
		return this.openLinkIn(tab, aPosition)
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
	moveTabTo : function FSW_moveTabTo(aTab, aPosition)
	{
		return this.moveTabsTo([aTab], aPosition);
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

	onMove : function FSW_onMove()
	{
		if (
			this.lastScreenX === null ||
			this.lastScreenY === null ||
			this.positioning
			)
			return;

		var x = this.screenX;
		var y = this.screenY;
		var root = this.root;
		if (root) {
			root.moveBy(x - this.lastScreenX, y - this.lastScreenY, this);
			root.reserveResetPositionAndSize(this); // for safety
		}

		this.lastScreenX = x;
		this.lastScreenY = y;
	},

	onResize : function FSW_onResize()
	{
		if (this.resizing) return;

		var x = this.screenX;
		var y = this.screenY;
		var width  = this.width;
		var height = this.height;

		if (x != this.lastScreenX)
			this.onResizeLeft(this.lastScreenX - x);
		else if (width != this.lastWidth)
			this.onResizeRight(width - this.lastWidth);

		if (y != this.lastScreenY)
			this.onResizeTop(this.lastScreenY - y);
		else if (height != this.lastHeight)
			this.onResizeBottom(height - this.lastHeight);

		this.lastScreenX = x;
		this.lastScreenY = y;
		this.lastWidth = width;
		this.lastHeight = height;

		if (this.parent)
			this.root.reserveResetPositionAndSize(this); // for safety
	},

	onRaised : function FSW_onRaised()
	{
		if (this.raising)
			return;

		this.active = true;
		if (!this.parent)
			return;

		this.root.raise();
		this.raise();
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
		root.readyToMaximize();

		var maximizedX, maximizedY, maximizedWidth, maximizedHeight;
		var self = this;
		Deferred
			.next(function() {
				maximizedX = self.screenX;
				maximizedY = self.screenY;
				maximizedWidth = self.width;
				maximizedHeight = self.height;

				if (aFullScreen)
					self.window.fullScreen = false;
				else
					self.window.restore();

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
				tabs : [],
				link : null,
				canDrop : false,
				position : this.kPOSITION_OUTSIDE
			};
		if (aEvent.shiftKey != this.handleDragWithShiftKey)
			return dragInfo;

		dragInfo.tabs = this._getDraggedTabs(aEvent);
		dragInfo.links = this._getDraggedLinks(aEvent);
		dragInfo.canDrop = (
			(
				dragInfo.tabs.length &&
				(
					this.handleDragWithShiftKey ||
					!this._isEventFiredOnTabbar(aEvent)
				)
			) ||
			dragInfo.links.length
		);

		if (dragInfo.canDrop)
			dragInfo.position = this._getDropPosition(aEvent);

		return dragInfo;
	},

	_onDragOver : function FSW_onDragOver(aEvent)
	{
		var dragInfo = this._getDragInfo(aEvent);
		if (!dragInfo.canDrop)
			return;

		this._updateDropIndicator(dragInfo.position);
		if (dragInfo.position & this.kPOSITION_INVALID)
			return;

		aEvent.dataTransfer.effectAllowed = 'all';
		aEvent.dataTransfer.dropEffect = dragInfo.tabs.length ?
				(aEvent.ctrlKey || aEvent.metaKey ? 'copy' : 'move' ) :
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

		if (!(position & this.kPOSITION_VALID))
			return;

		if (tabs.length) {
			let browser = this._getTabBrowserFromTab(tabs[0]);
			let allTabs = browser.visibleTabs || browser.mTabContainer.childNodes;
			if (aEvent.ctrlKey || aEvent.metaKey)
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
				tabs.push(dt.mozGetDataAt(TAB_DROP_TYPE, i));


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
		var oX = this.screenX;
		var oY = this.screenY;
		var x = aEvent.screenX - oX;
		var y = aEvent.screenY - oY;
		var width = this.width;
		var height = this.height;

		// out of area
		if (x < 0 || x > width || y < 0 || y > height)
			return this.kPOSITION_OUTSIDE;

		// too inside
		if (
			this.dropZoneSize < x && width - this.dropZoneSize > x &&
			this.dropZoneSize < y && height - this.dropZoneSize > y
			)
			return this.kPOSITION_INSIDE;

		var isTopLeft    = x <= width - (y * width / height);
		var isBottomLeft = x <= y * width / height;

		return (isTopLeft && isBottomLeft) ? this.kPOSITION_LEFT :
			(isTopLeft && !isBottomLeft) ? this.kPOSITION_TOP :
			(!isTopLeft && isBottomLeft) ? this.kPOSITION_BOTTOM :
			this.kPOSITION_RIGHT ;
	},

	_updateDropIndicator : function FSW_updateDropIndicator(aPosition)
	{
		if (aPosition & this.kPOSITION_INVALID) {
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
			indicator.setAttribute('class', this.kDROP_INDICATOR+' '+this.positionName[aPosition]);
			let label = indicator.appendChild(this.document.createElement('label'));
			label.style.fontSize = Math.round(size * 0.8)+'px';
			this.documentElement.appendChild(indicator);
		}

		var x = this.screenX;
		var y = this.screenY;
		var width  = aPosition & this.kPOSITION_HORIZONTAL ? size : this.width ;
		var height = aPosition & this.kPOSITION_VERTICAL ? size : this.height ;
		switch (aPosition)
		{
			case this.kPOSITION_TOP:
				y = this.screenY - size;
				indicator.firstChild.setAttribute('value', '\u25B2');
				break;
			case this.kPOSITION_RIGHT:
				x = this.screenX + this.width;
				indicator.firstChild.setAttribute('value', '\u25B6');
				break;
			case this.kPOSITION_BOTTOM:
				y = this.screenY + this.height;
				indicator.firstChild.setAttribute('value', '\u25BC');
				break;
			case this.kPOSITION_LEFT:
				x = this.screenX - size;
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
