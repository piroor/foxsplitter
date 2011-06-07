load('group');
load('lib/jsdeferred');

var EXPORTED_SYMBOLS = ['FoxSplitterWindow'];
 
function FoxSplitterWindow(aWindow) 
{
	this.init(aWindow);
}
FoxSplitterWindow.prototype = {
	kATTACHED_POSITION : 'foxsplitter-attached-position',
	kPOSITION_TOP    : (1 << 0),
	kPOSITION_RIGHT  : (1 << 1),
	kPOSITION_BOTTOM : (1 << 2),
	kPOSITION_LEFT   : (1 << 3),
	kPOSITION_HORIZONTAL : (1 << 1) | (1 << 3),
	kPOSITION_VERTICAL   : (1 << 0) | (1 << 2),
	kPOSITION_OUTSIDE : (1 << 4),
	kPOSITION_INSIDE  : (1 << 5),
	kPOSITION_INVALID : (1 << 4) | (1 << 5),

	isGroup : false,
	lastScreenX : null,
	lastScreenY : null,

	init : function FSW_init(aWindow) 
	{
		this.id = Date.now() + '-' + parseInt(Math.random() * 65000);
		this.parent = null;

		this.window = aWindow;

		aWindow.addEventListener('load', this, false);
		aWindow.addEventListener('unload', this, false);
		aWindow.addEventListener('dragend', this, true);

		this._initParent();
	},

	initWithDelay : function FSW_initWithDelay()
	{
		this.window.removeEventListener('load', this, false);

		var self = this;
		Deferred.next(function() {
			self.lastScreenX = self.window.screenX;
			self.lastScreenY = self.window.screenY;
			self.startListen();
		});
	},

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

	_initParent : function FSW_initParent()
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

		this._initPositionAndSize(parentWin, parseInt(arguments[0].getAttribute(this.kATTACHED_POSITION)));

		var parent = new FoxSplitterGroup();
		parent.register(this);

		var grandParent = parentWin.FoxSplitter.parent;
		if (grandParent) {
			grandParent.register(parent);
			grandParent.unregister(parentWin.FoxSplitter);
		}
		parent.register(parentWin.FoxSplitter);
	},

	_initPositionAndSize : function FSW_initPositionAndSize(aParent, aPosition)
	{
		var w = aParent.window;
		var x, y, width, height;
		if (aPosition & this.kPOSITION_HORIZONTAL) {
			y = w.screenY;
			width = w.outerWidth * 0.5;
			height = w.outerHeight;
			if (aPosition == this.kPOSITION_LEFT) {
				x = w.screenX - width;
				aParent.moveBy(width, 0);
			}
			else {
				x = w.screenX + width;
			}
			aParent.resizeBy(-width, 0);
		}
		else {
			x = w.screenX;
			width = w.outerWidth;
			height = w.outerHeight * 0.5;
			if (aPosition == this.kPOSITION_TOP) {
				y = w.screenY - height;
				aParent.moveBy(0, height);
			}
			else {
				y = w.screenY + height;
			}
			aParent.resizeBy(0, -height);
		}
		this.window.moveTo(x, y);
		this.window.resizeTo(width, height);
	},

	get root()
	{
		var parent = this;
		while (parent.parent)
		{
			parent = parent.parent;
		}
		return (parent && parent != this) ? parent : null ;
	},


	destroy : function FSW_destroy() 
	{
		if (this.parent)
			this.parent.unregister(this);

		var w = this.window;
		w.removeEventListener('unload', this, false);
		w.removeEventListener('dragend', this, true);

		this.endListen();

		this.window = null;
	},


	handleEvent : function FSW_handleEvent(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'load':
				return this.initWithDelay();

			case 'unload':
				return this.destroy();


			case 'DOMAttrModified':
				if (
					aEvent.target == this.window.document.documentElement &&
					(aEvent.attrName == 'screenX' || aEvent.attrName == 'screenY')
					)
					this.onMove(aEvent);
				return;

			case 'resize':
				return this.onResize(aEvent);


			case 'dragend':
				if (
					aEvent.target.localName == 'tab' &&
					aEvent.target.className.indexOf('tabbrowser-tab') > -1
					)
					this.onTabDragEnd(aEvent);
				return;
		}
	},


	onMove : function FSW_onMove(aEvent)
	{
		if (
			this.lastScreenX === null ||
			this.lastScreenY === null ||
			this.positionSynching
			)
			return;

		this.positionSynching = true;

		var w = this.window;
		var x = w.screenX;
		var y = w.screenY;

		var root = this.root;
		if (root)
			root.onMove(this, x - this.lastScreenX, y - this.lastScreenY);

		this.lastScreenX = x;
		this.lastScreenY = y;
		this.positionSynching = false;
	},


	onResize : function FSW_onResize(aEvent)
	{
	},


	onTabDragEnd : function FSW_onTabDragEnd(aEvent)
	{
		var position = this.getDropPosition(aEvent);
		if (position & this.kPOSITION_INVALID)
			return;

		var tab = this.getTabFromEvent(aEvent);
		tab.setAttribute(this.kATTACHED_POSITION, position);
	},

	getTabFromEvent : function FSW_getTabFromEvent(aEvent)
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

	getDropPosition : function FSW_getDropPosition(aEvent)
	{
		var outerPadding = 100;
		var oX = this.window.screenX - outerPadding;
		var oY = this.window.screenY - outerPadding;
		var x = aEvent.screenX - oX;
		var y = aEvent.screenY - oY;
		var width = this.window.outerWidth + (outerPadding * 2);
		var height = this.window.outerHeight + (outerPadding * 2);

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


	moveTo : function FSW_moveTo(aX, aY)
	{
		if (this.positionSynching) return;
		this.positionSynching = true;
		this.window.moveTo(aX, aY);
		this.lastScreenX += (this.lastScreenX - aX);
		this.lastScreenY += (this.lastScreenY - aY);
		this.positionSynching = false;
	},

	moveBy : function FSW_moveBy(aDX, aDY)
	{
		if (this.positionSynching) return;
		this.positionSynching = true;
		this.window.moveBy(aDX, aDY);
		this.lastScreenX += aDX;
		this.lastScreenY += aDY;
		this.positionSynching = false;
	},

	resizeTo : function FSW_resizeTo(aW, aH)
	{
		if (this.sizeSynching) return;
		this.sizeSynching = true;
		this.window.resizeTo(aW, aH);
		this.sizeSynching = false;
	},

	resizeBy : function FSW_resizeBy(aDW, aDH)
	{
		if (this.sizeSynching) return;
		this.sizeSynching = true;
		this.window.resizeBy(aDW, aDH);
		this.sizeSynching = false;
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

FoxSplitterWindow.prototype.positionName = {};
FoxSplitterWindow.prototype.positionName[FoxSplitterWindow.prototype.kPOSITION_TOP] = 'top';
FoxSplitterWindow.prototype.positionName[FoxSplitterWindow.prototype.kPOSITION_RIGHT] = 'right';
FoxSplitterWindow.prototype.positionName[FoxSplitterWindow.prototype.kPOSITION_BOTTOM] = 'bottom';
FoxSplitterWindow.prototype.positionName[FoxSplitterWindow.prototype.kPOSITION_LEFT] = 'left';
FoxSplitterWindow.prototype.positionName[FoxSplitterWindow.prototype.kPOSITION_INSIDE] = 'in';
FoxSplitterWindow.prototype.positionName[FoxSplitterWindow.prototype.kPOSITION_OUTSIDE] = 'out';
