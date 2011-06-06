load('group');

var EXPORTED_SYMBOLS = ['FoxSplitterWindow'];
 
function FoxSplitterWindow(aWindow) 
{
	this.init(aWindow);
}
FoxSplitterWindow.prototype = {
	isGroup : false,

	init : function FSW_init(aWindow) 
	{
		this.id = Date.now() + '-' + parseInt(Math.random() * 65000);
		this.parent = null;

		this.window = aWindow;

		this.lastScreenX = aWindow.screenX;
		this.lastScreenY = aWindow.screenY;

		this.window.addEventListener('unload', this, false);
		this.window.addEventListener('DOMAttrModified', this, false);
		this.window.addEventListener('resize', this, false);

		this._initParent();
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
		parent.register(parentWin.FoxSplitter.parent || parentWin.FoxSplitter);
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
			case 'unload':
				return this.destroy();

			case 'DOMAttrModified':
				return this.onMove(aEvent);

			case 'resize':
				return this.onResize(aEvent);
		}
	},


	onMove : function FSW_onMove(aEvent)
	{
		var root = this.window.document.documentElement;
		if (
			aEvent.target != root ||
			(aEvent.attrName != 'screenX' && aEvent.attrName != 'screenY') ||
			this.syncMoving
			)
			return;

		this.syncMoving = true;

		var w = this.window;
		var x = w.screenX;
		var y = w.screenY;
		if (this.parent)
			this.parent.onMove(this, x - this.lastScreenX, y - this.lastScreenY);

		this.lastScreenX = x;
		this.lastScreenY = y;
		this.syncMoving = false;
	},

	moveBy : function FSW_moveBy(aDX, aDY)
	{
		if (this.syncMoving) return;
		this.syncMoving = true;
		this.window.moveBy(aDX, aDY);
		this.syncMoving = false;
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
		var docShell = aFrame.top
			.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIWebNavigation)
			.QueryInterface(Ci.nsIDocShell);

		var browsers = this.activeBrowser.browsers;
		for (let i = 0, maxi = browsers.length; i < maxi; i++)
		{
			if (browsers[i].docShell == docShell)
				return {
					subBrowser : null,
					browser    : browsers[i]
				};
		}

		return {
			subBrowser : null,
			browser    : null
		};
	}
};
  
