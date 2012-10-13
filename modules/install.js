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
 * Portions created by the Initial Developer are Copyright (C) 2012
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):: YUKI "Piro" Hiroshi <piro.outsider.reflex@gmail.com>
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

function uninstallOldVersion()
{
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
					.Value;
				appDisabled = appDisabled == 'true' || appDisabled == 'needs-disable';
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
					.Value;
				userDisabled = userDisabled == 'true' || userDisabled == 'needs-disable';
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
}

function migratePrefs()
{
	var prefs = require('lib/prefs').prefs;
	var FSC = require('const');
	switch (prefs.getPref(FSC.domain+'prefsVersion') || 0)
	{
		case 0:
			let (current = prefs.getPref(FSC.domain+'hiddenUIInInactiveWindow')) {
				if (current !== null) {
					prefs.setPref(FSC.domain+'hiddenUIInMemberWindow', current);
					prefs.clearPref(FSC.domain+'hiddenUIInInactiveWindow');
				}
			}
			break;

		default:
			return;
	}
	prefs.setPref(FSC.domain+'prefsVersion', FSC.PREFS_VERSION);
}

function initWmctrlPath()
{
	var prefs = require('lib/prefs').prefs;
	var FSC = require('const');
	if (prefs.getPref(FSC.domain+'methodToRaiseWindow') != FSC.RAISE_WINDOW_BY_WMCTRL ||
		!prefs.getPref(FSC.domain+'wmctrl.alertNotFound'))
		return;

	const WMCTRL_WEBSITE = 'http://tomas.styblo.name/wmctrl/';

	var Wmctrl = require('wmctrl').Wmctrl;
	return Wmctrl.initPath()
		.next(function(aPath) {
			// On the version 2.0.2012040201, the path can include "\n" accidentaly.
			// We have to remove it automatically.
			var updated = aPath.replace(/^\s+|\s+$/g, '');
			if (updated != aPath) {
				Wmctrl.path = updated;
				aPath = updated;
			}

			var wmctrl = Cc['@mozilla.org/file/local;1']
							.createInstance(Ci.nsILocalFile);
			wmctrl.initWithPath(aPath);
			if (!wmctrl.exists())
				throw new Error(Wmctrl.ERROR_WMCTRL_NOT_FOUND);
		})
		.error(function(aError) {
			if (!aError || aError.message != Wmctrl.ERROR_WMCTRL_NOT_FOUND)
				return;

			var commandLineHelper = require('lib/commandLineHelper').commandLineHelper;
			var commandFile = commandLineHelper.createTempFile('package-management-system-autodetection');
			commandLineHelper.run(resolve('bin/detect-package-management-system'), commandFile.path)
				.next(function() {
					var textIO = require('lib/textIO').textIO;
					var command = textIO.readFrom(commandFile, 'UTF-8');
					commandFile.remove(true);

					var bundle = require('lib/locale')
									.get(resolve('locale/label.properties'));
					var text = command ?
								bundle.getFormattedString('wmctrl.notFound.textWithCommand', [command]) :
								bundle.getString('wmctrl.notFound.text') ;

					var WM = require('lib/WindowManager').WindowManager;
					var windows = WM.getWindows('navigator:browser');
					if (windows.length && windows[0].gBrowser) {
						let b = windows[0].gBrowser;
						let confirmWithPopup = require('lib/confirmWithPopup').confirmWithPopup;
						let Deferred = require('lib/jsdeferred').Deferred;
						confirmWithPopup({
							browser : b,
							label   : text,
							value   : 'foxsplitter-wmctrl-not-found',
							image   : location.href + '/../../icon.png',
							anchor  : 'addons-notification-icon',
							buttons : [
								bundle.getString('wmctrl.notFound.wmctrl'),
								bundle.getString('wmctrl.notFound.close'),
								bundle.getString('wmctrl.notFound.neverShow')
							],
							persistence : 2
						})
						.next(function(aButtonIndex) {
							switch (aButtonIndex)
							{
								case 0:
									b.selectedTab = b.addTab(WMCTRL_WEBSITE);
									return;
								case 2:
									prefs.setPref(FSC.domain+'wmctrl.alertNotFound', false);
									return;
							}
						// })
						// .error(function(e) {
						// 	dump(e+'\n');
						});
					}
					else {
						let checked = { value : false };
						Cc['@mozilla.org/embedcomp/prompt-service;1']
							.getService(Ci.nsIPromptService)
							.alertCheck(
								null,
								bundle.getString('wmctrl.notFound.title'),
								text,
								bundle.getString('wmctrl.notFound.neverShow'),
								checked
							);
						if (checked.value)
							prefs.setPref(FSC.domain+'wmctrl.alertNotFound', false);
					}
				});
		});
}

function install()
{
	uninstallOldVersion();
	migratePrefs();
	initWmctrlPath();
}

