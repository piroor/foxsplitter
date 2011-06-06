var EXPORTED_SYMBOLS = ['FoxSplitterWindow'];
 
function FoxSplitterWindow(aWindow) 
{
	this.init(aWindow);
}
FoxSplitterWindow.prototype = {
	init : function(aWindow) 
	{
		this._window = aWindow;
		this._window.addEventListener('unload', this, false);
	},
 
	destroy : function() 
	{
		this._window.removeEventListener('unload', this, false);
		this._window = null;
	},

	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'unload':
				return this.destroy();
		}
	}
  
};
  
