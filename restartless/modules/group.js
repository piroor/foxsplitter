var EXPORTED_SYMBOLS = ['FoxSplitterGroup'];
 
function FoxSplitterGroup() 
{
	this.init();
}
FoxSplitterGroup.prototype = {
	isGroup : true,

	init : function FSG_init() 
	{
		this.id = Date.now() + '-' + parseInt(Math.random() * 65000);
		this.parent = null;

		this.members = [];
	},
 
	destroy : function FSG_destroy() 
	{
		this.members.forEach(function(aMember) {
			this.unregister(aMember);
		}, this);
	},

	register : function FSG_register(aFSWindow)
	{
		if (this.members.indexOf(aFSWindow) < 0) {
			this.members.push(aFSWindow);
			aFSWindow.parent = this;
		}
	},

	unregister : function FSG_unregister(aFSWindow)
	{
		var index = this.members.indexOf(aFSWindow);
		if (index > -1) {
			this.members.splice(index, 1);
			aFSWindow.parent = null;
		}
		if (!this.members.length)
			this.destroy();
	},

	onMove : function FSG_onMove(aFSWindow, aDX, aDY)
	{
		this.members.forEach(function(aMember) {
			if (aMember.isGroup)
				aMember.onMove(aFSWindow, aDX, aDY);
			else
				aMember.moveBy(aDX, aDY);
		});
	},

	onResize : function FSG_onResize(aFSWindow, aEvent)
	{
		this.members.forEach(function(aMember) {
			if (aMember.isGroup)
				aMember.onResize(aFSWindow, aEvent);
		});
	}
};
  
