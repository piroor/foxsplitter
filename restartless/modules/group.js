load('base');

var EXPORTED_SYMBOLS = ['FoxSplitterGroup'];
 
function FoxSplitterGroup() 
{
	this.init();
}
FoxSplitterGroup.prototype = {
	__proto__ : FoxSplitterBase.prototype,

	isGroup : true,

	get width()
	{
		var members = this.members.filter(function(aMember) {
				aMember.position == this.kPOSITION_RIGHT;
			});
		return members.length ? members[0].screenX - this.screenX + members[0].width : 0 ;
	},
	get height()
	{
		var members = this.members.filter(function(aMember) {
				aMember.position == this.kPOSITION_BOTTOM;
			});
		return members.length ? members[0].screenY - this.screenY + members[0].height : 0 ;
	},
	get screenX()
	{
		var members = this.members.filter(function(aMember) {
				aMember.position == this.kPOSITION_LEFT;
			});
		return members.length ? members[0].screenX : 0 ;
	},
	get screenY()
	{
		var members = this.members.filter(function(aMember) {
				aMember.position == this.kPOSITION_TOP;
			});
		return members.length ? members[0].screenY : 0 ;
	},

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

		if (this.parent)
			this.parent.unregister(this);
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
		if (this.members.length == 1) {
			if (this.parent) {
				// swap existing relations
				let lastMember = this.members[0];
				lastMember.position = this.position;
				this.parent.register(lastMember);
				this.unregister(lastMember);
			}
			this.destroy();
		}
	},

	moveTo : function FSG_moveTo(aX, aY)
	{
	},

	moveBy : function FSG_moveBy(aDX, aDY)
	{
	},

	resizeTo : function FSG_resizeTo(aW, aH)
	{
	},

	resizeBy : function FSG_resizeBy(aDW, aDH)
	{
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
  
