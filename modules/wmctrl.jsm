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

load('lib/jsdeferred');
load('lib/textIO');
load('lib/prefs');

var FoxSplitterConst = require('const');
var domain = FoxSplitterConst.domain;

var EXPORTED_SYMBOLS = ['Wmctrl'];

function Wmctrl(aWindow)
{
	this.window = aWindow;
}
Wmctrl.prototype = {
	ERROR_WMCTRL_NOT_FOUND : 'wmctlr is not installed',

	destroy : function()
	{
		delete this.window;
	},

	get path()
	{
		return prefs.getPref(domain+'wmctrl.path');
	},

	initPath : function wmctrl_initPath()
	{
		var deferred = new Deferred();

		var self = this;
		Deferred.next(function() {
			if (self.path) {
				deferred.call(self.path);
				return;
			}
			var pathFile = self.createTempFile('wmctrl-path');
			return self.run(resolve('bin/which-wmctrl'), pathFile.path)
					.next(function() {
						var path = textIO.readFrom(pathFile, 'UTF-8');
						pathFile.remove(true);
						if (!path) {
							deferred.fail(new Error(self.ERROR_WMCTRL_NOT_FOUND));
						}
						else {
							prefs.setPref(domain+'wmctrl.path', path);
							deferred.call(path);
						}
					})
					.error(function() {
						deferred.fail(new Error(self.ERROR_WMCTRL_NOT_FOUND));
					});
		});

		return deferred;
	},

	raise : function wmctrl_raise()
	{
		var self = this;
		if (!this.id)
			return this.initId()
					.next(function() {
						return self.raise();
					});

		return this.run(this.path, '-i', '-r', this.id, '-b', 'add,above')
				.next(function() {
					return self.run(self.path, '-i', '-r', self.id, '-b', 'remove,above');
				});
	},

	initId : function wmctrl_initId()
	{
		var self = this;
		return this.getWindowId(this.window)
				.next(function(aWindowId) {
					return self.id = aWindowId;
				});
	},

	getWindowId : function wmctrl_getWindowId(aWindow)
	{
		var self = this;
		if (!this.path)
			return this.initPath()
					.next(function() {
						return self.getWindowId(aWindow);
					});

		var originalTitle = aWindow.document.title;
		var temporaryTitle = 'wmctrl-target-window-'+Date.now()+'-'+parseInt(Math.random() * 65000);
		var listFile = this.createTempFile('wmctrl-window-list');

		aWindow.document.title = temporaryTitle;

		return this.run(resolve('bin/wmctrl-list'), this.path, listFile.path)
				.error(function() {
					// we must restore the original title anyway!
					if (aWindow.document.title == temporaryTitle)
						aWindow.document.title = originalTitle;
				})
				.next(function() {
					aWindow.document.title = originalTitle;

					var list = textIO.readFrom(listFile, 'UTF-8');
					listFile.remove(true);

					var match = list.match(new RegExp('^([^\\s]+)\\s.*'+temporaryTitle+'$', 'm'));
					if (match)
						return match[1];

					return null;
				});
	},

	run : function wmctrl_run(aExecutable)
	{
		var deferred = new Deferred();

		var args = Array.slice(arguments, 1);

		const IOService = Cc['@mozilla.org/network/io-service;1']
							.getService(Ci.nsIIOService);
		const FileHandler = IOService.getProtocolHandler('file')
							.QueryInterface(Ci.nsIFileProtocolHandler);
		var executable;
		try {
			executable = FileHandler.getFileFromURLSpec(aExecutable);
		}
		catch(e) {
			Deferred.next(function() {
				deferred.fail(new Error(e+'\ninvalid executable: ' + aExecutable));
			});
			return deferred;
		}

		if (!executable.exists()) {
			Deferred.next(function() {
				deferred.fail(new Error('missing executable: ' + aExecutable));
			});
			return deferred;
		}

		var process = Cc['@mozilla.org/process/util;1']
						.createInstance(Ci.nsIProcess);
		process.init(executable);
		process.runwAsync(args, args.length, {
			observe : function run_observe(aSubject, aTopic, aData)
			{
				if (aTopic == 'process-finished')
					deferred.call();
				else
					deferred.fail(new Error(aExecutable + ' failed'));
			}
		});

		return deferred;
	},

	createTempFile : function wmctrl_createTempFile(aLeafName)
	{
		var file = Cc['@mozilla.org/file/directory_service;1']
					.getService(Ci.nsIProperties)
					.get('TmpD', Ci.nsILocalFile);
		file.append(aLeafName);
		file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0600);
		return file;
	}
};
