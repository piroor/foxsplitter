load('lib/WindowManager');

FoxSplitterConst = require('const');
load('defaults');
load('config');

load('base');
load('window');
load('group');

const TYPE_BROWSER = 'navigator:browser';
const TOOLBAR_CUSTOMIZE = 'CustomizeToolbarWindow';


// disable old Fox Splitter
const OLD_ID = '{29c4afe1-db19-4298-8785-fcc94d1d6c1d}';

function restart()
{
	Cc['@mozilla.org/toolkit/app-startup;1']
		.getService(Ci.nsIAppStartup)
		.quit(Ci.nsIAppStartup.eForceQuit | Ci.nsIAppStartup.eRestart);
}

var shouldShowRestartPrompt = false;
if ('@mozilla.org/extensions/manager;1' in Cc) { // Firefox 3.6
	let EM = Cc['@mozilla.org/extensions/manager;1']
				.getService(Ci.nsIExtensionManager);
	let item = EM.getItemForID(OLD_ID);
	if (item) {
		let RDF = Cc['@mozilla.org/rdf/rdf-service;1']
					.getService(Ci.nsIRDFService);
		let res  = RDF.GetResource('urn:mozilla:item:'+OLD_ID);
		let appDisabled = false;
		try {
			appDisabled = EM.datasource.GetTarget(
					res,
					RDF.GetResource('http://www.mozilla.org/2004/em-rdf#appDisabled'),
					true
				).QueryInterface(Ci.nsIRDFLiteral)
				.Value == 'true';
		}
		catch(e) {
		}
		let userDisabled = false;
		try {
			userDisabled = EM.datasource.GetTarget(
					res,
					RDF.GetResource('http://www.mozilla.org/2004/em-rdf#userDisabled'),
					true
				).QueryInterface(Ci.nsIRDFLiteral)
				.Value == 'true';
		}
		catch(e) {
		}

		if (!appDisabled && !userDisabled) {
			EM.disableItem(OLD_ID);
			restart();
		}
	}
}
else {
	Cu.import('resource://gre/modules/AddonManager.jsm');
	AddonManager.getAddonByID(OLD_ID, function(aAddon) {
		if (aAddon && !aAddon.userDisabled) {
			aAddon.userDisabled = true;
			var bundle = require('lib/locale')
							.get(resolve('locale/label.properties'));
			if (Cc['@mozilla.org/embedcomp/prompt-service;1']
					.getService(Ci.nsIPromptService)
					.confirmEx(
						null,
						bundle.getString('disableOldVersion.title'),
						bundle.getString('disableOldVersion.text'),
						Ci.nsIPromptService.STD_YES_NO_BUTTONS,
						null,
						null,
						null,
						null,
						{}
					) == 0)
				return restart();
		}
	})
}


function handleWindow(aWindow, aInitialization)
{
	var doc = aWindow.document;
	if (doc.documentElement.getAttribute('windowtype') == TYPE_BROWSER) {
		aWindow.FoxSplitter = new FoxSplitterWindow(aWindow, aInitialization);
		if (!('SplitBrowser' in aWindow))
			aWindow.SplitBrowser = aWindow.FoxSplitter;
	}
	else if (doc.documentElement.getAttribute('id') == TOOLBAR_CUSTOMIZE) {
		doc.__foxsplitter__style = doc.createProcessingInstruction('xml-stylesheet',
			'type="text/css" href="data:text/css,'+encodeURIComponent(FoxSplitterConst.STYLESHEET)+'"');
		doc.insertBefore(doc.__foxsplitter__style, doc.documentElement);
	}
}

WindowManager.getWindows(null).forEach(function(aWindow) {
	handleWindow(aWindow, true);
});
WindowManager.addHandler(handleWindow);

function shutdown()
{
	WindowManager.getWindows(null).forEach(function(aWindow) {
		var doc = aWindow.document;
		if (doc.documentElement.getAttribute('windowtype') == TYPE_BROWSER) {
			aWindow.FoxSplitter.destroy(true);
			delete aWindow.FoxSplitter;
			delete aWindow.SplitBrowser;
		}
		else if (doc.documentElement.getAttribute('id') == TOOLBAR_CUSTOMIZE) {
			doc.removeChild(doc.__foxsplitter__style);
			delete doc.__foxsplitter__style;
		}
	});

	WindowManager = undefined;
	FoxSplitterBase.prototype.memberClass = undefined;
	FoxSplitterBase.prototype.groupClass = undefined;
	FoxSplitterWindow = undefined;
	FoxSplitterGroup = undefined;
	FoxSplitterConst = undefined;
}
