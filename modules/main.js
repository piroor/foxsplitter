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
 * The Original Code is Fox Splitter.
 *
 * The Initial Developer of the Original Code is Fox Splitter.
 * Portions created by the Initial Developer are Copyright (C) 2007-2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):: SHIMODA Hiroshi <piro.outsider.reflex@gmail.com>
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
 * ***** END LICENSE BLOCK ***** */

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
	var browserWindows = [];
	WindowManager.getWindows(null).forEach(function(aWindow) {
		var doc = aWindow.document;
		if (doc.documentElement.getAttribute('windowtype') == TYPE_BROWSER) {
			aWindow.FoxSplitter.saveState();
			aWindow.FoxSplitter.shouldSaveState = false; // prevent to be cleared the last state!
			browserWindows.push(aWindow);
		}
		else if (doc.documentElement.getAttribute('id') == TOOLBAR_CUSTOMIZE) {
			doc.removeChild(doc.__foxsplitter__style);
			delete doc.__foxsplitter__style;
		}
	});
	browserWindows.forEach(function(aWindow) {
		aWindow.FoxSplitter.destroy(true);
		delete aWindow.FoxSplitter;
		delete aWindow.SplitBrowser;
	});

	WindowManager = undefined;
	FoxSplitterBase.prototype.memberClass = undefined;
	FoxSplitterBase.prototype.groupClass = undefined;
	FoxSplitterWindow = undefined;
	FoxSplitterGroup = undefined;
	FoxSplitterConst = undefined;
}
