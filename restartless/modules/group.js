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

	get x()
	{
		var member = this.leftMember || this.topMember;
		return member ? member.x : 0 ;
	},
	get y()
	{
		var member = this.topMember || this.leftMember;
		return member ? member.y : 0 ;
	},
	get width()
	{
		var member = this.rightMember || this.bottomMember;
		return member ? member.x - this.x + member.width : 0 ;
	},
	get height()
	{
		var member = this.bottomMember || this.rightMember;
		return member ? member.y - this.y + member.height : 0 ;
	},


	get topMember()
	{
		return this._getMemberAt(this.POSITION_TOP);
	},
	get rightMember()
	{
		return this._getMemberAt(this.POSITION_RIGHT);
	},
	get bottomMember()
	{
		return this._getMemberAt(this.POSITION_BOTTOM);
	},
	get leftMember()
	{
		return this._getMemberAt(this.POSITION_LEFT);
	},
	get startMember()
	{
		return this.topMember || this.leftMember;
	},
	_getMemberAt : function FSG_getMemberAt(aPosition)
	{
		var member = null;
		this.members.some(function(aMember) {
			return member = aMember.position == aPosition ? aMember : null ;
		});
		return member;
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
		}).sort(this._sortWindows);
	},

	_sortWindows : function FSG_sortWindows(aA, aB)
	{
		return aA.y - aB.y || aA.x - aB.x;
	},

	get hasMinimizedWindow()
	{
		return this.members.some(function(aMember) {
			return aMember.isGroup ?
					aMember.hasMinimizedWindow :
					aMember.windowState == aMember.window.STATE_MINIMIZED ;
		});
	},


	init : function FSG_init() 
	{
		this.id = 'group-' + Date.now() + '-' + parseInt(Math.random() * 65000);
		this.parent = null;

		this.resetting = 0;

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
		this.moveBy(aX - this.x, aY - this.y, aSource);
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

	raise : function FSG_raise(aFinallyRaised)
	{
		var deferreds = [];
		this.members.forEach(function(aMember) {
			if (aFinallyRaised == aMember)
				return;
			var deferred = aMember.raise(aFinallyRaised);
			if (deferred)
				deferreds.push(deferred);
		});
		if (aFinallyRaised) {
			if (deferreds.length)
				Deferred
					.parallel(deferreds)
					.next(function() {
						aFinallyRaised.raise();
					});
			else
				aFinallyRaised.raise();
		}
	},

	canClose : function FSG_canClose(aExceptionMember)
	{
		return this.members.every(function(aMember) {
			return (
				aMember == aExceptionMember ||
				aMember.canClose(aExceptionMember)
			);
		});
	},

	close : function FSG_close(aForce)
	{
		this.closeExcept(null, aForce);
	},

	closeExcept : function FSG_closeExcept(aExceptionMember, aForce)
	{
		if (aForce || this.canClose(aExceptionMember)) {
			this.members.slice(0).forEach(function(aMember) {
				if (aMember != aExceptionMember)
					if (aMember.isGroup)
						aMember.closeExcept(aExceptionMember, true);
					else
						aMember.close(true);
			});
			if (aExceptionMember && !aExceptionMember.isGroup)
				aExceptionMember.clearGroupedAppearance();
		}
	},


	// group specific features

	register : function FSG_register(aMember)
	{
		if (this.members.indexOf(aMember) < 0) {
			this.members.push(aMember);
			aMember.parent = this;
			if (!aMember.isGroup)
				aMember.watchWindowState();
		}
	},

	unregister : function FSG_unregister(aMember)
	{
		var index = this.members.indexOf(aMember);
		if (index > -1) {
			this.members.splice(index, 1);
			if (aMember.parent == this) {
				aMember.parent = null;
				if (!aMember.isGroup)
					aMember.unwatchWindowState();
			}
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
		this._reservedResetPositionAndSize = Deferred.wait(0.5);
		this._reservedResetPositionAndSize
			.next(function() {
				delete self._reservedResetPositionAndSize;
				self.resetPositionAndSize(aBaseMember);
			})
			.error(this.defaultHandleError);
	},

	// reposition/resize grouped windows based on their relations
	resetPositionAndSize : function FSG_resetPositionAndSize(aBaseMember)
	{
		if (
			this.resetting ||
			this.hasMinimizedWindow ||
			this.members.length < 2
			)
			return;

		this.resetting++;

		try {
			var base = aBaseMember;
			if (!base || base.parent != this)
				base = this.startMember;
			var another = base.sibling;

			base.updateLastPositionAndSize(aBaseMember);
			another.updateLastPositionAndSize(aBaseMember);

			if (base.isGroup)
				base.resetPositionAndSize();
			if (another.isGroup)
				another.resetPositionAndSize();

			var expectedX = base.position & this.POSITION_VERTICAL ?
							base.x :
						base.position & this.POSITION_LEFT ?
							base.x + base.width :
							base.x - another.width ;
			var expectedY = base.position & this.POSITION_HORIZONTAL ?
							base.y :
						base.position & this.POSITION_TOP ?
							base.y + base.height :
							base.y - another.height ;
			if (another.x != expectedX || another.y != expectedY)
				another.moveTo(expectedX, expectedY);

			var expectedWidth = base.position & this.POSITION_VERTICAL ?
								base.width : another.width ;
			var expectedHeight = base.position & this.POSITION_HORIZONTAL ?
								base.height : another.height ;
			if (another.width != expectedWidth || another.height != expectedHeight)
				another.resizeTo(expectedWidth, expectedHeight);

			if (this.parent)
				this.parent.resetPositionAndSize(this);
		}
		catch(e) {
			this.dumpError(e, 'FoxSplitter: FAILED TO RESET POSITION AND SIZE!');
		}

		this.resetting--;
	},


	restore : function FSG_restore(aTriggerFSWindow)
	{
		if (this.maximized)
			return this._restoreFromMaximized(aTriggerFSWindow);
		else if (this.minimized)
			return this._restoreFromMinimized(aTriggerFSWindow);
	},


	readyToMaximize : function FSG_readyToMaximize()
	{
		if (this.maximized)
			return;

		this._normalX = this.x;
		this._normalY = this.y;
		this._normalWidth = this.width;
		this._normalHeight = this.height;
	},

	maximizeTo : function FSG_maximizeTo(aOptions)
	{
		this.moveTo(aOptions.x, aOptions.y);
		this.resizeTo(aOptions.width, aOptions.height);

		this.maximized = true;
		this.fullscreen = aOptions.fullScreen;
	},

	_restoreFromMaximized : function FSG_restoreFromMaximized()
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
			})
			.error(this.defaultHandleError);
	},


	minimize : function FSG_minimize(aTriggerFSWindow)
	{
		this.minimized = true;

		var focused = null;
		this.allWindows.some(function(aFSWindow) {
			if (aFSWindow.active)
				return focused = aFSWindow;
			return false;
		});

		this.allWindows.forEach(function(aFSWindow) {
			if (aFSWindow != focused && !aFSWindow.minimized)
				aFSWindow.window.minimize();
		});

		/**
		 * The active window must be minimized with delay, because
		 * this process possibly focuses to a minimized window in this group
		 * even if it has been already minimized in the same event loop.
		 */
		if (focused)
			Deferred.next(function() {
				if (!focused.minimized)
					focused.window.minimize();
			})
			.error(this.defaultHandleError);
	},

	_restoreFromMinimized : function FSG_restoreFromMinimized(aTriggerFSWindow)
	{
		if (!this.minimized)
			return;

		this.allWindows.forEach(function(aFSWindow) {
			if (aFSWindow.minimized)
				aFSWindow.window.restore();
		});

		if (aTriggerFSWindow && aTriggerFSWindow.parent)
			aTriggerFSWindow.parent.reserveResetPositionAndSize(aTriggerFSWindow);
		else
			this.reserveResetPositionAndSize();

		this.minimized = false;
	}
};

FoxSplitterBase.prototype.groupClass = FoxSplitterGroup;


function shutdown()
{
	FoxSplitterBase.prototype.groupClass = null;
}
