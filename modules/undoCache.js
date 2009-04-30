var EXPORTED_SYMBOLS = ['undoCache'];

const Prefs = Components
		.classes['@mozilla.org/preferences;1']
		.getService(Components.interfaces.nsIPrefBranch);;

var undoCache = {

	entries : [],

	addEntry : function(aTitle, aIcon, aState)
	{
		this.entries.unshift({
			title : aTitle,
			icon  : aIcon,
			state : aState
		});
		this.entries.slice(0, this.maxCount);
	},

	getEntryAt : function(aIndex)
	{
		if (aIndex >= this.entries.length) return null;
		return this.entries[aIndex];
	},

	removeEntryAt : function(aIndex)
	{
		if (aIndex >= this.entries.length) return;
		this.entries.splice(aIndex, 1);
	},

	get maxCount()
	{
		return Prefs.getIntPref('splitbrowser.undo.max');
	},


	broadcasters : [],

	registerBroadcaster : function(aBroadcaster)
	{
		if (this.broadcasters.indexOf(aBroadcaster) < 0)
			this.broadcasters.push(aBroadcaster);
	},

	unregisterBroadcaster : function(aBroadcaster)
	{
		var index = this.broadcasters.indexOf(aBroadcaster);
		if (index > -1)
			this.broadcasters.splice(index, 1);
	},

	updateBroadcasters : function()
	{
		this.broadcasters.forEach(
			this.entries.length ?
				function(aBroadcaster) {
					aBroadcaster.removeAttribute('disabled');
				} :
				function(aBroadcaster) {
					aBroadcaster.setAttribute('disabled', true);
				}
		);
	},


	initUndoList : function(aPopup)
	{
		var d = aPopup.ownerDocument;
		var range = d.createRange();
		range.selectNodeContents(aPopup);
		range.deleteContents();

		var f = d.createDocumentFragment();
		this.entries.forEach(function(aEntry, aIndex) {
			let item = f.appendChild(d.createElement('menuitem'));
			item.setAttribute('label', aEntry.title);
			item.setAttribute('index', aIndex);
			item.setAttribute('src', aEntry.icon);
			item.setAttribute('class', 'menuitem-iconic');
		}, this);

		range.insertNode(f);
		range.detach();
	}

};
