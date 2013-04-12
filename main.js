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

/*global define, brackets, $, window, PathUtils */

define(function (require, exports, module) {
    "use strict";
    // load modules
    var CommandManager          = brackets.getModule("command/CommandManager"),
        EditorManager           = brackets.getModule("editor/EditorManager"),
        DocumentManager         = brackets.getModule("document/DocumentManager"),
        Menus                   = brackets.getModule("command/Menus"),
        NativeFileSystem        = brackets.getModule("file/NativeFileSystem").NativeFileSystem,
        FileUtils               = brackets.getModule("file/FileUtils"),
        Dialogs                 = brackets.getModule("widgets/Dialogs"),
        AppInit                 = brackets.getModule("utils/AppInit"),
        Resizer                 = brackets.getModule("utils/Resizer"),
        ProjectManager          = brackets.getModule("project/ProjectManager"),
        // node modules
        ExtensionUtils          = brackets.getModule("utils/ExtensionUtils"),
        NodeConnection          = brackets.getModule("utils/NodeConnection"),
       
        // local vars and config file
        moduleDir               = FileUtils.getNativeModuleDirectoryPath(module),
        dependoReportEntry      = new NativeFileSystem.FileEntry(moduleDir + '/generated/dependoReport.html'),
        configFile              = new NativeFileSystem.FileEntry(moduleDir + '/config.js'),
        config                  = { options: {}, globals: {} },
        report                  = "",
        _enabled                = false,
        commands                = [],
        projectMenu             = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU),
        DEPENDO_CMD             = "dependo_cmd",
        dirSelection            = "",
        nodeConnection          = new NodeConnection();

        
    AppInit.appReady(function () {
        nodeConnection = new NodeConnection();

        function connect() {
            var connectionPromise = nodeConnection.connect(true);
            connectionPromise.fail(function () {
                console.error("[brackets-dependo] failed to connect to node");
            });
            return connectionPromise;
        }
        
        function loadDependoDomain() {
            var path = ExtensionUtils.getModulePath(module, "node/DependoDomain");
            var loadPromise = nodeConnection.loadDomains([path], true);
            loadPromise.fail(function () {
                console.log("[brackets-dependo] failed to load DependoDomain");
            });
            return loadPromise;
        }
        
        $(nodeConnection).on("dependo.update", function (evt, result) {
            if (!result) {
                var dlg = Dialogs.showModalDialog(
                    Dialogs.DIALOG_ID_ERROR,
                    "Dependo Node Error",
                    result
                );
            } else {

                //newWindow.document.write(result);
                FileUtils.writeText(dependoReportEntry, result).done(function () {
                    // launch new window with generated report
                    var strWindowFeatures = "menubar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes";
                    var report = window.open(dependoReportEntry.fullPath, "Dependo!", strWindowFeatures);
                    report.focus();
                });
            }
        });
        // Call all the helper functions in order
        chain(connect, loadDependoDomain);
    });

    function getDependoReport() {
        nodeConnection.domains.dependo.cmdGetDependoReport(dirSelection, null)
            .fail(function (err) {
                console.error("[brackets-dependo] failed to run DependoDomain.cmdGetDependoReport", err.toString());
                var dlg = Dialogs.showModalDialog(
                    Dialogs.DIALOG_ID_ERROR,
                    "Dependo Error",
                    "This action triggered an error: " + err.toString()
                );
            });
    }

    // Helper function that chains a series of promise-returning functions together via their done callbacks.
    function chain() {
        var functions = Array.prototype.slice.call(arguments, 0);
        if (functions.length > 0) {
            var firstFunction = functions.shift();
            var firstPromise = firstFunction.call();
            firstPromise.done(function () {
                chain.apply(null, functions);
            });
        }
    }

    // on click check if it's a directory add context menuitem
    function _handleMenu(menu, entry) {
        var i;
        for (i = 0; i < commands.length; i++) {
            menu.removeMenuItem(commands[i]);
        }
        menu.addMenuItem(DEPENDO_CMD, "", Menus.LAST);
    }
    
    // Register commands as right click menu items
    commands = [DEPENDO_CMD];
    CommandManager.register("Dependo Report", DEPENDO_CMD, getDependoReport );
    
    FileUtils.readAsText(configFile)
        .done(function (text, readTimestamp) {
    
            //try to parse the config file
            try {
                config = JSON.parse(text);
            } catch (e) {
                console.log("Can't parse config file " + e);
                showError();
            }
        })
        .fail(function (error) {
            showError();
        });  
    
    // Determine type of test for selected item in project
    $(projectMenu).on("beforeContextMenuOpen", function (evt) {
        var selectedEntry = ProjectManager.getSelectedItem();
        if (!selectedEntry.isDirectory) {
           return;
        }
        dirSelection = selectedEntry.fullPath;
        _handleMenu(projectMenu, selectedEntry);
    });
    
    function showError(error) {
        Dialogs.showModalDialog(
            Dialogs.DIALOG_ID_ERROR,
            "Error",
            ": " + error
        );
    }
   
});