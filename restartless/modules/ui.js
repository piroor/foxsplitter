load('lib/jsdeferred');
load('lib/prefs');

var EXPORTED_SYMBOLS = ['FoxSplitterUI'];

var FoxSplitterConst = require('const');
var domain = FoxSplitterConst.domain;

function FoxSplitterUI(aFSWindow) 
{
	this.init(aFSWindow);
}
FoxSplitterUI.prototype = {
	__proto__ : FoxSplitterConst,

	get window()
	{
		return this.owner.window;
	},
	get document()
	{
		return this.owner.document;
	},
	get documentElement()
	{
		return this.owner.documentElement;
	},

	init : function FSUI_init(aFSWindow)
	{
		this.owner = aFSWindow;
	},

	destroy : function FSUI_destroy()
	{
		delete this.owner;
	}
};

var prefListener = {
		domain : domain,
		observe : function FSUIPL_observe(aSubject, aTopic, aData) {
			if (aTopic != 'nsPref:changed')
				return;

			var prefName = aData.replace(domain, '');
			if (prefName in FoxSplitterUI)
				FoxSplitterUI[prefName] = prefs.getPref(aData);
		}
	};

prefs.addPrefListener(prefListener);

function shutdown()
{
	prefs.removePrefListener(prefListener);
	prefs = undefined;
	Deferred = undefined;
	FoxSplitterConst = undefined;
}
