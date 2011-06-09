load('base');
load('lib/jsdeferred');

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
		var member = this.leftMember || this.topMember;
		return member ? member.screenX : 0 ;
	},
	get screenY()
	{
		var member = this.topMember || this.leftMember;
		return member ? member.screenY : 0 ;
	},
	get width()
	{
		var member = this.rightMember || this.bottomMember;
		return member ? member.screenX - this.screenX + member.width : 0 ;
	},
	get height()
	{
		var member = this.bottomMember || this.rightMember;
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
		return this._getMemberAt(this.kPOSITION_BOTTOM);
	},
	get leftMember()
	{
		return this._getMemberAt(this.kPOSITION_LEFT);
	},
	get startMember()
	{
		return this.topMember || this.leftMember;
	},
	_getMemberAt : function FSG_getMemberAt(aPosition)
	{
		var members = this.members.filter(function(aMember) {
				return aMember.position == aPosition;
			});
		return members.length ? members[0] : null ;
	},

	get allWindows()
	{
		var members = this.members;
		members.forEach(function(aMember) {
			if (aMember.isGroup)
				members = members.concat(aMember.allWindows);
		});
		return members.filter(function(aMember) {
			return !aMember.isGroup;
		});
	},


	init : function FSG_init() 
	{
		this.id = 'group-' + Date.now() + '-' + parseInt(Math.random() * 65000);
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



	moveTo : function FSG_moveTo(aX, aY, aSource)
	{
		this.moveBy(aX - this.screenX, aY - this.screenY, aSource);
	},

	moveBy : function FSG_moveBy(aDX, aDY, aSource)
	{
		this.members.forEach(function(aMember) {
			if (aMember != aSource)
				aMember.moveBy(aDX, aDY, aSource);
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
				// expand both members!
				let halfDW = Math.round(aDW / 2);
				this.leftMember.resizeBy(halfDW, 0);
				right.moveBy(halfDW, 0);
				right.resizeBy(aDW - halfDW, 0);
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
				// expand both members!
				let halfDH = Math.round(aDH / 2);
				this.topMember.resizeBy(0, halfDH);
				bottom.moveBy(0, halfDH);
				bottom.resizeBy(0, aDH - halfDH);
			}
			else {
				this.members.forEach(function(aMember) {
					aMember.resizeBy(0, aDH);
				});
			}
		}
	},

	raise : function FSG_raise()
	{
		this.members.forEach(function(aMember) {
			aMember.raise();
		});
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
			if (aFSWindow.parent == this)
				aFSWindow.parent = null;
		}
		if (this.members.length == 1) {
			let lastMember = this.members[0];
			if (this.parent) {
				// swap existing relations
				lastMember.position = this.position;
				this.parent.register(lastMember);
				this.unregister(lastMember);
			}
			if (this.maximized)
				this.setMaximizedState(lastMember);
			this.destroy();
		}
	},


	reserveResetPositionAndSize : function FSG_reserveResetPositionAndSize(aBaseMember)
	{
		if (this._reservedResetPositionAndSize) {
			this._reservedResetPositionAndSize.cancel();
			delete this._reservedResetPositionAndSize;
		}
		var self = this;
		this._reservedResetPositionAndSize =
			Deferred
				.wait(0.5)
				.next(function() {
					delete self._reservedResetPositionAndSize;
					self.resetPositionAndSize(aBaseMember);
				});
	},

	// reposition/resize grouped windows based on their relations
	resetPositionAndSize : function FSG_resetPositionAndSize(aBaseMember)
	{
		var base = aBaseMember || this.startMember;
		var another = base.sibling;

		base.updateLastPositionAndSize();
		another.updateLastPositionAndSize();

		if (base.isGroup)
			base.resetPositionAndSize();
		if (another.isGroup)
			another.resetPositionAndSize();

		var baseIsStart = base == this.startMember;
		var expectedX = base.position & this.kPOSITION_VERTICAL ?
						base.screenX :
					baseIsStart ?
						base.screenX + base.width :
						base.screenX - another.width ;
		var expectedY = base.position & this.kPOSITION_HORIZONTAL ?
						base.screenY :
					baseIsStart ?
						base.screenY + base.height :
						base.screenY - another.height ;
		if (another.screenX != expectedX || another.screenY != expectedY)
			another.moveTo(expectedX, expectedY);

		var expectedWidth = base.position & this.kPOSITION_VERTICAL ?
							base.width : another.width ;
		var expectedHeight = base.position & this.kPOSITION_HORIZONTAL ?
							base.height : another.height ;
		if (another.width != expectedWidth || another.height != expectedHeight)
			another.resizeTo(expectedWidth, expectedHeight);
	},


	readyToMaximize : function FSG_readyToMaximize()
	{
		if (this.maximized)
			return;

		this._normalX = this.screenX;
		this._normalY = this.screenY;
		this._normalWidth = this.width;
		this._normalHeight = this.height;
		dump([this._normalX, this._normalY, this._normalWidth, this._normalHeight]+'\n');
	},

	maximizeTo : function FSG_maximizeTo(aOptions)
	{
		this.moveTo(aOptions.x, aOptions.y);
		this.resizeTo(aOptions.width, aOptions.height);

		this.maximized = true;
		this.fullscreen = aOptions.fullScreen;
	},

	restore : function FSG_restore()
	{
		if (!this.maximized || !('_normalX' in this))
			return;

		this.moveTo(this._normalX, this._normalY);
		this.resizeTo(this._normalWidth, this._normalHeight);
		delete this._normalX;
		delete this._normalY;
		delete this._normalWidth;
		delete this._normalHeight;

		this.maximized = false;
		this.fullscreen = false;
	},

	setMaximizedState : function FSG_setMaximizedState(aFSWindow)
	{
		if (!this.maximized || !('_normalX' in this))
			return;

		var x = this._normalX;
		var y = this._normalY;
		var width = this._normalWidth;
		var height = this._normalHeight;
		var fullscreen = this.fullscreen;
		Deferred
			.next(function() {
				aFSWindow.moveTo(x, y);
				aFSWindow.resizeTo(width, height);
			})
			.next(function() {
				if (fullscreen)
					aFSWindow.window.fullScreen = true;
				else
					aFSWindow.window.maximize();
			});
	}
};
  
