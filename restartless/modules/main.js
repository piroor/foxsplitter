load('lib/jsdeferred');
load('lib/WindowManager');
load('window');

const TYPE_BROWSER = 'navigator:browser';

function handleWindow(aWindow)
{
	var doc = aWindow.document;
	if (doc.documentElement.getAttribute('windowtype') != TYPE_BROWSER)
		return;

	aWindow.FoxSplitter = new FoxSplitterWindow(aWindow);
	aWindow.SplitBrowser = aWindow.FoxSplitter;
}

WindowManager.getWindows(TYPE_BROWSER).forEach(handleWindow);
WindowManager.addHandler(handleWindow);

function shutdown()
{
	WindowManager.getWindows(TYPE_BROWSER).forEach(function(aWindow) {
		aWindow.FoxSplitter.destroy();
		delete aWindow.FoxSplitter;
		delete aWindow.SplitBrowser;
	});

	Deferred = void(0);
	WindowManager = void(0);
	FoxSplitterWindow = void(0);
}
