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

	get id()
	{
		return this.members.length == 2 ?
				this.startMember.id+':'+this.endMember.id :
				null ;
	},

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
	get endMember()
	{
		return this.bottomMember || this.rightMember;
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

	get state()
	{
		var self = {
				id       : this.id,
				position : this.position ? this.positionName[this.position] : null ,
				members  : {}
			};
		var top = this.topMember;
		if (top) self.members.top = top.state;
		var left = this.leftMember;
		if (left) self.members.left = left.state;
		var bottom = this.bottomMember;
		if (bottom) self.members.bottom = bottom.state;
		var right = this.rightMember;
		if (right) self.members.right = right.state;
		return self;
	},


	init : function FSG_init() 
	{
		this.parent = null;
		this.resetting = 0;
		this.members = [];

		FoxSplitterGroup.instances.push(this);
	},
 
	destroy : function FSG_destroy() 
	{
		this.members.forEach(function(aMember) {
			this.unregister(aMember);
		}, this);

		if (this.parent)
			this.parent.unregister(this);

		FoxSplitterGroup.instances = FoxSplitterGroup.instances.filter(function(aFSGroup) {
			return aFSGroup != this;
		}, this);
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
		return this.resizeBy(aW - this.width, aH - this.height);
	},

	resizeBy : function FSG_resizeBy(aDW, aDH)
	{
		var deferreds = [];
		if (aDW) {
			let right = this.rightMember;
			if (right) {
				// expand both members!
				let halfDW = Math.round(aDW / 2);
				this.leftMember.resizeBy(halfDW, 0);
				right.moveBy(halfDW, 0);
				deferreds.push(right.resizeBy(aDW - halfDW, 0));
			}
			else {
				this.members.forEach(function(aMember) {
					deferreds.push(aMember.resizeBy(aDW, 0));
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
				deferreds.push(bottom.resizeBy(0, aDH - halfDH));
			}
			else {
				this.members.forEach(function(aMember) {
					deferreds.push(aMember.resizeBy(0, aDH));
				});
			}
		}
		return deferreds.length ?
				Deferred.parallel(deferreds) :
				Deferred.next(function() {});
	},

	raise : function FSG_raise(aFinallyRaised)
	{
		var deferreds = [];
		this.allWindows.forEach(function(aMember) {
			if (aFinallyRaised == aMember)
				return;
			var deferred = aMember.raise(aFinallyRaised);
			if (deferred)
				deferreds.push(deferred);
		});
		if (aFinallyRaised) {
			this.memberClass.raising++;
			if (deferreds.length) {
				let self = this;
				Deferred
					.parallel(deferreds)
					.next(function() {
						aFinallyRaised.raise();
						self.memberClass.raising--;
					});
			}
			else {
				aFinallyRaised.raise();
				this.memberClass.raising--;
			}
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
		}
	},

	unregister : function FSG_unregister(aMember)
	{
		var index = this.members.indexOf(aMember);
		if (index > -1) {
			this.members.splice(index, 1);
			if (aMember.parent == this)
				aMember.parent = null;
		}
		if (this.members.length <= 1) {
			let lastMember = this.members[0];
			if (lastMember) {
				if (this.parent) {
					// swap existing relations
					lastMember.position = this.position;
					this.parent.register(lastMember);
					this.unregister(lastMember);
				}
				if (this.maximized)
					this.setMaximizedState(lastMember);
			}
			this.destroy();
		}
	},


	reserveResetPositionAndSize : function FSG_reserveResetPositionAndSize(aBaseMember, aForce)
	{
		var deferred = new Deferred();

		if (this._reservedResetPositionAndSize) {
			this._reservedResetPositionAndSize.cancel();
			delete this._reservedResetPositionAndSize;
		}

		if (this._lastReserveResetPositionAndSize) {
			this._lastReserveResetPositionAndSize.call();
			delete this._lastDeferred;
		}

		if (aForce)
			this._lastReserveResetPositionAndSizeForce = true;

		var self = this;
		this._reservedResetPositionAndSize = Deferred.wait(0.5);
		this._reservedResetPositionAndSize
			.next(function() {
				var force = self._lastReserveResetPositionAndSizeForce;
				delete self._reservedResetPositionAndSize;
				delete self._lastReserveResetPositionAndSize;
				delete self._lastReserveResetPositionAndSizeForce;
				self.resetPositionAndSize(aBaseMember, force);
				deferred.call();
			})
			.error(this.defaultHandleError);

		this._lastReserveResetPositionAndSize = deferred;

		return deferred.error(this.defaultHandleError);
	},

	// reposition/resize grouped windows based on their relations
	resetPositionAndSize : function FSG_resetPositionAndSize(aBaseMember, aForce)
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

			base.updateLastPositionAndSize();
			another.updateLastPositionAndSize();

			if (base.isGroup)
				base.resetPositionAndSize(aBaseMember, aForce);
			if (another.isGroup)
				another.resetPositionAndSize(aBaseMember, aForce);


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
			if (aForce || another.x != expectedX || another.y != expectedY)
				another.moveTo(expectedX, expectedY);

			var expectedWidth = base.position & this.POSITION_VERTICAL ?
								base.width : another.width ;
			var expectedHeight = base.position & this.POSITION_HORIZONTAL ?
								base.height : another.height ;
			if (aForce || another.width != expectedWidth || another.height != expectedHeight)
				another.resizeTo(expectedWidth, expectedHeight);

			if (this.parent)
				this.parent.resetPositionAndSize(this, aForce);
		}
		catch(e) {
			this.dumpError(e, 'FoxSplitter: FAILED TO RESET POSITION AND SIZE!');
		}

		this.resetting--;
	},

	updateLastPositionAndSize : function FSG_updateLastPositionAndSize(aNewSize)
	{
		this.lastX      = this.x;
		this.lastY      = this.y;
		this.lastWidth  = this.width;
		this.lastHeight = this.height;
	},


	maximize : function FSG_maximize()
	{
		this.allWindows[0].maximize();
	},

	minimize : function FSG_minimize()
	{
		this.allWindows[0].minimize();
	},

	restore : function FSG_restore(aTriggerFSWindow)
	{
		if (this.maximized)
			return this._restoreFromMaximized(aTriggerFSWindow);
		else if (this.minimized)
			return this._restoreFromMinimized(aTriggerFSWindow);

		return Deferred.next(function() {});
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
			return Deferred.next(function() {});

		this.moveTo(this._normalX, this._normalY);
		this.resizeTo(this._normalWidth, this._normalHeight);
		delete this._normalX;
		delete this._normalY;
		delete this._normalWidth;
		delete this._normalHeight;

		this.maximized = false;
		this.fullscreen = false;

		return Deferred.next(function() {});
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
				return aFSWindow.resizeTo(width, height);
			})
			.next(function() {
				if (fullscreen)
					return aFSWindow.fullscreen();
				else
					return aFSWindow.maximize();
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
			return Deferred.next(function() {});

		this.allWindows.forEach(function(aFSWindow) {
			if (aFSWindow.minimized)
				aFSWindow.window.restore();
		});

		var deferred;
		if (aTriggerFSWindow && aTriggerFSWindow.parent)
			deferred = aTriggerFSWindow.parent.reserveResetPositionAndSize(aTriggerFSWindow);
		else
			deferred = this.reserveResetPositionAndSize();

		this.minimized = false;

		return deferred || Deferred.next(function() {});
	}
};

FoxSplitterBase.prototype.groupClass = FoxSplitterGroup;

FoxSplitterGroup.instances = [];
FoxSplitterGroup.getInstanceById = function FSG_getInstanceById(aId) {
	var found = null;
	this.instances.some(function(aInstance) {
		if (aInstance.id == aId)
			return found = aInstance;
		return false;
	});
	return found;
};


function shutdown()
{
	FoxSplitterBase.prototype.groupClass = null;
}
