var exports = {
	domain : 'extensions.foxsplitter@piro.sakura.ne.jp.',

	ATTACHED_POSITION : 'foxsplitter-attached-position',
	ACTIVE            : 'foxsplitter-active',
	HOVER             : 'foxsplitter-hover',
	STATE             : 'foxsplitter-state',
	ID                : 'foxsplitter-id',

	EVENT_TYPE_READY : 'nsDOMFoxSplitterReady',
	EVENT_TYPE_WINDOW_STATE_CHANGED : 'nsDOMFoxSplitterWindowStateChange',

	STATE_MAXIMIZED  : Ci.nsIDOMChromeWindow.STATE_MAXIMIZED,
	STATE_MINIMIZED  : Ci.nsIDOMChromeWindow.STATE_MINIMIZED,
	STATE_NORMAL     : Ci.nsIDOMChromeWindow.STATE_NORMAL,
	STATE_FULLSCREEN : Ci.nsIDOMChromeWindow.STATE_FULLSCREEN,

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


	IMPORT_NOTHING     : 0,
	IMPORT_ALL         : 1,
	IMPORT_ONLY_HIDDEN : 2
};

exports.positionName = {};
exports.positionName[exports.POSITION_TOP]     = 'top';
exports.positionName[exports.POSITION_RIGHT]   = 'right';
exports.positionName[exports.POSITION_BOTTOM]  = 'bottom';
exports.positionName[exports.POSITION_LEFT]    = 'left';
exports.positionName[exports.POSITION_INSIDE]  = 'in';
exports.positionName[exports.POSITION_OUTSIDE] = 'out';

exports.opposite = {};
exports.opposite[exports.POSITION_TOP]     = exports.POSITION_BOTTOM;
exports.opposite[exports.POSITION_RIGHT]   = exports.POSITION_LEFT;
exports.opposite[exports.POSITION_BOTTOM]  = exports.POSITION_TOP;
exports.opposite[exports.POSITION_LEFT]    = exports.POSITION_RIGHT;
exports.opposite[exports.POSITION_INSIDE]  = exports.POSITION_OUTSIDE;
exports.opposite[exports.POSITION_OUTSIDE] = exports.POSITION_INSIDE;

