load('base');

var EXPORTED_SYMBOLS = ['FoxSplitterGroup'];
 
function FoxSplitterGroup() 
{
	this.init();
}
FoxSplitterGroup.prototype = {
	__proto__ : FoxSplitterBase.prototype,

	isGroup : true,

	get screenX()
	{
		var member = this.leftMember;
		return member ? member.screenX : 0 ;
	},
	get screenY()
	{
		var member = this.topMember;
		return member ? member.screenY : 0 ;
	},
	get width()
	{
		var member = this.rightMember;
		return member ? member.screenX - this.screenX + member.width : 0 ;
	},
	get height()
	{
		var member = this.bottomMember;
		return member ? member.screenY - this.screenY + member.height : 0 ;
	},


	get topMember()
	{
		return this._getMemberAt(this.kPOSITION_TOP);
	},
	get rightMember()
	{
		return this._getMemberAt(this.kPOSITION_RIGHT);
	},
	get bottomMember()
	{
		return this._getMemberAt(this.kPOSITION_TOP);
	},
	get leftMember()
	{
		return this._getMemberAt(this.kPOSITION_LEFT);
	},
	_getMemberAt : function FSG_getMemberAt(aPosition)
	{
		var members = this.members.filter(function(aMember) {
				aMember.position == aPosition;
			});
		return members.length ? members[0] : null ;
	},


	init : function FSG_init() 
	{
		this.id = Date.now() + '-' + parseInt(Math.random() * 65000);
		this.parent = null;

		this.positionUpdating = 0;
		this.sizeUpdating     = 0;

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



	moveTo : function FSG_moveTo(aX, aY, aSource)
	{
		this.moveBy(aX - this.screenX, aY - this.screenY, aSource);
	},

	moveBy : function FSG_moveBy(aDX, aDY, aSource)
	{
		this.members.forEach(function(aMember) {
			if (!aMember.isGroup && aMember != aSource)
				aMember.moveBy(aDX, aDY);
		});
	},

	resizeTo : function FSG_resizeTo(aW, aH)
	{
		this.resizeBy(aW - this.width, aH - this.height);
	},

	resizeBy : function FSG_resizeBy(aDW, aDH)
	{
		if (aDW) {
			let right = this.rightMember;
			if (right) {
				right.resizeBy(aDW, 0);
			}
			else {
				this.members.forEach(function(aMember) {
					aMember.resizeBy(aDW, 0);
				});
			}
		}
		if (aDH) {
			let bottom = this.bottomMember;
			if (bottom) {
				bottom.resizeBy(0, aDH);
			}
			else {
				this.members.forEach(function(aMember) {
					aMember.resizeBy(0, aDH);
				});
			}
		}
	},


	// group specific features

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
	}
};
  
