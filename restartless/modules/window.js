load('group');

var EXPORTED_SYMBOLS = ['FoxSplitterWindow'];
 
function FoxSplitterWindow(aWindow) 
{
	this.init(aWindow);
}
FoxSplitterWindow.prototype = {
	init : function FSW_init(aWindow) 
	{
		this.id = Date.now() + '-' + parseInt(Math.random() * 65000);
		this.group = null;

		this._window = aWindow;
		this._window.addEventListener('unload', this, false);

		this._initGroup();
	},

	_initGroup : function FSW_initGroup()
	{
		var arguments = this._window.arguments;
		var parentDoc = (
				arguments &&
				arguments.length > 0 &&
				arguments[0] instanceof Ci.nsIDOMElement &&
				arguments[0].localName == 'tab'
			) ? arguments[0].ownerDocument : null ;
		var parentWin = parentDoc ? parentDoc.defaultView : null ;

		if (parentWin) {
			parentWin.FoxSplitter.group.register(this);
		}
		else {
			let group = new FoxSplitterGroup();
			group.register(this);
		}
	},


	destroy : function FSW_destroy() 
	{
		if (this.group)
			this.group.unregister(this);

		this._window.removeEventListener('unload', this, false);
		this._window = null;
	},


	handleEvent : function FSW_handleEvent(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'unload':
				return this.destroy();
		}
	},


	// compatibility for old versions
	get activeBrowser()
	{
		return this._window && this._window.gBrowser;
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
  
