load('base');
load('group');
load('lib/jsdeferred');

var EXPORTED_SYMBOLS = ['FoxSplitterWindow'];
 
function FoxSplitterWindow(aWindow, aOnInit) 
{
	this.init(aWindow, aOnInit);
}
FoxSplitterWindow.prototype = {
	__proto__ : FoxSplitterBase.prototype,

	lastScreenX : null,
	lastScreenY : null,
	lastWidth   : null,
	lastHeight  : null,

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

	get documentElement()
	{
		return this.window.document.documentElement;
	},


	init : function FSW_init(aWindow, aOnInit) 
	{
		this.window = aWindow;

		this.positionUpdating = 0;
		this.sizeUpdating     = 0;

		this.id = this.id || (Date.now() + '-' + parseInt(Math.random() * 65000));
		this.parent = null;

		if (!aOnInit)
			aWindow.addEventListener('load', this, false);

		aWindow.addEventListener('unload', this, false);
		aWindow.addEventListener('dragend', this, true);

		this._initParent(aOnInit);

		if (aOnInit)
			this._initAfterLoad();
	},

	_initAfterLoad : function FSW_initAfterLoad()
	{
		var self = this;
		Deferred.next(function() {
			self.lastScreenX = self.screenX;
			self.lastScreenY = self.screenY;
			self.lastWidth   = self.width;
			self.lastHeight  = self.height;

			// workaround to fix misrendering by resizing on DOMContentLoaded
			self.resizeBy(0, -1);
			self.resizeBy(0, 1);

			self.startListen();
		});
	},

	_initParent : function FSW_initParent(aOnInit)
	{
		var arguments = this.window.arguments;
		var parentDoc = (
				arguments &&
				arguments.length > 0 &&
				arguments[0] instanceof Ci.nsIDOMElement &&
				arguments[0].localName == 'tab' &&
				arguments[0].hasAttribute(this.kATTACHED_POSITION)
			) ? arguments[0].ownerDocument : null ;
		var parentWin = parentDoc ? parentDoc.defaultView : null ;

		if (!parentWin)
			return;

		var parentGroup = new FoxSplitterGroup();
		parentGroup.register(this);

		var parentService = parentWin.FoxSplitter;
		var grandParentGroup = parentService.parent;
		if (grandParentGroup) {
			// swap existing relations
			parentGroup.position = parentService.position;
			grandParentGroup.register(parentGroup);
			grandParentGroup.unregister(parentService);
		}
		parentGroup.register(parentService);

		var position = parseInt(arguments[0].getAttribute(this.kATTACHED_POSITION));
		if (!aOnInit)
			this._initPositionAndSize(parentService, position);
	},

	_initPositionAndSize : function FSW_initPositionAndSize(aParentFS, aPosition)
	{
		var x, y, width, height;
		if (aPosition & this.kPOSITION_HORIZONTAL) {
			y = aParentFS.screenY;
			width = Math.round(aParentFS.width * 0.5);
			height = aParentFS.height;
			if (aPosition == this.kPOSITION_LEFT) {
				x = aParentFS.screenX;
				aParentFS.moveBy(width, 0);
			}
			else {
				x = aParentFS.screenX + width;
			}
			aParentFS.resizeBy(-width, 0);
		}
		else {
			x = aParentFS.screenX;
			width = aParentFS.width;
			height = Math.round(aParentFS.height * 0.5);
			if (aPosition == this.kPOSITION_TOP) {
				y = aParentFS.screenY;
				aParentFS.moveBy(0, height);
			}
			else {
				y = aParentFS.screenY + height;
			}
			aParentFS.resizeBy(0, -height);
		}
		this.moveTo(x, y);
		this.resizeTo(width, height);

		this.position = aPosition;
		aParentFS.position = this.opposite[aPosition];
	},


	destroy : function FSW_destroy(aOnQuit) 
	{
		if (this.parent) {
			if (!aOnQuit)
				this._expandSibling();
			this.parent.unregister(this);
		}

		var w = this.window;
		w.removeEventListener('unload', this, false);
		w.removeEventListener('dragend', this, true);

		this.endListen();

		this.window = null;
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
		this.positionUpdating++;
		this.window.moveTo(aX, aY);
		this.lastScreenX = aX;
		this.lastScreenY = aY;
		var self = this;
		Deferred.next(function() {
			self.positionUpdating--;
		});
	},

	moveBy : function FSW_moveBy(aDX, aDY)
	{
		this.positionUpdating++;
		this.window.moveBy(aDX, aDY);
		this.lastScreenX += aDX;
		this.lastScreenY += aDY;
		var self = this;
		Deferred.next(function() {
			self.positionUpdating--;
		});
	},

	resizeTo : function FSW_resizeTo(aW, aH)
	{
		this.sizeUpdating++;
		this.window.resizeTo(aW, aH);
		this.lastWidth  = aW;
		this.lastHeight = aH;
		var self = this;
		Deferred.next(function() {
			self.sizeUpdating--;
		});
	},

	resizeBy : function FSW_resizeBy(aDW, aDH)
	{
		this.sizeUpdating++;
		this.window.resizeBy(aDW, aDH);
		this.lastWidth  += aDW;
		this.lastHeight += aDH;
		var self = this;
		Deferred.next(function() {
			self.sizeUpdating--;
		});
	},


	// event handling

	startListen : function FSW_startListen()
	{
		if (this._listening) return;
		this.window.addEventListener('DOMAttrModified', this, false);
		this.window.addEventListener('resize', this, false);
		this._listening = true;
	},
	_listening : false,

	endListen : function FSW_endListen()
	{
		if (!this._listening) return;
		this.window.removeEventListener('DOMAttrModified', this, false);
		this.window.removeEventListener('resize', this, false);
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
				if (
					aEvent.target == this.documentElement &&
					(aEvent.attrName == 'screenX' || aEvent.attrName == 'screenY')
					)
					this.onMove();
				return;

			case 'resize':
				if (aEvent.target == this.window)
					this.onResize();
				return;


			case 'dragend':
				if (
					aEvent.target.localName == 'tab' &&
					aEvent.target.className.indexOf('tabbrowser-tab') > -1
					)
					this._onTabDragEnd(aEvent);
				return;
		}
	},


	onMove : function FSW_onMove()
	{
		if (
			this.lastScreenX === null ||
			this.lastScreenY === null ||
			this.positionUpdating
			)
			return;

		this.positionUpdating++;

		var x = this.screenX;
		var y = this.screenY;
		var root = this.root;
		if (root)
			root.moveBy(x - this.lastScreenX, y - this.lastScreenY, this);

		this.lastScreenX = x;
		this.lastScreenY = y;
		this.positionUpdating--;
	},

	onResize : function FSW_onResize()
	{
		if (this.sizeUpdating) return;
		this.positionUpdating++;
		this.sizeUpdating++;

		var x = this.screenX;
		var y = this.screenY;
		var width  = this.width;
		var height = this.height;

		if (y != this.lastScreenY)
			this.onResizeTop(this.lastScreenY - y);
		if (x == this.lastScreenX && width != this.lastWidth)
			this.onResizeRight(width - this.lastWidth);
		if (y == this.lastScreenY && height != this.lastHeight)
			this.onResizeBottom(height - this.lastHeight);
		if (x != this.lastScreenX)
			this.onResizeLeft(this.lastScreenX - x);

		this.lastScreenX = x;
		this.lastScreenY = y;
		this.lastWidth = width;
		this.lastHeight = height;

		this.positionUpdating--;
		this.sizeUpdating--;
	},


	_onTabDragEnd : function FSW_onTabDragEnd(aEvent)
	{
		var position = this._getDropPosition(aEvent);
		if (position & this.kPOSITION_INVALID)
			return;

		var tab = this._getTabFromEvent(aEvent);
		tab.setAttribute(this.kATTACHED_POSITION, position);
	},

	_getTabFromEvent : function FSW_getTabFromEvent(aEvent)
	{
		var node = aEvent.originalTarget;
		var d = node.ownerDocument;
		return d.evaluate(
				'ancestor-or-self::*[local-name()="tab" and contains(concat(" ", @class, " "), " tabbrowser-tab ")][1]',
				node,
				null,
				Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue;
	},

	_getDropPosition : function FSW_getDropPosition(aEvent)
	{
		var outerPadding = 100;
		var oX = this.window.screenX - outerPadding;
		var oY = this.window.screenY - outerPadding;
		var x = aEvent.screenX - oX;
		var y = aEvent.screenY - oY;
		var width = this.width + (outerPadding * 2);
		var height = this.height + (outerPadding * 2);

		// out of area
		if (x < 0 || x > width || y < 0 || y > height)
			return this.kPOSITION_OUTSIDE;

		// too inside
		var xUnit = width * 0.3;
		var yUnit = height * 0.3;
		if (
			xUnit < x && width - xUnit > x &&
			yUnit < y && height - yUnit > y
			)
			return this.kPOSITION_INSIDE;

		var isTopLeft    = x <= width - (y * width / height);
		var isBottomLeft = x <= y * width / height;

		return (isTopLeft && isBottomLeft) ? this.kPOSITION_LEFT :
			(isTopLeft && !isBottomLeft) ? this.kPOSITION_TOP :
			(!isTopLeft && isBottomLeft) ? this.kPOSITION_BOTTOM :
			this.kPOSITION_RIGHT ;
	},


	// compatibility for old versions

	get activeBrowser()
	{
		return this.window && this.window.gBrowser;
	},
	getSubBrowserAndBrowserFromFrame : function FSW_getSubBrowserAndBrowserFromFrame()
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
