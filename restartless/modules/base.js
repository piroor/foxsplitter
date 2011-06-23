load('lib/jsdeferred');
load('lib/prefs');

var EXPORTED_SYMBOLS = ['FoxSplitterBase'];

const XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
					.getService(Ci.nsIXULAppInfo)
					.QueryInterface(Ci.nsIXULRuntime);

const WindowWatcher = Cc['@mozilla.org/embedcomp/window-watcher;1']
						.getService(Ci.nsIWindowWatcher);

var FoxSplitterConst = require('const');
var domain = FoxSplitterConst.domain;

function FoxSplitterBase() 
{
}
FoxSplitterBase.prototype = {
	__proto__ : FoxSplitterConst,

	newMemberFactor : 0.5,
	normalExpandFactor : 1.2,
	get expandFactor()
	{
		return this.maximized ? 1 : this.normalExpandFactor ;
	},

	get shouldDuplicateOnSplit() { return FoxSplitterBase.shouldDuplicateOnSplit; },
	set shouldDuplicateOnSplit(aValue) { return FoxSplitterBase.shouldDuplicateOnSplit = aValue; },

	get offsetX() { return FoxSplitterBase.offsetX; },
	set offsetX(aValue) {
		prefs.setPref(domain+'platformOffset.x', aValue);
		return FoxSplitterBase.offsetX = aValue;
	},
	get offsetY() { return FoxSplitterBase.offsetY; },
	set offsetY(aValue) {
		prefs.setPref(domain+'platformOffset.y', aValue);
		return FoxSplitterBase.offsetY = aValue;
	},
	get offsetWidth() { return FoxSplitterBase.offsetWidth; },
	set offsetWidth(aValue) {
		prefs.setPref(domain+'platformOffset.width', aValue);
		return FoxSplitterBase.offsetWidth = aValue;
	},
	get offsetHeight() { return FoxSplitterBase.offsetHeight; },
	set offsetHeight(aValue) {
		prefs.setPref(domain+'platformOffset.height', aValue);
		return FoxSplitterBase.offsetHeight = aValue;
	},

	isGroup : false,

	get root()
	{
		var parent = this;
		while (parent.parent)
		{
			parent = parent.parent;
		}
		return (parent && parent != this) ? parent : null ;
	},

	get sameAxisRoot()
	{
		var parent = this;
		var isHorizontal = this.position & this.POSITION_HORIZONTAL;
		while (
				parent.parent &&
				(parent.position & this.POSITION_HORIZONTAL) == isHorizontal
			)
		{
			parent = parent.parent;
		}
		return (parent && parent != this) ? parent : this.parent ;
	},

	get sibling()
	{
		var parent = this.parent;
		if (!parent || parent.members.length < 2)
			return null;

		var otherMembers = parent.members.filter(function(aMember) {
				return aMember != this;
			}, this);
		return otherMembers[0];
	},


	// group management

	createGroup : function FSB_createGroup()
	{
		if (!this.groupClass)
			throw new Error('no constructor for groups');

		return new this.groupClass();
	},

	bindWith : function FSB_bindWith(aSibling, aPosition, aSilent)
	{
		if (!aSibling || !(aPosition & this.POSITION_VALID))
			return;

		if (this.parent)
			this.unbind();

		if (!this.parent && this.maximized)
			this.restore();
		if (!aSibling.parent && aSibling.maximized)
			aSibling.restore();

		var newGroup = this.createGroup();

		var existingGroup = aSibling.parent;
		if (existingGroup) {
			// swap existing relations
			newGroup.position = aSibling.position;
			existingGroup.register(newGroup);
			existingGroup.unregister(aSibling);
		}

		newGroup.register(aSibling);
		newGroup.register(this);

		this.position = aPosition;
		aSibling.position = this.opposite[aPosition];

		if (!aSilent)
			this._initPositionAndSize();

		if (!this.isGroup) {
			this.setGroupedAppearance();
			this.saveState();

			let self = this;
			Deferred.next(function() {
				self.active = self.active; // update status of grouped windows
			});
		}

		if (!aSibling.isGroup) {
			aSibling.setGroupedAppearance();
			aSibling.saveState();
		}
	},

	_initPositionAndSize : function FSB_initPositionAndSize()
	{
		var base = this.sibling;
		var positionAndSize = base.calculatePositionAndSizeFor(this.position);

		if (positionAndSize.base.deltaX || positionAndSize.base.deltaY)
			base.moveBy(positionAndSize.base.deltaX, positionAndSize.base.deltaY);
		if (positionAndSize.base.deltaWidth || positionAndSize.base.deltaHeight)
			base.resizeBy(positionAndSize.base.deltaWidth, positionAndSize.base.deltaHeight);

		if (this.x != positionAndSize.x || this.y != positionAndSize.y)
			this.moveTo(positionAndSize.x, positionAndSize.y);
		if (this.width != positionAndSize.width || this.height != positionAndSize.height)
			this.resizeTo(positionAndSize.width, positionAndSize.height);

		this.parent.reserveResetPositionAndSize(this);
	},

	calculatePositionAndSizeFor : function FSB_calculatePositionAndSizeFor(aPosition)
	{
		var x, y, width, height;
		var base = {
				deltaX      : 0,
				deltaY      : 0,
				deltaWidth  : 0,
				deltaHeight : 0
			};
		var group = (this.isGroup && this || this.root);
		var maximized = this.maximized;
		var baseWindow = (group && group.allWindows[0] || this).window;
		if (aPosition & this.POSITION_HORIZONTAL) {
			y = this.y;
			let baseWidth = maximized ?
							this.width :
							Math.min(baseWindow.screen.availWidth, this.width * this.expandFactor) ;
			let deltaX = Math.round((baseWidth - this.width) / 2);
			width = Math.round(baseWidth * this.newMemberFactor);
			height = this.height;
			if (aPosition == this.POSITION_LEFT) {
				x = this.x - (deltaX * 2);
				base.deltaX = width - (deltaX * 2);
			}
			else {
				x = this.x + baseWidth - width;
			}
			base.deltaWidth = -width + (deltaX * 2);
		}
		else {
			x = this.x;
			width = this.width;
			let baseHeight = maximized ?
							this.height :
							Math.min(baseWindow.screen.availHeight, this.height * this.expandFactor) ;
			let deltaY = Math.round((baseHeight - this.height) / 2);
			height = Math.round(baseHeight * this.newMemberFactor);
			if (aPosition == this.POSITION_TOP) {
				y = this.y - (deltaY * 2);
				base.deltaY = height - (deltaY * 2);
			}
			else {
				y = this.y + baseHeight - height;
			}
			base.deltaHeight = -height + (deltaY * 2);
		}
		return {
			x      : x,
			y      : y,
			width  : width,
			height : height,
			base   : base
		};
	},

	_findBindTarget : function FSB_findBindTarget(aEvent, aPosition)
	{
		var parent = this.parent;
		if (!parent)
			return this;

		if (aPosition & this.POSITION_HORIZONTAL &&
			this.position & this.POSITION_VERTICAL) {
			let y = aEvent.screenY - this.y;
			let area = this.height / 3;
			if (y > area && y < area * 2)
				return this;
		}
		else if (aPosition & this.POSITION_VERTICAL &&
				this.position & this.POSITION_HORIZONTAL) {
			let x = aEvent.screenX - this.x;
			let area = this.width / 3;
			if (x > area && x < area * 2)
				return this;
		}

		return this.parent._findBindTarget(aEvent, aPosition);
	},

	unbind : function FSB_unbind(aSilent)
	{
		if (!this.parent)
			return;

		var sibling = this.sibling;

		if (!aSilent)
			this._expandSibling();

		this.parent.unregister(this);

		if (!this.isGroup) {
			this.clearGroupedAppearance();
			if (!aSilent)
				this.saveState();
		}
		if (sibling && !sibling.isGroup) {
			sibling.clearGroupedAppearance();
			if (!aSilent)
				sibling.saveState();
		}
	},

	_expandSibling : function FSB_expandSibling()
	{
		var sibling = this.sibling;
		if (!sibling)
			return;

		if (sibling.position & this.POSITION_HORIZONTAL) {
			let totalWidth = this.parent.width;
			let deltaX = this.maximized ? 0 : Math.round(totalWidth - (totalWidth / this.expandFactor)) ;
			if (sibling.position == this.POSITION_RIGHT) {
				// if this is a member of a nested groups, we should not move whole groups right.
				let deltaXToMove = sibling.parent.parent ? 0 : deltaX ;
				sibling.moveBy(-this.width + deltaXToMove, 0);
			}
			sibling.resizeBy(this.width - deltaX, 0);
		}
		else {
			let totalHeight = this.parent.height;
			let deltaY = this.maximized ? 0 : Math.round(totalHeight - (totalHeight / this.expandFactor)) ;
			if (sibling.position == this.POSITION_BOTTOM) {
				// if this is a member of a nested groups, we should not move whole groups bottom.
				let deltaYToMove = sibling.parent.parent ? 0 : deltaY ;
				sibling.moveBy(0, -this.height + deltaYToMove);
			}
			sibling.resizeBy(0, this.height - deltaY);
		}

		if (sibling.parent.parent)
			sibling.parent.parent.reserveResetPositionAndSize(sibling);
	},


	// commands to create new pane

	_openWindow : function FSB_openWindow(aURIOrTab, aPositionAndSize)
	{
		var options = [
				'chrome,dialog=no,all',
				'screenX='+aPositionAndSize.x,
				'screenY='+aPositionAndSize.y,
				'outerWidth='+aPositionAndSize.width - (this.offsetWidth || 0),
				'outerHeight='+aPositionAndSize.height - (this.offsetHeight || 0)
			].join(',');
		var deferred = new Deferred();

		var arg = aURIOrTab;
		if (!(arg instanceof Ci.nsISupports)) {
			let array = Cc['@mozilla.org/supports-array;1']
						.createInstance(Ci.nsISupportsArray);
			let variant = Cc['@mozilla.org/variant;1']
							.createInstance(Ci.nsIVariant)
							.QueryInterface(Ci.nsIWritableVariant);
			variant.setFromVariant(arg);
			array.AppendElement(variant);
			arg = array;
		}

		var window = WindowWatcher.openWindow(
				this._window || null,
				'chrome://browser/content/browser.xul',
				'_blank',
				options,
				arg
			);
		var self = this;
		window.addEventListener(this.EVENT_TYPE_READY, function(aEvent) {
			if (window) {
				window.removeEventListener(aEvent.type, arguments.callee, false);
				deferred.call(window);
				window = undefined;
			}
			else {
				deferred.fail(new Error(aEvent.type+' event is handled twice.'));
			}
		}, false);
		return deferred
				.error(this.defaultHandleError);
	},

	openLinksAt : function FSB_openLinksAt(aURIs, aPosition) /* PUBLIC API */
	{
		aURIs = aURIs.slice(0);
		var first = aURIs.shift(); // only the first element can be tab

		var maximized = !this.parent && !this.isGroup && this.maximized;
		var deferred = maximized ?
						this.restore() :
						null ;

		var positionAndSize = this.calculatePositionAndSizeFor(aPosition);
		var self = this;
		return Deferred
				.next(function() {
					return deferred;
				})
				.next(function() {
					return self._openWindow(first, positionAndSize)
				})
				.next(function(aWindow) {
					aWindow.FoxSplitter.bindWith(self, aPosition);
					aURIs.forEach(function(aURI) {
						aWindow.gBrowser.addTab(aURI);
					});

					if (maximized)
						aWindow.maximize();

					return aWindow;
				})
				.error(this.defaultHandleError);
	},

	openLinkAt : function FSB_openLinkAt(aURIOrTab, aPosition) /* PUBLIC API */
	{
		return this.openLinksAt([aURIOrTab], aPosition);
	},

	duplicateTabsAt : function FSB_duplicateTabsAt(aTabs, aPosition) /* PUBLIC API */
	{
		return this.openLinkAt('about:blank', aPosition)
				.next(function(aWindow) {
					var firstTab = aWindow.gBrowser.selectedTab;
					aWindow.FoxSplitter.duplicateTabs(aTabs);
					aWindow.gBrowser.removeTab(firstTab);
					return aWindow;
				})
				.error(this.defaultHandleError);
	},
	duplicateTabAt : function FSB_duplicateTabAt(aTab, aPosition) /* PUBLIC API */
	{
		return this.duplicateTabsAt([aTab], aPosition);
	},

	moveTabsTo : function FSB_moveTabsTo(aTabs, aPosition) /* PUBLIC API */
	{
		aTabs = aTabs.slice(0);

		var movedTabs = {};
		var windowMove = this.shouldMoveWindow(aTabs, movedTabs);
		aTabs = movedTabs.value;
		if (windowMove)
			return this.moveWindowTo(aTabs[0].ownerDocument.defaultView, aPosition);

		return this.openLinkAt('about:blank', aPosition)
				.next(function(aWindow) {
					var firstTab = aWindow.gBrowser.selectedTab;
					aWindow.FoxSplitter.importTabs(aTabs);
					aWindow.gBrowser.removeTab(firstTab);
					return aWindow;
				})
				.error(this.defaultHandleError);
	},
	moveTabTo : function FSB_moveTabTo(aTab, aPosition) /* PUBLIC API */
	{
		return this.moveTabsTo([aTab], aPosition);
	},

	moveWindowTo : function FSB_moveWindowTo(aDOMWindow, aPosition) /* PUBLIC API */
	{
		if (aDOMWindow.FoxSplitter != this) {
			aDOMWindow.FoxSplitter.unbind();
			aDOMWindow.FoxSplitter.bindWith(this, aPosition);
		}
		return Deferred.next(function() {
			return aDOMWindow;
		});
	},

	splitTabsTo : function FSB_splitTabsTo(aTabs, aPosition, aEvent) /* PUBLIC API */
	{
		if (this.shouldDuplicateOnSplit != this.isMiddleClick(aEvent))
			return this.duplicateTabsAt(aTabs, aPosition);
		else
			return this.moveTabsTo(aTabs, aPosition);
	},

	splitTabTo : function FSB_splitTabTo(aTab, aPosition, aEvent) /* PUBLIC API */
	{
		return this.splitTabsTo([aTab], aPosition, aEvent);
	},


	// handling of window resizing

	reserveMoveBy : function FSB_reserveMoveBy(aDX, aDY)
	{
		if (this._reservedMoveBy) {
			this._reservedMoveBy.cancel();
			delete this._reservedMoveBy;
		}

		this._reservedMoveDeltaX = (this._reservedMoveDeltaX || 0) + aDX;
		this._reservedMoveDeltaY = (this._reservedMoveDeltaY || 0) + aDY;

		var self = this;
		this._reservedMoveBy = Deferred.next(function() {
			self.moveBy(self._reservedMoveDeltaX, self._reservedMoveDeltaY);
			delete self._reservedMoveDeltaX;
			delete self._reservedMoveDeltaY
			delete self._reservedMoveBy;
		});
		this._reservedMoveBy.error(this.defaultHandleError);
	},

	reserveResizeBy : function FSB_reserveResizeBy(aDW, aDH)
	{
		if (this._reservedResizeBy) {
			this._reservedResizeBy.cancel();
			delete this._reservedResizeBy;
		}

		this._reservedResizeDeltaWidth = (this._reservedResizeDeltaWidth || 0) + aDW;
		this._reservedResizeDeltaHeight = (this._reservedResizeDeltaHeight || 0) + aDH;

		var self = this;
		this._reservedResizeBy = Deferred.next(function() {
			self.resizeBy(self._reservedResizeDeltaWidth, self._reservedResizeDeltaHeight);
			delete self._reservedResizeDeltaWidth;
			delete self._reservedResizeDeltaHeight
			delete self._reservedResizeBy;
		});
		this._reservedResizeBy.error(this.defaultHandleError);
	},

	onResizeTop : function FSB_onResizeTop(aDelta)
	{
		if (!aDelta) return;
		var splitterResizing = false;
		var sibling = this.sibling;
		if (sibling) {
			if (sibling.position == this.POSITION_TOP) {
				splitterResizing = true;
				sibling.resizeBy(0, -aDelta);
			}
			else if (sibling.position == this.POSITION_BOTTOM) {
				let halfDelta = Math.round(aDelta / 2);
				this.reserveResizeBy(0, -halfDelta);
				sibling.reserveResizeBy(0, aDelta - halfDelta);
				sibling.reserveMoveBy(0, -halfDelta);
			}
			else { // horizontal slbling
				sibling.moveBy(0, -aDelta);
				sibling.resizeBy(0, aDelta)
				this.parent.reserveResetPositionAndSize(this);
			}
		}
		var parent = this.parent;
		if (!splitterResizing && parent)
			parent.onResizeTop(aDelta);
	},

	onResizeRight : function FSB_onResizeRight(aDelta)
	{
		if (!aDelta) return;
		var splitterResizing = false;
		var sibling = this.sibling;
		if (sibling) {
			if (sibling.position == this.POSITION_RIGHT) {
				splitterResizing = true;
				sibling.moveBy(aDelta, 0);
				sibling.resizeBy(-aDelta, 0);
			}
			else if (sibling.position == this.POSITION_LEFT) {
				let halfDelta = Math.round(aDelta / 2);
				// resize before move, to prevent unexpected resizing fired by window move
				this.reserveResizeBy(-(aDelta - halfDelta), 0);
				this.reserveMoveBy(halfDelta, 0);
				sibling.reserveResizeBy(halfDelta, 0);
			}
			else { // vertical slbling
				sibling.resizeBy(aDelta, 0);
				this.parent.reserveResetPositionAndSize(this);
			}
		}
		var parent = this.parent;
		if (!splitterResizing && parent)
			parent.onResizeRight(aDelta);
	},

	onResizeBottom : function FSB_onResizeBottom(aDelta)
	{
		if (!aDelta) return;
		var splitterResizing = false;
		var sibling = this.sibling;
		if (sibling) {
			if (sibling.position == this.POSITION_BOTTOM) {
				splitterResizing = true;
				sibling.moveBy(0, aDelta);
				sibling.resizeBy(0, -aDelta);
			}
			else if (sibling.position == this.POSITION_TOP) {
				let halfDelta = Math.round(aDelta / 2);
				// resize before move, to prevent unexpected resizing fired by window move
				this.reserveResizeBy(0, -(aDelta - halfDelta));
				this.reserveMoveBy(0, halfDelta);
				sibling.reserveResizeBy(0, halfDelta);
			}
			else { // horizontal slbling
				sibling.resizeBy(0, aDelta);
				this.parent.reserveResetPositionAndSize(this);
			}
		}
		var parent = this.parent;
		if (!splitterResizing && parent)
			parent.onResizeBottom(aDelta);
	},

	onResizeLeft : function FSB_onResizeLeft(aDelta)
	{
		if (!aDelta) return;
		var splitterResizing = false;
		var sibling = this.sibling;
		if (sibling) {
			if (sibling.position == this.POSITION_LEFT) {
				splitterResizing = true;
				sibling.resizeBy(-aDelta, 0);
			}
			else if (sibling.position == this.POSITION_RIGHT) {
				let halfDelta = Math.round(aDelta / 2);
				this.reserveResizeBy(-halfDelta, 0);
				sibling.reserveMoveBy(-halfDelta, 0);
				sibling.reserveResizeBy(aDelta - halfDelta, 0);
			}
			else { // vertical sibling
				sibling.moveBy(-aDelta, 0);
				sibling.resizeBy(aDelta, 0);
				this.parent.reserveResetPositionAndSize(this);
			}
		}
		var parent = this.parent;
		if (!splitterResizing && parent)
			parent.onResizeLeft(aDelta);
	},


	// utility methods

	makeURIFromSpec : function FSB_makeURIFromSpec(aURI) 
	{
		const IOService = Cc['@mozilla.org/network/io-service;1']
							.getService(Ci.nsIIOService);
		var newURI;
		aURI = aURI || '';
		if (aURI && String(aURI).indexOf('file:') == 0) {
			let fileHandler = IOService.getProtocolHandler('file')
								.QueryInterface(Ci.nsIFileProtocolHandler);
			let tempLocalFile = fileHandler.getFileFromURLSpec(aURI);
			newURI = IOService.newFileURI(tempLocalFile);
		}
		else {
			if (!/^\w+\:/.test(aURI)) aURI = 'http://'+aURI;
			newURI = IOService.newURI(aURI, null, null);
		}
		return newURI;
	},

	isAccelKeyPressed : function FSB_isAccelKeyPressed(aEvent)
	{
		return aEvent && (XULAppInfo.OS == 'Darwin' ? aEvent.metaKey : aEvent.ctrlKey );
	},

	isMiddleClick : function FSB_isMiddleClick(aEvent)
	{
		return (
			aEvent &&
			aEvent.type == 'click' &&
			(
				aEvent.button == 1 ||
				(aEvent.button == 0 && this.isAccelKeyPressed(aEvent))
			)
		);
	},

	getTabBrowserFromTab : function FSB_getTabBrowserFromTab(aTab)
	{
		return aTab.ownerDocument.defaultView.FoxSplitter.browser;
	},

	shouldMoveWindow : function FSB_shouldMoveWindow(aTabs, aTabsShouldBeMoved)
	{
		var tabs = aTabs.slice(0);

		var browser = this.getTabBrowserFromTab(tabs[0]);
		var allTabs = browser.visibleTabs || browser.mTabContainer.childNodes;

		var windowMove = allTabs.length == tabs.length;
		var selected;
		var allSelected = tabs.some(function(aTab) {
				if (aTab.getAttribute('multiselected') == 'true')
					return selected = true;
				return false;
			});

		// Multiple Tab Handler moves/duplicates selected tabs, so we should process only one tab.
		if (
			'MultipleTabService' in browser.ownerDocument.defaultView &&
			allSelected
			)
			tabs = [tabs[0]];

		// Tree Style Tabs tries to move the dragged tab with descendant tabs.
		if ('treeStyleTab' in browser && !selected) {
			tabs = [tabs[0]].concat(browser.treeStyleTab.getDescendantTabs(tabs[0]));
			windowMove = allTabs.length == tabs.length;
		}

		if (aTabsShouldBeMoved)
			aTabsShouldBeMoved.value = tabs;

		return windowMove;
	},

	defaultHandleError : function FSB_defaultHandleError(aError)
	{
		dump(aError+'\n'+aError.stack.replace(/^/gm, '  ')+'\n');
		throw aError;
	},

	dumpError : function FSB_dumpError(aError, aMessage)
	{
		var message = aMessage ? aMessage+'\n' : '' ;
		dump(message+aError+'\n'+aError.stack.replace(/^/gm, '  ')+'\n');
	}
};

