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

load('jsdeferred');

var EXPORTED_SYMBOLS = ['commandLineHelper'];

var commandLineHelper = {
	run : function commandLineHelper_run(aExecutable)
	{
		var args = Array.slice(arguments, 1);

		var executable;
		try {
			if (aExecutable.indexOf('file:') == 0) {
				const IOService = Cc['@mozilla.org/network/io-service;1']
									.getService(Ci.nsIIOService);
				const FileHandler = IOService.getProtocolHandler('file')
									.QueryInterface(Ci.nsIFileProtocolHandler);
				executable = FileHandler.getFileFromURLSpec(aExecutable);
			}
			else {
				executable = Cc['@mozilla.org/file/local;1']
								.createInstance(Ci.nsILocalFile);
				executable.initWithPath(aExecutable);
			}
		}
		catch(e) {
			return Deferred.next(function() {
				throw new Error(e+'\ninvalid executable: ' + aExecutable);
			});
		}

		if (!executable.exists()) {
			return Deferred.next(function() {
				throw new Error('missing executable: ' + aExecutable);
			});
		}

		var process = Cc['@mozilla.org/process/util;1']
						.createInstance(Ci.nsIProcess);
		if (!process.runwAsync) {
			return Deferred.next(function() {
				throw new Error('missing feature: nsIProcess::runwAsync');
			});
		}

		var deferred = new Deferred();
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

	createTempFile : function commandLineHelper_createTempFile(aLeafName)
	{
		var file = Cc['@mozilla.org/file/directory_service;1']
					.getService(Ci.nsIProperties)
					.get('TmpD', Ci.nsILocalFile);
		file.append(aLeafName);
		file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0600);
		return file;
	}
};
