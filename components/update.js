/* ***** BEGIN LICENSE BLOCK ***** 
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Fox Splitter.
 *
 * The Initial Developer of the Original Code is SHIMODA Hiroshi.
 * Portions created by the Initial Developer are Copyright (C) 2004-2012
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): SHIMODA Hiroshi <piro.outsider.reflex@gmail.com>
 *                 Some codes are imported from
 *                   http://mxr.mozilla.org/mozilla1.9.2/source/toolkit/mozapps/extensions/src/nsExtensionManager.js.in
 *                   Ben Goodger <ben@mozilla.org> (Google Inc.) (nsExtensionManager.js.in)
 *                   Benjamin Smedberg <benjamin@smedbergs.us> (nsExtensionManager.js.in)
 *                   Jens Bannmann <jens.b@web.de> (nsExtensionManager.js.in)
 *                   Robert Strong <robert.bugzilla@gmail.com> (nsExtensionManager.js.in)
 *                   Dave Townsend <dtownsend@oxymoronical.com> (nsExtensionManager.js.in)
 *                   Daniel Veditz <dveditz@mozilla.com> (nsExtensionManager.js.in)
 *                   Alexander J. Vincent <ajvincent@gmail.com> (nsExtensionManager.js.in)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ******/

const OLD_ID = '{29c4afe1-db19-4298-8785-fcc94d1d6c1d}';
const NEW_ID = 'foxsplitter@piro.sakura.ne.jp';

const DEBUG = false;

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

const EM = 'http://www.mozilla.org/2004/em-rdf#';

var timers = [];

function setTimeout(aCallback, aTimeout)
{
	let timer = Cc['@mozilla.org/timer;1']
					.createInstance(Ci.nsITimer);
	timer.initWithCallback(aCallback, aTimeout, timer.TYPE_ONE_SHOT);
	timers.push(timer);
	return timer;
}

function clearTimeout(aTimer)
{
	timers.splice(timers.indexOf(aTimer), 1);
	timer.cancel();
}