FoxSplitterBase.shouldDuplicateOnSplit = prefs.getPref(domain+'shouldDuplicateOnSplit');
FoxSplitterBase.offsetX = prefs.getPref(domain+'platformOffset.x');
FoxSplitterBase.offsetY = prefs.getPref(domain+'platformOffset.y');
FoxSplitterBase.offsetWidth = prefs.getPref(domain+'platformOffset.width');
FoxSplitterBase.offsetHeight = prefs.getPref(domain+'platformOffset.height');

/**
 * Due to Firefox's bug 581863 and bug 581866, windows are mispositioned.
 * We have to calculate offset values for positioning and sizing.
 * https://github.com/piroor/foxsplitter/issues/26
 * https://bugzilla.mozilla.org/show_bug.cgi?id=581863
 * https://bugzilla.mozilla.org/show_bug.cgi?id=581866
 */
FoxSplitterBase.updatePlatformOffset = function FSB_updatePlatformOffset() {
	if (!prefs.getPref(domain+'platformOffset.needToBeUpdated'))
		return;

	prefs.setPref(domain+'platformOffset.needToBeUpdated', false);
	var window = WindowWatcher.openWindow(
			null,
			'about:blank?'+Math.random(),
			'_blank',
			'chrome,dialog=no,all,screenX=100,screenY=100,outerWidth=100,outerHeight=100',
			null
		);
	var self = this;
	window.addEventListener('load', function() {
		window.removeEventListener('load', arguments.callee, false);
		Deferred.next(function() {
			prefs.setPref(domain+'platformOffset.x', self.offsetX = window.screenX - 100);
			prefs.setPref(domain+'platformOffset.y', self.offsetY = window.screenY - 100);
			var width = window.screen.availWidth;
			var height = window.screen.availHeight;
			window.moveTo(0, 0);
			window.resizeTo(width, height);
			Deferred.next(function() {
				prefs.setPref(domain+'platformOffset.width', self.offsetWidth = width - window.outerWidth);
				prefs.setPref(domain+'platformOffset.height', self.offsetHeight = height - window.outerHeight);
				window.close();
			});
		});
	}, false);
};
FoxSplitterBase.updatePlatformOffset();

var prefListener = {
		domain : domain,
		observe : function FSWPL_observe(aSubject, aTopic, aData) {
			if (aTopic != 'nsPref:changed')
				return;

			var prefName = aData.replace(domain, '');
			if (prefName in FoxSplitterBase) {
				FoxSplitterBase[prefName] = prefs.getPref(aData);
			}
			else if (prefName == 'platformOffset.needToBeUpdated') {
				FoxSplitterBase.updatePlatformOffset();
			}
		}
	};

prefs.addPrefListener(prefListener);

function shutdown()
{
	prefs.removePrefListener(prefListener);
	prefs = undefined;
	FoxSplitterConst = undefined;
}
