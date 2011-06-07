var EXPORTED_SYMBOLS = ['FoxSplitterBase'];
 
function FoxSplitterBase() 
{
}
FoxSplitterBase.prototype = {
	kATTACHED_POSITION : 'foxsplitter-attached-position',

	kPOSITION_TOP    : (1 << 0),
	kPOSITION_RIGHT  : (1 << 1),
	kPOSITION_BOTTOM : (1 << 2),
	kPOSITION_LEFT   : (1 << 3),
	kPOSITION_HORIZONTAL : (1 << 1) | (1 << 3),
	kPOSITION_VERTICAL   : (1 << 0) | (1 << 2),
	kPOSITION_OUTSIDE : (1 << 4),
	kPOSITION_INSIDE  : (1 << 5),
	kPOSITION_INVALID : (1 << 4) | (1 << 5),

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
	}
};

var prototype = FoxSplitterBase.prototype;
prototype.positionName = {};
prototype.positionName[prototype.kPOSITION_TOP]     = 'top';
prototype.positionName[prototype.kPOSITION_RIGHT]   = 'right';
prototype.positionName[prototype.kPOSITION_BOTTOM]  = 'bottom';
prototype.positionName[prototype.kPOSITION_LEFT]    = 'left';
prototype.positionName[prototype.kPOSITION_INSIDE]  = 'in';
prototype.positionName[prototype.kPOSITION_OUTSIDE] = 'out';
prototype.opposite = {};
prototype.opposite[prototype.kPOSITION_TOP]     = prototype.kPOSITION_BOTTOM;
prototype.opposite[prototype.kPOSITION_RIGHT]   = prototype.kPOSITION_LEFT;
prototype.opposite[prototype.kPOSITION_BOTTOM]  = prototype.kPOSITION_TOP;
prototype.opposite[prototype.kPOSITION_LEFT]    = prototype.kPOSITION_RIGHT;
prototype.opposite[prototype.kPOSITION_INSIDE]  = prototype.kPOSITION_OUTSIDE;
prototype.opposite[prototype.kPOSITION_OUTSIDE] = prototype.kPOSITION_INSIDE;
