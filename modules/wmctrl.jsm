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

load('lib/jsdeferred');
load('lib/textIO');
load('lib/prefs');
load('lib/commandLineHelper');

var FoxSplitterConst = require('const');
var domain = FoxSplitterConst.domain;

var EXPORTED_SYMBOLS = ['Wmctrl'];

function Wmctrl(aWindow)
{
	this.window = aWindow;
}
Wmctrl.prototype = {
	destroy : function()
	{
		delete this.window;
	},

	get path()
	{
		return Wmctrl.path;
	},

	raise : function wmctrl_raise()
	{
		var self = this;
		if (!this.id)
			return this.initId()
					.next(function() {
						return self.raise();
					});

		return commandLineHelper.run(this.path, '-i', '-r', this.id, '-b', 'add,above')
				.next(function() {
					return commandLineHelper.run(self.path, '-i', '-r', self.id, '-b', 'remove,above');
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
			return Wmctrl.initPath()
					.next(function() {
						return self.getWindowId(aWindow);
					});

		var originalTitle = aWindow.document.title;
		var temporaryTitle = 'wmctrl-target-window-'+Date.now()+'-'+parseInt(Math.random() * 65000);
		var listFile = commandLineHelper.createTempFile('wmctrl-window-list');

		aWindow.document.title = temporaryTitle;

		return commandLineHelper.run(resolve('bin/wmctrl-list'), this.path, listFile.path)
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
	}
};

Wmctrl.ERROR_WMCTRL_NOT_FOUND = 'wmctlr is not installed';

Wmctrl.__defineSetter__('path', function(aValue) {
	return prefs.setPref(domain+'wmctrl.path', aValue);
});
Wmctrl.__defineGetter__('path', function() {
	return prefs.getPref(domain+'wmctrl.path');
});

Wmctrl.initPath = function wmctrl_initPath() {
	var deferred = new Deferred();

	var self = this;
	Deferred.next(function() {
		if (self.path) {
			deferred.call(self.path);
			return;
		}
		var pathFile = commandLineHelper.createTempFile('wmctrl-path');
		return commandLineHelper.run(resolve('bin/which-wmctrl'), pathFile.path)
				.next(function() {
					var path = textIO.readFrom(pathFile, 'UTF-8').replace(/^\s+|\s+$/g, '');
					pathFile.remove(true);
					if (!path) {
						deferred.fail(new Error(self.ERROR_WMCTRL_NOT_FOUND));
					}
					else {
						Wmctrl.path = path;
						deferred.call(path);
					}
				})
				.error(function() {
					deferred.fail(new Error(self.ERROR_WMCTRL_NOT_FOUND));
				});
	});

	return deferred;
};
