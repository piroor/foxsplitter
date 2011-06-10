load('lib/jsdeferred');

var EXPORTED_SYMBOLS = ['FoxSplitterBase'];
 
function FoxSplitterBase() 
{
}
FoxSplitterBase.prototype = {
	ATTACHED_POSITION : 'foxsplitter-attached-position',
	ATTACHED_BASE     : 'foxsplitter-attached-base',
	kACTIVE            : 'foxsplitter-window-active',

	// compatible to old implementation
	POSITION_TOP    : (1 << 2),
	POSITION_RIGHT  : (1 << 1),
	POSITION_BOTTOM : (1 << 3),
	POSITION_LEFT   : (1 << 0),

	POSITION_HORIZONTAL : (1 << 0) | (1 << 1),
	POSITION_VERTICAL   : (1 << 2) | (1 << 3),

	POSITION_VALID   : (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3),

	POSITION_OUTSIDE : (1 << 4),
	POSITION_INSIDE  : (1 << 5),


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
		this.lastScreenX = this.screenX;
		this.lastScreenY = this.screenY;
		this.lastWidth   = this.width;
		this.lastHeight  = this.height;
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
