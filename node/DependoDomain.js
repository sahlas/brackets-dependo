/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */
/*global  */

(function () {
    
    "use strict";
    var domainManager = null;
    var Dependo = require('./node_modules/dependo/lib/dependo.js');

    /**
     * @private
     * Handler function for the dependo.cmdGetDependoReport command.
     * @return {{report: string}} The returned report is aa force-directed graph report
     * depicting the dependency graph for the given source.
     */

    function cmdGetDependoReport(targetPath, options) {
        var results,
            dependo = new Dependo(targetPath, {
            format: 'amd',
            exclude: '^node_modules'
          });
        results = dependo.generateHtml();
        domainManager.emitEvent("dependo", "update", results );
    }
    
    /**
     * Initializes the domain 
     * @param {DomainManager} The DomainManager for the server
     */
    function init(DomainManager) {
        domainManager = DomainManager;
        if (!domainManager.hasDomain("dependo")) {
            domainManager.registerDomain("dependo", {major: 0, minor: 1});
        }
        domainManager.registerCommand(
            "dependo",
            "cmdGetDependoReport", 
            cmdGetDependoReport, 
            false, 
            "generate report",
            [{name: "source", type: "string"}], 
            [{name: "report", 
                type: "{report: string}"}]
        );
        domainManager.registerEvent(
            "dependo",
            "update",
            ["data"]
        );
    }
    // used in unit tests
    exports.cmdGetDependoReport = cmdGetDependoReport;
    
    //used to load domain
    exports.init = init;
    
    }());
