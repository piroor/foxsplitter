/**
 * @fileOverview Startup service for restartless addons, for Gecko 1.9.x
 * @author       YUKI "Piro" Hiroshi
 * @version      3
 *
 * @license
 *   The MIT License, Copyright (c) 2010-2012 YUKI "Piro" Hiroshi.
 *   https://github.com/piroor/restartless/blob/master/license.txt
 * @url http://github.com/piroor/restartless
 */

/** You must change ADDON_ID for your addon. */
const ADDON_ID = 'foxsplitter@piro.sakura.ne.jp';
/** You must change CLASS_ID for your addon. If must be an UUID. */
const CLASS_ID = '{8a77f430-9052-11e0-91e4-0800200c9a66}';

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

/**
 * This component provides ability to load/unload main code of restartless
 * addons, on Gecko 1.9.x (Firefox 3.6 and older). By this component,
 * restartless addons can work as regular addon.
 *
 * Note, this component is completely ignored on Gecko 2.0 and later.
 */
function StartupService() { 
}
StartupService.prototype = {
	classDescription : ADDON_ID+' Startup Service', 
	contractID : '@'+ADDON_ID.split('@').reverse().join('/')+'/startup;1',
	classID : Components.ID(CLASS_ID),
	_xpcom_categories : [
		{ category : 'app-startup', service : true }
	],
	QueryInterface : XPCOMUtils.generateQI([Ci.nsIObserver]),
	get root()
	{
		if (!this._root) {
			let addon = this.ExtensionManager.getInstallLocation(ADDON_ID);
			if (addon)
				this._root = addon.getItemFile(ADDON_ID, '').clone();
		}
		return this._root;
	},
	get ObserverService()
	{
		return this._ObserverService ||
			(this._ObserverService = Cc['@mozilla.org/observer-service;1']
									.getService(Ci.nsIObserverService));
	},
	get IOService()
	{
		return this._IOService ||
			(this._IOService = Cc['@mozilla.org/network/io-service;1']
									.getService(Ci.nsIIOService));
	},
	get JSLoader()
	{
		return this._JSLoader ||
			(this._JSLoader = Cc['@mozilla.org/moz/jssubscript-loader;1']
									.getService(Ci.mozIJSSubScriptLoader));
	},
	get Loader()
	{
		if (!this._Loader) {
			this._Loader = {};
			let loader = this.root.clone();
			loader.append('components');
			loader.append('loader.js');
			this.JSLoader.loadSubScript(this.IOService.newFileURI(loader).spec, this._Loader);
		}
		return this._Loader;
	},
	get ExtensionManager()
	{
		return this._ExtensionManager ||
			(this._ExtensionManager = Cc['@mozilla.org/extensions/manager;1']
									.getService(Ci.nsIExtensionManager));
	},
	get RDF()
	{
		return this._RDF ||
			(this._RDF = Cc['@mozilla.org/rdf/rdf-service;1']
									.getService(Ci.nsIRDFService));
	},
	get Prefs()
	{
		return this._Prefs ||
			(this._Prefs = Cc['@mozilla.org/preferences;1']
							.getService(Ci.nsIPrefBranch));
	},
	get version()
	{
		try {
			return this.ExtensionManager.datasource.GetTarget(
					this.RDF.GetResource('urn:mozilla:item:'+ADDON_ID),
					this.RDF.GetResource('http://www.mozilla.org/2004/em-rdf#version'),
					true
					)
					.QueryInterface(Ci.nsIRDFLiteral)
					.Value;
		}
		catch(e) {
		}
		return null;
	},
	observe : function(aSubject, aTopic, aData) 
	{
		switch (aTopic)
		{
			case 'app-startup':
				this.ObserverService.addObserver(this, 'profile-after-change', false);
				return;

			case 'profile-after-change':
				this.ObserverService.removeObserver(this, 'profile-after-change');
				this.ObserverService.addObserver(this, 'quit-application-granted', false);
				this.onStartup();
				return;

			case 'final-ui-startup':
				this.ObserverService.removeObserver(this, 'quit-application-granted');
				this.onShutdown();
				return;
		}
	},
	onStartup : function()
	{
		this.Loader.registerResource(ADDON_ID.split('@')[0]+'-resources', this.IOService.newFileURI(this.root));

		var lastVersion;
		try {
			lastVersion = this.Prefs.getCharPref('extensions.'+ADDON_ID+'.restartless.lastVersion');
		}
		catch(e) {
		}

		var version = this.version + ':' + this.root.lastModifiedTime;
		if (lastVersion != version) {
			this.Prefs.setCharPref('extensions.'+ADDON_ID+'.restartless.lastVersion', version);
			let install = this.root.clone();
			install.append('modules');
			install.append('install.js');
			if (install.exists()) {
				this.Loader.load(this.IOService.newFileURI(install).spec);
				this.Loader.install(lastVersion ? 'ADDON_UPGRADE' : 'ADDON_INSTALL' );
			}
		}

		let main = this.root.clone();
		main.append('modules');
		main.append('main.js');
		this.Loader.load(this.IOService.newFileURI(main).spec);
	},
	onShutdown : function()
	{
		this.Loader.shutdown('APP_SHUTDOWN');
	}
};
var NSGetModule = XPCOMUtils.generateNSGetModule([StartupService]);
