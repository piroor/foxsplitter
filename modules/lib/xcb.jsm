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

var EXPORTED_SYMBOLS = [];

Components.utils.import('resource://gre/modules/ctypes.jsm');

var gLibXUL = ctypes.open(ctypes.libraryName('libxul'));

const XAtom = ctypes.unsigned_long;
const XBool = ctypes.int;
const XWindow = ctypes.unsigned_long;
const XA_CARDINAL = new XAtom(6);
const XA_WINDOW = new XAtom(33);

var XOpenDisplay = gLibXUL.declare(
		'XOpenDisplay',
		ctypes.default_abi,
		ctypes.voidptr_t, // Display
		ctypes.jschar.ptr // dispay name
	);
var XDefaultRootWindow = gLibXUL.declare(
		'XDefaultRootWindow',
		ctypes.default_abi,
		XWindow.ptr,
		ctypes.voidptr_t // Display
	);
var XGetWindowProperty = gLibXUL.declare(
		'XGetWindowProperty',
		ctypes.default_abi,
		ctypes.int,
		ctypes.voidptr_t, // Display
		XWindow, // window
		XAtom, // property
		ctypes.long, // offset
		ctypes.long, // length
		XBool, // delete
		XAtom, // request type
		XAtom.ptr // actual type return
		ctypes.int.ptr // actual format return
		ctypes.unsigned_long.ptr, // number of items return
		ctypes.unsigned_long.ptr, // bytes after return
		ctypes.jschar.ptr.ptr // property return
	);

var display = XOpenDisplay(null);
var rootWindow = XDefaultRootWindow(display);

