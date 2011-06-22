load('lib/WindowManager');

load('defaults');
load('config');

load('window');
load('group');


// disable old Fox Splitter
const OLD_ID = '{29c4afe1-db19-4298-8785-fcc94d1d6c1d}';

function onDisabled()
{
	Cc['@mozilla.org/toolkit/app-startup;1']
		.getService(Ci.nsIAppStartup)
		.quit(Ci.nsIAppStartup.eForceQuit | Ci.nsIAppStartup.eRestart);
}

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
			onDisabled();
		}
	}
}
else {
	Cu.import('resource://gre/modules/AddonManager.jsm');
	AddonManager.getAddonByID(OLD_ID, function(aAddon) {
		if (aAddon && !aAddon.userDisabled) {
			aAddon.userDisabled = true;
			onDisabled();
		}
	})
}



const TYPE_BROWSER = 'navigator:browser';

function handleWindow(aWindow, aInitialization)
{
	var doc = aWindow.document;
	if (doc.documentElement.getAttribute('windowtype') != TYPE_BROWSER)
		return;

	aWindow.FoxSplitter = new FoxSplitterWindow(aWindow, aInitialization);
	// aWindow.SplitBrowser = aWindow.FoxSplitter;
}

WindowManager.getWindows(TYPE_BROWSER).forEach(function(aWindow) {
	handleWindow(aWindow, true);
});
WindowManager.addHandler(handleWindow);

function shutdown()
{
	WindowManager.getWindows(TYPE_BROWSER).forEach(function(aWindow) {
		aWindow.FoxSplitter.destroy(true);
		delete aWindow.FoxSplitter;
		// delete aWindow.SplitBrowser;
	});

	WindowManager = undefined;
	FoxSplitterWindow = undefined;
	FoxSplitterGroup = undefined;
}