function FoxSplitterUpdateService() { 
}
FoxSplitterUpdateService.prototype = {
	classDescription : 'FoxSplitterUpdateService', 
	contractID : '@piro.sakura.ne.jp/splitbrowser/update;1',
	classID : Components.ID('{5f905db0-7d83-11e1-b0c4-0800200c9a66}'),
	_xpcom_categories : [
		{ category : 'app-startup', service : true }
	],
	QueryInterface : XPCOMUtils.generateQI([Ci.nsIObserver]),

	get ObserverService()
	{
		return this._ObserverService ||
			(this._ObserverService = Cc['@mozilla.org/observer-service;1']
									.getService(Ci.nsIObserverService));
	},
	get ExtensionManager()
	{
		if (this._ExtensionManager === undefined) {
			try {
				this._ExtensionManagerr = Cc['@mozilla.org/extensions/manager;1']
											.getService(Ci.nsIExtensionManager);
			}
			catch(e) {
				this._ExtensionManager = null;
			}
		}
		return this._ExtensionManager;
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

	get interval()
	{
		return parseInt(this.Prefs.getCharPref('splitbrowser.update.interval'));
	},
	get enabled()
	{
		return this.Prefs.getBoolPref('splitbrowser.update.enabled');
	},
	get checkUpdateSecurity()
	{
		try {
			return this.Prefs.getBoolPref('extensions.checkUpdateSecurity');
		}
		catch(e) {
		}
		return true;
	},
	get updateURI()
	{
		if (this._updateURI)
			return this._updateURI;

		var res = this.RDF.GetResource('urn:mozilla:item:'+OLD_ID);
		var uri;
		try {
			uri = decodeURIComponent(escape(this.Prefs.getCharPref('extensions.'+OLD_ID+'.update.url')));
		}
		catch(e) {
		}

		if (!uri && this.getValue(this.ExtensionManager.datasource, res, 'updateURL'))
			return null;

		if (!uri)
			uri = decodeURIComponent(escape(this.Prefs.getCharPref('extensions.update.url')));

		const XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
							.getService(Ci.nsIXULAppInfo)
							.QueryInterface(Ci.nsIXULRuntime);
		const CategoryManager = Cc['@mozilla.org/categorymanager;1']
								.getService(Ci.nsICategoryManager);
		var locale;
		try {
			if (this.Prefs.getBoolPref('intl.locale.matchOS'))
				locale = Cc['@mozilla.org/intl/nslocaleservice;1']
							.getService(Ci.nsILocaleService)
							.getLocaleComponentForUserAgent();
		}
		catch(e) {
		}
		locale = locale || this.Prefs.getCharPref('general.useragent.locale');

		return this._updateURI = uri
				.replace(/%ITEM_ID%/g, NEW_ID)
				.replace(/%ITEM_VERSION%/g, this.Prefs.getCharPref('splitbrowser.update.lastFetchedVersion'))
				.replace(/%ITEM_MAXAPPVERSION%/g, XULAppInfo.version)
				.replace(/%ITEM_STATUS%/g, 'userEnabled')
				.replace(/%APP_ID%/g, XULAppInfo.ID)
				.replace(/%APP_VERSION%/g, XULAppInfo.version)
				.replace(/%REQ_VERSION%/g, 2)
				.replace(/%APP_OS%/g, XULAppInfo.OS)
				.replace(/%APP_ABI%/g, XULAppInfo.XPCOMABI)
				.replace(/%APP_LOCALE%/g, locale)
				.replace(/%CURRENT_APP_VERSION%/g, XULAppInfo.version)
				.replace(/%UPDATE_TYPE%/g, 32 | 64)
				.replace(/%(\w{3,})%/g, function(aMatched, aParameter) {
					try {
						return Cc[CategoryManager.getCategoryEntry('extension-update-params', aParameter)]
								.getService(Ci.nsIPropertyBag2)
								.getPropertyAsAString(aParameter);
					}
					catch(e) {
						return aMatched;
					}
				})
				.replace(/\+/g, '%2B')
				.replace(OLD_ID, NEW_ID);
	},

	get bundle()
	{
		return this._bundle ||
			(this._bundle = Cc['@mozilla.org/intl/stringbundle;1']
								.getService(Ci.nsIStringBundleService)
								.createBundle('chrome://splitbrowser/locale/splitbrowser.properties'));
	},
	get browserWindow()
	{
		return Cc['@mozilla.org/appshell/window-mediator;1']
					.getService(Ci.nsIWindowMediator)
					.getMostRecentWindow('navigator:browser');
	},

	observe : function(aSubject, aTopic, aData) 
	{
		switch (aTopic)
		{
			case 'app-startup':
			case 'profile-after-change':
				this.ObserverService.addObserver(this, 'final-ui-startup', false);
				return;

			case 'final-ui-startup':
				this.ObserverService.removeObserver(this, 'final-ui-startup');
				let (self = this) {
					setTimeout(function() {
						self.onStartup();
					}, 500);
				}
				return;
		}
	},

	handleEvent : function(aEvent)
	{
		switch (aEvent.type)
		{
			case 'error':
			case 'load':
				return this.onFetched(aEvent);
		}
	},

	onStartup : function()
	{
		if (!this.enabled)
			return;

		var version = this.getValue(this.ExtensionManager.datasource, this.RDF.GetResource('urn:mozilla:item:'+NEW_ID), 'version');
		if (version)
			return;

		// Ignore custom update.rdf.
		// We have to take care of cases only installed from AMO website.
		if (this.getValue(this.ExtensionManager.datasource, this.RDF.GetResource('urn:mozilla:item:'+OLD_ID), 'updateURL'))
			return;

		var last = parseInt(this.Prefs.getCharPref('splitbrowser.update.lastFetchedTime'));
		var interval = this.interval - (Date.now() - last);
		if (interval <= 0) {
			this.fetch();
		}
		else {
			let self = this;
			setTimeout(function() {
				self.fetch();
			}, interval);
		}
	},

	fetch : function()
	{
		if (!this.enabled)
			return;

		var uri = this.updateURI;
		if (DEBUG) dump('Fox Splitter: fetching '+uri+'\n');
		if (!uri)
			return;

		var request = Cc['@mozilla.org/xmlextras/xmlhttprequest;1']
						.createInstance(Ci.nsIXMLHttpRequest)
						.QueryInterface(Ci.nsIDOMEventTarget);
		request.open('GET', uri, true);
		request.overrideMimeType('text/xml');
		request.channel.loadFlags |= Ci.nsIRequest.LOAD_BYPASS_CACHE;
		request.addEventListener('error', this, false);
		request.addEventListener('load', this, false);
		request.send(null);
	},
	onFetched : function(aEvent)
	{
		aEvent.target.removeEventListener('error', this, false);
		aEvent.target.removeEventListener('load', this, false);

		if (aEvent.type == 'error')
			return this.reserveRetryFetch();

		var item = this.getUpdateItem(aEvent.target);
		if (DEBUG) dump('Fox Splitter: update item = '+uneval(item)+'\n');
		if (!item)
			return this.reserveRetryFetch();

		this.updateLastFetchedTime();

		var lastVersion = this.Prefs.getCharPref('splitbrowser.update.lastFetchedVersion');
		if (item.version != lastVersion) {
			switch (this.askUpdate(item.version))
			{
				case 0:
					this.Prefs.setCharPref('splitbrowser.update.lastFetchedVersion', item.version);
					this.install(item);
					return;
				case 1:
					break;
				case 2:
					this.Prefs.setCharPref('splitbrowser.update.lastFetchedVersion', item.version);
					break;
			}
		}

		this.reserveRetryFetch();
	},
	getUpdateItem : function(aRequest)
	{
		var parser = Cc['@mozilla.org/rdf/xml-parser;1']
						.createInstance(Ci.nsIRDFXMLParser);
		var datasource = Cc['@mozilla.org/rdf/datasource;1?name=in-memory-datasource']
							.createInstance(Ci.nsIRDFDataSource);
		parser.parseString(datasource, aRequest.channel.URI, aRequest.responseText);
		if (DEBUG) dump('Fox Splitter: response = '+aRequest.responseText+'\n');

		var res = this.RDF.GetResource('urn:mozilla:extension:'+NEW_ID);

		const XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
							.getService(Ci.nsIXULAppInfo)
							.QueryInterface(Ci.nsIXULRuntime);
		const Comparator = Cc['@mozilla.org/xpcom/version-comparator;1']
							.getService(Ci.nsIVersionComparator);

		try {
			var updates = datasource.GetTarget(res, this.RDF.GetResource(EM+'updates'), true)
							.QueryInterface(Ci.nsIRDFResource);
			var container = Cc['@mozilla.org/rdf/container;1']
							.createInstance(Ci.nsIRDFContainer);
			container.Init(datasource, updates);

			var versions = container.GetElements();
			var foundItem;
			while (versions.hasMoreElements())
			{
				let versionItem = versions.getNext().QueryInterface(Ci.nsIRDFResource);
				let version = this.getValue(datasource, versionItem, 'version');

				if (Comparator.compare(version, foundItem ? foundItem.version : '0' ) <= 0)
					continue;

				let targetApps = datasource.GetTargets(versionItem, this.RDF.GetResource(EM+'targetApplication'), true);
				while (targetApps.hasMoreElements())
				{
					let targetApp = targetApps.getNext().QueryInterface(Ci.nsIRDFResource);
					let appID = this.getValue(datasource, targetApp, 'id');
					if (appID != XULAppInfo.ID)
						continue;

					let minVersion = this.getValue(datasource, targetApp, 'minVersion') || 0;
					if (Comparator.compare(XULAppInfo.version, minVersion) < 0)
						continue;

					let maxVersion = this.getValue(datasource, targetApp, 'maxVersion') || 0;
					if (Comparator.compare(XULAppInfo.version, maxVersion) > 0)
						continue;

					let updateLink = this.getValue(datasource, targetApp, 'updateLink');
					if (!updateLink)
						continue;

					let updateHash = this.getValue(datasource, targetApp, 'updateHash');
					if (
						this.checkUpdateSecurity &&
						!/^https:/.test(updateLink) &&
						(!updateHash || !/^sha/.test(updateHash))
						)
						continue;

					let installedRes = this.RDF.GetResource('urn:mozilla:item:'+OLD_ID);
					foundItem = {
						id                 : NEW_ID,
						version            : version,
						minAppVersion      : minVersion,
						maxAppVersion      : maxVersion,
						installLocationKey : 'app-profile',
						name               : this.getValue(this.ExtensionManager.datasource, installedRes, 'name'),
						xpiURL             : updateLink,
						xpiHash            : updateHash,
						iconURL            : this.getValue(this.ExtensionManager.datasource, installedRes, 'iconURL'),
						updateRDF          : aRequest.channel.URI.spec,
						updateKey          : this.getValue(this.ExtensionManager.datasource, installedRes, 'updateKey'),
						type               : Ci.nsIUpdateItem.TYPE_EXTENSION,
						targetAppID        : appID
					};
					foundItem.objectSource = foundItem.toSource();
					foundItem.init = function() {};
				}
			}
		}
		catch(e) {
			dump('Fox Splitter: '+e+'\n');
		}

		return foundItem;
	},
	getValue : function(aDatasource, aResource, aTargetName)
	{
		try {
			return aDatasource.GetTarget(aResource, this.RDF.GetResource(EM+aTargetName), true)
					.QueryInterface(Ci.nsIRDFLiteral).Value;
		}
		catch(e) {
		}
		return null;
	},

	updateLastFetchedTime : function()
	{
		this.Prefs.setCharPref('splitbrowser.update.lastFetchedTime', Date.now().toString());
	},

	reserveRetryFetch : function()
	{
		this.updateLastFetchedTime();
		let self = this;
		setTimeout(function() {
			self.fetch();
		}, this.interval);
	},

	askUpdate : function(aVersion)
	{
		var checked = { value : false };
		var result = Cc['@mozilla.org/embedcomp/prompt-service;1']
						.getService(Ci.nsIPromptService)
						.confirmEx(
							this.browserWindow,
							this.bundle.GetStringFromName('update.title'),
							this.bundle.formatStringFromName('update.text', [aVersion], 1),
							Ci.nsIPromptService.BUTTON_TITLE_IS_STRING * Ci.nsIPromptService.BUTTON_POS_0 +
							Ci.nsIPromptService.BUTTON_TITLE_IS_STRING * Ci.nsIPromptService.BUTTON_POS_1 +
							Ci.nsIPromptService.BUTTON_TITLE_IS_STRING * Ci.nsIPromptService.BUTTON_POS_2,
							this.bundle.GetStringFromName('update.now'),
							this.bundle.GetStringFromName('update.later'),
							this.bundle.GetStringFromName('update.ignore'),
							this.bundle.GetStringFromName('update.never'),
							checked
						);
		if (result != 1 && checked.value)
			this.Prefs.setPref('splitbrowser.update.enabled', false);
		return result;
	},

	install : function(aUpdateItem)
	{
		this.ExtensionManager.addDownloads([aUpdateItem], 1, null);
		this.ExtensionManager.uninstallItem(OLD_ID);
		var self = this;
		setTimeout(function() {
			var window = self.browserWindow;
			if (window)
				window.BrowserOpenAddonsMgr('installs');
		}, 500);
	}
};

if (XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([FoxSplitterUpdateService]);
else
	var NSGetModule = XPCOMUtils.generateNSGetModule([FoxSplitterUpdateService]);
