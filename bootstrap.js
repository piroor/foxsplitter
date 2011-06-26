/**
 * @fileOverview Bootstrap code for restartless addons
 * @author       SHIMODA "Piro" Hiroshi
 * @version      1
 *
 * @description
 *   This provides ability to load a script file placed to "modules/main.js".
 *   Functions named "shutdown", defined in main.js and any loaded script
 *   will be called when the addon is disabled or uninstalled (include
 *   updating).
 *
 * @license
 *   The MIT License, Copyright (c) 2010-2011 SHIMODA "Piro" Hiroshi.
 *   https://github.com/piroor/restartless/blob/master/license.txt
 * @url http://github.com/piroor/restartless
 */

var _gLoader;

function _loadMain(aId, aRoot, aReason)
{
	if (_gLoader)
		return;

	const IOService = Components.classes['@mozilla.org/network/io-service;1']
						.getService(Components.interfaces.nsIIOService);

	var resource, loader, main;
	if (aRoot.isDirectory()) {
		resource = IOService.newFileURI(aRoot);

		loader = aRoot.clone();
		loader.append('components');
		loader.append('loader.js');
		loader = IOService.newFileURI(loader).spec;

		main = aRoot.clone();
		main.append('modules');
		main.append('main.js');
		main = IOService.newFileURI(main).spec;
	}
	else {
		let base = 'jar:'+IOService.newFileURI(aRoot).spec+'!/';
		loader = base + 'components/loader.js';
		main = base + 'modules/main.js';
		resource = IOService.newURI(base, null, null);
	}

	_gLoader = {};
	Components.classes['@mozilla.org/moz/jssubscript-loader;1']
		.getService(Components.interfaces.mozIJSSubScriptLoader)
		.loadSubScript(loader, _gLoader);
	_gLoader.registerResource(aId.split('@')[0]+'-resources', resource);
	_gLoader.load(main);
}

function _reasonToString(aReason)
{
	switch (aReason)
	{
		case APP_STARTUP: return 'APP_STARTUP';
		case APP_SHUTDOWN: return 'APP_SHUTDOWN';
		case ADDON_ENABLE: return 'ADDON_ENABLE';
		case ADDON_DISABLE: return 'ADDON_DISABLE';
		case ADDON_INSTALL: return 'ADDON_INSTALL';
		case ADDON_UNINSTALL: return 'ADDON_UNINSTALL';
		case ADDON_UPGRADE: return 'ADDON_UPGRADE';
		case ADDON_DOWNGRADE: return 'ADDON_DOWNGRADE';
	}
	return aReason;
}

/**
 * handlers for bootstrap
 */

function install(aData, aReason)
{
	_loadMain(aData.id, aData.installPath, _reasonToString(aReason));
	_gLoader.install(_reasonToString(aReason));
}

function startup(aData, aReason)
{
	_loadMain(aData.id, aData.installPath, _reasonToString(aReason));
}

function shutdown(aData, aReason)
{
	if (!_gLoader) return;
	_gLoader.unregisterResource(aData.id.split('@')[0]+'-resources');
	_gLoader.shutdown(_reasonToString(aReason));
	_gLoader = void(0);
}

function uninstall(aData, aReason)
{
	if (!_gLoader) return;
	_gLoader.uninstall(_reasonToString(aReason));
	_gLoader = void(0);
}
