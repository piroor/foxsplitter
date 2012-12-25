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
 * The Initial Developer of the Original Code is YUKI "Piro" Hiroshi.
 * Portions created by the Initial Developer are Copyright (C) 2007-2012
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

var hiddenUIInMemberWindow;
var updatehiddenUIInMemberWindowGroupbox;
function inithiddenUIInMemberWindowChecks() {
	hiddenUIInMemberWindow = document.getElementById('hiddenUIInMemberWindow');
	updatehiddenUIInMemberWindowGroupbox = document.getElementById('updatehiddenUIInMemberWindow-groupbox');
	var prefValue = parseInt(hiddenUIInMemberWindow.value);
	Array.forEach(updatehiddenUIInMemberWindowGroupbox.querySelectorAll('checkbox[value]'), function(aCheckbox) {
		var value = parseInt(aCheckbox.getAttribute('value'));
		aCheckbox.checked = !(prefValue & value);
	});
}
function onChangehiddenUIInMemberWindow() {
	var pref = hiddenUIInMemberWindow;
	var prefValue = parseInt(pref.value);
	Array.forEach(updatehiddenUIInMemberWindowGroupbox.querySelectorAll('checkbox[value]'), function(aCheckbox) {
		var value = parseInt(aCheckbox.getAttribute('value'));
		if (prefValue & value) prefValue ^= value;
		if (!aCheckbox.checked)
			prefValue |= value;
	});
	pref.value = prefValue;
}
function updateShortcut(aEvent) {
	var field = aEvent.target;
	var shortcut = KeyboardShortcut.toKeyboardShortcut(aEvent);
	if (shortcut) {
		field.value = shortcut;
		document.getElementById(field.getAttribute('preference')).value = shortcut;
		aEvent.stopPropagation()
		aEvent.preventDefault();
	}
}
function clearPref(aField) {
	document.getElementById(aField.getAttribute('preference')).value = '';
	aField.value = '';
}
function resetPref(aField) {
	var pref = document.getElementById(aField.getAttribute('preference'));
	pref.value = pref.defaultValue;
	aField.value = pref.defaultValue;
}

var Cc = Components.classes;
var Ci = Components.interfaces;
Cc['@mozilla.org/moz/jssubscript-loader;1']
	.getService(Ci.mozIJSSubScriptLoader)
	.loadSubScript('resource://foxsplitter-resources/modules/lib/KeyboardShortcut.js', window);
