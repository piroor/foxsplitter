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

function install()
{
	var prefs = require('lib/prefs').prefs;
	var FSC = require('const');
	if (prefs.getPref(FSC.domain+'methodToRaiseWindow') != FSC.RAISE_WINDOW_BY_WMCTRL ||
		!prefs.getPref(FSC.domain+'wmctrl.alertNotFound'))
		return;

	const WMCTRL_WEBSITE = 'http://tomas.styblo.name/wmctrl/';

	var Wmctrl = require('wmctrl').Wmctrl;
	Wmctrl.initPath()
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
