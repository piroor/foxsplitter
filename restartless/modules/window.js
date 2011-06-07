load('group');
load('lib/jsdeferred');

var EXPORTED_SYMBOLS = ['FoxSplitterWindow'];
 
function FoxSplitterWindow(aWindow) 
{
	this.init(aWindow);
}
FoxSplitterWindow.prototype = {
	isGroup : false,
	lastScreenX : null,
	lastScreenY : null,

	init : function FSW_init(aWindow) 
	{
		this.id = Date.now() + '-' + parseInt(Math.random() * 65000);
		this.parent = null;

		this.window = aWindow;

		this.window.addEventListener('load', this, false);

		this.window.addEventListener('unload', this, false);
		this.window.addEventListener('DOMAttrModified', this, false);
		this.window.addEventListener('resize', this, false);

		this._initParent();
	},

	initWithDelay : function FSW_initWithDelay()
	{
		this.window.removeEventListener('load', this, false);

		var self = this;
		Deferred.next(function() {
			self.lastScreenX = self.window.screenX;
			self.lastScreenY = self.window.screenY;
		});
	},

	_initParent : function FSW_initParent()
	{
		var arguments = this.window.arguments;
		var parentDoc = (
				arguments &&
				arguments.length > 0 &&
				arguments[0] instanceof Ci.nsIDOMElement &&
				arguments[0].localName == 'tab'
			) ? arguments[0].ownerDocument : null ;
		var parentWin = parentDoc ? parentDoc.defaultView : null ;

		if (!parentWin)
			return;

		var parent = new FoxSplitterGroup();
		parent.register(this);

		var grandParent = parentWin.FoxSplitter.parent;
		if (grandParent) {
			grandParent.register(parent);
			grandParent.unregister(parentWin.FoxSplitter);
		}
		parent.register(parentWin.FoxSplitter);
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

		this.window.removeEventListener('unload', this, false);
		this.window.removeEventListener('DOMAttrModified', this, false);
		this.window.removeEventListener('resize', this, false);
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

	moveBy : function FSW_moveBy(aDX, aDY)
	{
		if (this.positionSynching) return;
		this.positionSynching = true;
		this.window.moveBy(aDX, aDY);
		this.lastScreenX += aDX;
		this.lastScreenY += aDY;
		this.positionSynching = false;
	},


	onResize : function FSW_onResize(aEvent)
	{
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
  
