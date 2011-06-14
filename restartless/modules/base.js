load('lib/jsdeferred');

var EXPORTED_SYMBOLS = ['FoxSplitterBase'];

const XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
					.getService(Ci.nsIXULAppInfo)
					.QueryInterface(Ci.nsIXULRuntime);
 
function FoxSplitterBase() 
{
}
FoxSplitterBase.prototype = {
	ATTACHED_POSITION : 'foxsplitter-attached-position',
	ACTIVE            : 'foxsplitter-active',
	HOVER             : 'foxsplitter-hover',
	STATE             : 'foxsplitter-state',
	ID                : 'foxsplitter-id',

	// compatible to old implementation
	POSITION_TOP    : (1 << 2),
	POSITION_RIGHT  : (1 << 1),
	POSITION_BOTTOM : (1 << 3),
	POSITION_LEFT   : (1 << 0),

	POSITION_HORIZONTAL : (1 << 0) | (1 << 1),
	POSITION_VERTICAL   : (1 << 2) | (1 << 3),

	POSITION_VALID   : (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3),
	POSITION_INVALID : 0,

	POSITION_OUTSIDE : (1 << 4),
	POSITION_INSIDE  : (1 << 5),


	// compatible to old implementation
	TILE_MODE_GRID   : 0,
	TILE_MODE_X_AXIS : (1 << 0),
	TILE_MODE_Y_AXIS : (1 << 1),


	isGroup : false,

	get root()
	{
		var parent = this;
		while (parent.parent)
		{
			parent = parent.parent;
		}
		return (parent && parent != this) ? parent : null ;
	},

	get sameAxisRoot()
	{
		var parent = this;
		var isHorizontal = this.position & this.POSITION_HORIZONTAL;
		while (
				parent.parent &&
				(parent.position & this.POSITION_HORIZONTAL) == isHorizontal
			)
		{
			parent = parent.parent;
		}
		return (parent && parent != this) ? parent : this.parent ;
	},

	get sibling()
	{
		var parent = this.parent;
		if (!parent || parent.members.length < 2)
			return null;

		var otherMembers = parent.members.filter(function(aMember) {
				return aMember != this;
			}, this);
		return otherMembers[0];
	},


	createGroup : function FSB_createGroup()
	{
		if (!this.groupClass)
			throw new Error('no constructor for groups');

		return new this.groupClass();
	},

	attachTo : function FSB_attach(aBaseFSWindow, aPosition, aSilent)
	{
		if (!aBaseFSWindow || !(aPosition & this.POSITION_VALID))
			return;

		var newGroup = this.createGroup();
		var existingGroup;

		existingGroup = aBaseFSWindow.parent;
		if (existingGroup) {
			// swap existing relations
			newGroup.position = aBaseFSWindow.position;
			existingGroup.register(newGroup);
			existingGroup.unregister(aBaseFSWindow);
		}
		newGroup.register(aBaseFSWindow);

		existingGroup = this.parent;
		if (existingGroup) {
			// swap existing relations
			newGroup.position = this.position;
			existingGroup.register(newGroup);
			existingGroup.unregister(this);
		}
		newGroup.register(this);

		this.position = aPosition;
		aBaseFSWindow.position = this.opposite[aPosition];

		if (!aSilent)
			this._initPositionAndSize();

		if (this.window) {
			let self = this;
			Deferred.next(function() {
				self.active = self.active; // update status of grouped windows
			});
		}

		if (!this.isGroup)
			this.setGroupedAppearance();

		this.root.saveState();
	},

	_initPositionAndSize : function FSB_initPositionAndSize()
	{
		var base = this.sibling;
		var positionAndSize = this._calculatePositionAndSize(base, this.position);

		if (positionAndSize.base.deltaX || positionAndSize.base.deltaY)
			base.moveBy(positionAndSize.base.deltaX, positionAndSize.base.deltaY);
		if (positionAndSize.base.deltaWidth || positionAndSize.base.deltaHeight)
			base.resizeBy(positionAndSize.base.deltaWidth, positionAndSize.base.deltaHeight);

		if (this.x != positionAndSize.x || this.y != positionAndSize.y)
			this.moveTo(positionAndSize.x, positionAndSize.y);
		if (this.width != positionAndSize.width || this.height != positionAndSize.height)
			this.resizeTo(positionAndSize.width, positionAndSize.height);
	},

	_calculatePositionAndSize : function FSB_calculatePositionAndSize(aBaseFSWidnow, aPosition)
	{
		var x, y, width, height;
		var base = {
				deltaX      : 0,
				deltaY      : 0,
				deltaWidth  : 0,
				deltaHeight : 0
			};
		if (aPosition & this.POSITION_HORIZONTAL) {
			y = aBaseFSWidnow.y;
			width = Math.round(aBaseFSWidnow.width * 0.5);
			height = aBaseFSWidnow.height;
			if (aPosition == this.POSITION_LEFT) {
				x = aBaseFSWidnow.x;
				base.deltaX = width;
			}
			else {
				x = aBaseFSWidnow.x + width;
			}
			base.deltaWidth = -width;
		}
		else {
			x = aBaseFSWidnow.x;
			width = aBaseFSWidnow.width;
			height = Math.round(aBaseFSWidnow.height * 0.5);
			if (aPosition == this.POSITION_TOP) {
				y = aBaseFSWidnow.y;
				base.deltaY = height;
			}
			else {
				y = aBaseFSWidnow.y + height;
			}
			base.deltaHeight = -height;
		}
		return {
			x      : x,
			y      : y,
			width  : width,
			height : height,
			base   : base
		};
	},


	detach : function FSB_detach(aSilent)
	{
		if (!this.parent)
			return;

		var root = this.root;

		if (!aSilent)
			this._expandSibling();

		this.parent.unregister(this);

		if (!this.isGroup)
			this.clearGroupedAppearance();

		root.saveState();
	},

	_expandSibling : function FSB_expandSibling()
	{
		var sibling = this.sibling;
		if (!sibling)
			return;

		if (sibling.position & this.POSITION_HORIZONTAL) {
			if (sibling.position == this.POSITION_RIGHT)
				sibling.moveBy(-this.width, 0);
			sibling.resizeBy(this.width, 0);
		}
		else {
			if (sibling.position == this.POSITION_BOTTOM)
				sibling.moveBy(0, -this.height);
			sibling.resizeBy(0, this.height);
		}
	},


	reserveMoveBy : function FSB_reserveMoveBy(aDX, aDY)
	{
		if (this._reservedMoveBy) {
			this._reservedMoveBy.cancel();
			delete this._reservedMoveBy;
		}

		this._reservedMoveDeltaX = (this._reservedMoveDeltaX || 0) + aDX;
		this._reservedMoveDeltaY = (this._reservedMoveDeltaY || 0) + aDY;

		var self = this;
		this._reservedMoveBy = Deferred.next(function() {
			self.moveBy(self._reservedMoveDeltaX, self._reservedMoveDeltaY);
			delete self._reservedMoveDeltaX;
			delete self._reservedMoveDeltaY
			delete self._reservedMoveBy;
		});
		this._reservedMoveBy.error(this.defaultHandleError);
	},

	reserveResizeBy : function FSB_reserveResizeBy(aDW, aDH)
	{
		if (this._reservedResizeBy) {
			this._reservedResizeBy.cancel();
			delete this._reservedResizeBy;
		}

		this._reservedResizeDeltaWidth = (this._reservedResizeDeltaWidth || 0) + aDW;
		this._reservedResizeDeltaHeight = (this._reservedResizeDeltaHeight || 0) + aDH;

		var self = this;
		this._reservedResizeBy = Deferred.next(function() {
			self.resizeBy(self._reservedResizeDeltaWidth, self._reservedResizeDeltaHeight);
			delete self._reservedResizeDeltaWidth;
			delete self._reservedResizeDeltaHeight
			delete self._reservedResizeBy;
		});
		this._reservedResizeBy.error(this.defaultHandleError);
	},


	onResizeTop : function FSB_onResizeTop(aDelta)
	{
		if (!aDelta) return;
		var splitterResizing = false;
		var sibling = this.sibling;
		if (sibling) {
			if (sibling.position == this.POSITION_TOP) {
				splitterResizing = true;
				sibling.resizeBy(0, -aDelta);
			}
			else if (sibling.position == this.POSITION_BOTTOM) {
				let halfDelta = Math.round(aDelta / 2);
				this.reserveResizeBy(0, -halfDelta);
				sibling.reserveResizeBy(0, aDelta - halfDelta);
				sibling.reserveMoveBy(0, -halfDelta);
			}
			else { // horizontal slbling
				sibling.moveBy(0, -aDelta);
				sibling.resizeBy(0, aDelta)
				this.parent.reserveResetPositionAndSize(this);
			}
		}
		var parent = this.parent;
		if (!splitterResizing && parent)
			parent.onResizeTop(aDelta);
	},

	onResizeRight : function FSB_onResizeRight(aDelta)
	{
		if (!aDelta) return;
		var splitterResizing = false;
		var sibling = this.sibling;
		if (sibling) {
			if (sibling.position == this.POSITION_RIGHT) {
				splitterResizing = true;
				sibling.moveBy(aDelta, 0);
				sibling.resizeBy(-aDelta, 0);
			}
			else if (sibling.position == this.POSITION_LEFT) {
				let halfDelta = Math.round(aDelta / 2);
				// resize before move, to prevent unexpected resizing fired by window move
				this.reserveResizeBy(-(aDelta - halfDelta), 0);
				this.reserveMoveBy(halfDelta, 0);
				sibling.reserveResizeBy(halfDelta, 0);
			}
			else { // vertical slbling
				sibling.resizeBy(aDelta, 0);
				this.parent.reserveResetPositionAndSize(this);
			}
		}
		var parent = this.parent;
		if (!splitterResizing && parent)
			parent.onResizeRight(aDelta);
	},

	onResizeBottom : function FSB_onResizeBottom(aDelta)
	{
		if (!aDelta) return;
		var splitterResizing = false;
		var sibling = this.sibling;
		if (sibling) {
			if (sibling.position == this.POSITION_BOTTOM) {
				splitterResizing = true;
				sibling.moveBy(0, aDelta);
				sibling.resizeBy(0, -aDelta);
			}
			else if (sibling.position == this.POSITION_TOP) {
				let halfDelta = Math.round(aDelta / 2);
				// resize before move, to prevent unexpected resizing fired by window move
				this.reserveResizeBy(0, -(aDelta - halfDelta));
				this.reserveMoveBy(0, halfDelta);
				sibling.reserveResizeBy(0, halfDelta);
			}
			else { // horizontal slbling
				sibling.resizeBy(0, aDelta);
				this.parent.reserveResetPositionAndSize(this);
			}
		}
		var parent = this.parent;
		if (!splitterResizing && parent)
			parent.onResizeBottom(aDelta);
	},

	onResizeLeft : function FSB_onResizeLeft(aDelta)
	{
		if (!aDelta) return;
		var splitterResizing = false;
		var sibling = this.sibling;
		if (sibling) {
			if (sibling.position == this.POSITION_LEFT) {
				splitterResizing = true;
				sibling.resizeBy(-aDelta, 0);
			}
			else if (sibling.position == this.POSITION_RIGHT) {
				let halfDelta = Math.round(aDelta / 2);
				this.reserveResizeBy(-halfDelta, 0);
				sibling.reserveMoveBy(-halfDelta, 0);
				sibling.reserveResizeBy(aDelta - halfDelta, 0);
			}
			else { // vertical sibling
				sibling.moveBy(-aDelta, 0);
				sibling.resizeBy(aDelta, 0);
				this.parent.reserveResetPositionAndSize(this);
			}
		}
		var parent = this.parent;
		if (!splitterResizing && parent)
			parent.onResizeLeft(aDelta);
	},

	updateLastPositionAndSize : function FSB_updateLastPositionAndSize()
	{
		if (!this.isGroup && !this._window)
			return;

		this.lastX      = this.x;
		this.lastY      = this.y;
		this.lastWidth  = this.width;
		this.lastHeight = this.height;
	},


	isAccelKeyPressed : function FSB_isAccelKeyPressed(aEvent)
	{
		return XULAppInfo.OS == 'Darwin' ? aEvent.metaKey : aEvent.ctrlKey ;
	},

	defaultHandleError : function FSB_defaultHandleError(aError)
	{
		dump(aError+'\n'+aError.stack.replace(/^/gm, '  ')+'\n');
		throw aError;
	},

	dumpError : function FSB_dumpError(aError, aMessage)
	{
		var message = aMessage ? aMessage+'\n' : '' ;
		dump(message+aError+'\n'+aError.stack.replace(/^/gm, '  ')+'\n');
	}
};

var prototype = FoxSplitterBase.prototype;
prototype.positionName = {};
prototype.positionName[prototype.POSITION_TOP]     = 'top';
prototype.positionName[prototype.POSITION_RIGHT]   = 'right';
prototype.positionName[prototype.POSITION_BOTTOM]  = 'bottom';
prototype.positionName[prototype.POSITION_LEFT]    = 'left';
prototype.positionName[prototype.POSITION_INSIDE]  = 'in';
prototype.positionName[prototype.POSITION_OUTSIDE] = 'out';
prototype.opposite = {};
prototype.opposite[prototype.POSITION_TOP]     = prototype.POSITION_BOTTOM;
prototype.opposite[prototype.POSITION_RIGHT]   = prototype.POSITION_LEFT;
prototype.opposite[prototype.POSITION_BOTTOM]  = prototype.POSITION_TOP;
prototype.opposite[prototype.POSITION_LEFT]    = prototype.POSITION_RIGHT;
prototype.opposite[prototype.POSITION_INSIDE]  = prototype.POSITION_OUTSIDE;
prototype.opposite[prototype.POSITION_OUTSIDE] = prototype.POSITION_INSIDE;
