var EXPORTED_SYMBOLS = ['undoCache'];

const MIN_CACHE_COUNT = 0;
const MAX_CACHE_COUNT = 1000;

const Prefs = Components
		.classes['@mozilla.org/preferences;1']
		.getService(Components.interfaces.nsIPrefBranch);
const ObserverService = Components
		.classes['@mozilla.org/observer-service;1']
		.getService(Components.interfaces.nsIObserverService);

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
			state : aState,
			date  : Date.now()
		});
		this._entries = this.entries.slice(0, this.maxCount);
		this._onChange();
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
		this._onChange();
	},

	get maxCount()
	{
		return Math.min(MAX_CACHE_COUNT, Math.max(MIN_CACHE_COUNT, Prefs.getIntPref('splitbrowser.undo.max')));
	},

	saveEntries : function(aForce)
	{
		if (!aForce && !Prefs.getBoolPref('splitbrowser.state.restore')) return;
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
	},

	clearEntries : function(aClearRange)
	{
		if (!aClearRange) {
			this._entries = [];
		}
		else if (aClearRange.length == 2) {
			this._entries = this._entries.filter(function(aEntry) {
				var date = aEntry.date * 1000;
				return aRange[0] <= date && aRange[1] >= date;
			});
		}
		this._onChange();
	},

	_sanitizeOnShutdown : function()
	{
		const SHOUTDOWN_PREF = 'privacy.sanitize.didShutdownSanitize';
		if (
			!Prefs.prefHasUserValue(SHOUTDOWN_PREF) ||
			!Prefs.getBoolPref(SHOUTDOWN_PREF)
			)
			return;
		this.clearEntries();
		this.saveEntries();
	},


	_broadcasters : [],

	registerBroadcaster : function(aBroadcaster)
	{
		if (this._broadcasters.indexOf(aBroadcaster) < 0) {
			this._broadcasters.push(aBroadcaster);
			this._onChange();
		}
	},

	unregisterBroadcaster : function(aBroadcaster)
	{
		var index = this._broadcasters.indexOf(aBroadcaster);
		if (index > -1)
			this._broadcasters.splice(index, 1);
	},

	_onChange : function()
	{
		this.entries;
		this._broadcasters.forEach(
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
		var max = 36;
		this.entries.forEach(function(aEntry, aIndex) {
			let item = f.appendChild(d.createElement('menuitem'));
			item.setAttribute('label', aEntry.title);
			item.setAttribute('index', aIndex);
			item.setAttribute('src', aEntry.icon);
			item.setAttribute('class', 'menuitem-iconic');
			if (aIndex <= max)
				item.setAttribute('accesskey', aIndex.toString(max));
		}, this);

		range.insertNode(f);
		range.detach();
	},

	observe : function(aSubject, aTopic, aData) 
	{
		switch (aTopic)
		{
			case 'profile-change-teardown':
				this._sanitizeOnShutdown();
				return;
		}
	}

};

// "didShutdownSanitize" pref is turned on when "quite-application" is fired.
// "profile-change-teardown" is fired next to the "quite-application" event, so
// we should handle it.
ObserverService.addObserver(undoCache, 'profile-change-teardown', false);
