load('lib/WindowManager');

load('defaults');
load('config');

load('window');
load('group');

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
