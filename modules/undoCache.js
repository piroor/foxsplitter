var EXPORTED_SYMBOLS = ['undoCache'];

const Prefs = Components
		.classes['@mozilla.org/preferences;1']
		.getService(Components.interfaces.nsIPrefBranch);;

var undoCache = {

	get entries()
	{
		if (!this._entries) {
			try {
				if (!Prefs.getBoolPref('splitbrowser.state.restore')) {
					this._entries = [];
				}
				else {
					var entries = decodeURIComponent(escape(Prefs.getCharPref('splitbrowser.undo.state')));
					this._entries = entries.split('|')
							.map(function(aEntry) {
								try {
									aEntry = unescape(aEntry);
									eval('aEntry = '+aEntry);
								}
								catch(e) {
									aEntry = null;
								}
								return aEntry;
							})
							.filter(function(aEntry) {
								return aEntry;
							});
				}
			}
			catch(e) {
				this._entries = [];
			}
		}
		return this._entries;
	},
	_entries : null,

	addEntry : function(aTitle, aIcon, aState)
	{
		this.entries.unshift({
			title : aTitle,
			icon  : aIcon,
			state : aState
		});
		this.entries.slice(0, this.maxCount);
		this.updateBroadcasters();
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
		this.updateBroadcasters();
	},

	get maxCount()
	{
		return Prefs.getIntPref('splitbrowser.undo.max');
	},


	broadcasters : [],

	registerBroadcaster : function(aBroadcaster)
	{
		if (this.broadcasters.indexOf(aBroadcaster) < 0) {
			this.broadcasters.push(aBroadcaster);
			this.updateBroadcasters();
		}
	},

	unregisterBroadcaster : function(aBroadcaster)
	{
		var index = this.broadcasters.indexOf(aBroadcaster);
		if (index > -1)
			this.broadcasters.splice(index, 1);
	},

	updateBroadcasters : function()
	{
		this.entries;
		this.broadcasters.forEach(
			this.entries.length ?
				function(aBroadcaster) {
					aBroadcaster.removeAttribute('disabled');
				} :
				function(aBroadcaster) {
					aBroadcaster.setAttribute('disabled', true);
				}
		);
		this.saveEntries();
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
	},

	saveEntries : function()
	{
		if (!Prefs.getBoolPref('splitbrowser.state.restore')) return;
		var entries = this._entries
				.map(function(aEntry) {
					try {
						return escape(aEntry.toSource())
					}
					catch(e) {
						return null;
					}
				})
				.filter(function(aEntry) {
					return aEntry;
				})
				.join('|');
		try {
			Prefs.setCharPref('splitbrowser.undo.state', unescape(encodeURIComponent(entries)));
		}
		catch(e) {
		}
	}

};
