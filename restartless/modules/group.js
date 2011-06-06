var EXPORTED_SYMBOLS = ['FoxSplitterGroup'];
 
function FoxSplitterGroup() 
{
	this.init();
}
FoxSplitterGroup.prototype = {
	init : function FSG_init() 
	{
		this.id = Date.now() + '-' + parseInt(Math.random() * 65000);
		this._members = [];
	},
 
	destroy : function FSG_destroy() 
	{
		this._members.forEach(function(aMember) {
			this.unregister(aMember);
		}, this);
	},

	register : function FSG_register(aFoxSplitterWindow)
	{
		if (this._members.indexOf(aFoxSplitterWindow) < 0) {
			this._members.push(aFoxSplitterWindow);
			aFoxSplitterWindow.group = this;
		}
	},

	unregister : function FSG_unregister(aFoxSplitterWindow)
	{
		var index = this._members.indexOf(aFoxSplitterWindow);
		if (index > -1) {
			this._members.splice(index, 1);
			aFoxSplitterWindow.group = null;
		}
		if (!this._members.length)
			this.destroy();
	}
};
  
