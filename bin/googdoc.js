#!/usr/local/bin/node

/**
 * @fileoverview Copyright 2011 Guido Tapia (guido@tapia.com.au).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * @private
 * @type {node.goog}
 * @const
 */
var ng_ = require('goog').goog.init();

goog.provide('node.goog.googdoc');

goog.require('goog.array');
goog.require('node.goog');
goog.require('node_goog_opts');



/**
 * @constructor
 */
node.goog.googdoc = function() {
  var args = ng_.args;
  if (!args.jsdocToolkitDir) {
    throw new Error('To run the jsdoc-toolkit documentation module please ' +
        'specify a jsdocToolkitDir property pointing to the jsdoc-toolkit ' +
        'root directory.  This setting can reside in the global closure.json ' +
        'settings file or the closure.json file in the code root dir');
  }

  /**
   * @private
   * @const
   * @type {{init:function(Array.<string>)}}
   */
  this.jsdoc_toolkit_ =
      require('../third_party/node-jsdoc-toolkit/app/noderun').jsdoctoolkit;

  /**
   * @private
   * @type {Array.<string>}
   */
  this.clArgs;

  this.init_(args);
};


/**
 * @private
 * @param {node_goog_opts} args The settings object.
 */
node.goog.googdoc.prototype.init_ = function(args) {
  // _dirToDoc is for testing so tests can set this global before calling
  // goog.require('node.goog.googdoc')
  this.createJSDocArgs_(args, global['_dirToDoc'] || process.argv[2]);

  // Run node-jsdoc-toolkit
  this.runJSDocToolkit_();
};


/**
 * @private
 * @param {node_goog_opts} args The settings object.
 * @param {string} entryPoint The file/directory to document.
 */
node.goog.googdoc.prototype.createJSDocArgs_ = function(args, entryPoint) {
  var entryPointDirIdx = entryPoint.lastIndexOf('/');
  var title = entryPointDirIdx > 0 ?
      entryPoint.substring(entryPointDirIdx + 1) : entryPoint;
  var entryPointDir = entryPointDirIdx > 0 ?
      entryPoint.substring(0, entryPointDirIdx) : '.';
  var jsDocToolkitDir = args.jsdocToolkitDir;

  this.clArgs = [
    '-t=' +
        ng_.getPath(jsDocToolkitDir, 'templates/codeview'),
    '-d=' + ng_.getPath(entryPointDir, '/docs'),
    '-D="title:' +
        title + '"'
  ];
  if (args.additionalJSDocToolkitOptions) {
    this.clArgs = goog.array.concat(this.clArgs,
        args.additionalJSDocToolkitOptions);
  }
  this.clArgs.push(entryPoint);
};


/**
 * @private
 */
node.goog.googdoc.prototype.runJSDocToolkit_ = function() {
  this.jsdoc_toolkit_.init(this.clArgs);
};


/** @type {node.goog.googdoc} */
exports.googDoc = new node.goog.googdoc();
