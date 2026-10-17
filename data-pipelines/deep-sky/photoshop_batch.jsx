/* Actual Photoshop DOM operations. Host validates all sources before dispatch.
 * Only documents opened here are closed; no user document or input is saved.
 * Configuration is a JSON literal supplied by the local COM host.
 */
(function () {
    function quote(value) {
        return '"' + String(value).replace(/[\\"\u0000-\u001f]/g, function (ch) {
            if (ch === '\\') return '\\\\';
            if (ch === '"') return '\\"';
            var hex = ch.charCodeAt(0).toString(16);
            return '\\u' + ('0000' + hex).slice(-4);
        }) + '"';
    }
    function json(value) {
        if (value === null || value === undefined) return 'null';
        if (typeof value === 'string') return quote(value);
        if (typeof value === 'number') return isFinite(value) ? String(value) : 'null';
        if (typeof value === 'boolean') return String(value);
        var parts = [], i;
        if (value instanceof Array) {
            for (i = 0; i < value.length; i++) parts.push(json(value[i]));
            return '[' + parts.join(',') + ']';
        }
        for (i in value) if (value.hasOwnProperty(i)) parts.push(quote(i) + ':' + json(value[i]));
        return '{' + parts.join(',') + '}';
    }
    function documentIds() {
        var result=[];for(var k=0;k<app.documents.length;k++)result.push(app.documents[k].id);
        result.sort(function(a,b){return a-b;});return result;
    }
    function exportPng(doc, destination) {
        var file=new File(destination);
        if(file.exists)throw Error('benchmark_output_already_exists');
        var options=new ExportOptionsSaveForWeb();options.format=SaveDocumentType.PNG;
        options.PNG8=false;options.includeProfile=true;options.transparency=false;options.interlaced=false;
        doc.exportDocument(file,ExportType.SAVEFORWEB,options);
    }
    function actionSetExists(name) {
        for(var k=1;k<100;k++){
            try{var r=new ActionReference();r.putIndex(charIDToTypeID('ASet'),k);
                if(executeActionGet(r).getString(charIDToTypeID('Nm  '))===name)return true;
            }catch(e){return false;}
        }throw Error('benchmark_action_set_limit');
    }
    function importProtection(doc,path) {
        var mask=null,channel=null;
        try{
            mask=app.open(new File(path));
            if(mask.width.as('px')!==doc.width.as('px')||mask.height.as('px')!==doc.height.as('px'))throw Error('benchmark_mask_geometry');
            channel=mask.channels[0].duplicate(doc);app.activeDocument=doc;
            channel.name='Frozen target protection';doc.selection.deselect();doc.activeChannels=doc.componentChannels;
        }finally{if(mask!==null)mask.close(SaveOptions.DONOTSAVECHANGES);app.activeDocument=doc;}
        return channel;
    }
    function protectOriginal(doc,original,channel) {
        doc.activeLayer=original;var layer=original.duplicate();layer.name='Original target protection (editable mask)';
        layer.move(doc,ElementPlacement.PLACEATBEGINNING);doc.activeLayer=layer;
        doc.selection.load(channel,SelectionType.REPLACE);
        var d=new ActionDescriptor(),r=new ActionReference();
        d.putClass(charIDToTypeID('Nw  '),charIDToTypeID('Chnl'));
        r.putEnumerated(charIDToTypeID('Chnl'),charIDToTypeID('Chnl'),charIDToTypeID('Msk '));
        d.putReference(charIDToTypeID('At  '),r);
        d.putEnumerated(charIDToTypeID('Usng'),charIDToTypeID('UsrM'),charIDToTypeID('RvlS'));
        executeAction(charIDToTypeID('Mk  '),d,DialogModes.NO);doc.selection.deselect();
    }
    var config = benchmarkConfig;
    var priorDialogs = app.displayDialogs;
    var priorActive = app.documents.length ? app.activeDocument : null;
    var rows = [], started = new Date().getTime(), currentStage = 'preflight';
    var report = {status:'FAILED', version:app.version, rows:rows,
                  documentsBefore:app.documents.length, documentIdsBefore:documentIds(), operation:config.operation};
    var actionLoaded=false;
    app.displayDialogs = DialogModes.NO;
    try {
        if(app.version!==config.photoshopVersion||app.path.fsName.toLowerCase()!==new File(config.vendorTools[0].path).parent.fsName.toLowerCase())throw Error('benchmark_photoshop_host_version_or_path');
        // app.open can reuse an existing document. Reject every input before
        // processing, so the finally block can never close a user's document.
        for(var existing=0;existing<app.documents.length;existing++){
            var existingPath=null;try{existingPath=String(app.documents[existing].fullName).toLowerCase();}catch(unsaved){}
            if(existingPath===null)continue;
            for(var inputIndex=0;inputIndex<config.jobs.length;inputIndex++){
                var inputJob=config.jobs[inputIndex];
                if(existingPath===String(new File(inputJob.input)).toLowerCase()||
                    (inputJob.protectionMask&&existingPath===String(new File(inputJob.protectionMask)).toLowerCase())||
                    (inputJob.processedCandidate&&existingPath===String(new File(inputJob.processedCandidate)).toLowerCase()))throw Error('benchmark_input_already_open');
            }
        }
        if (!/^(roundtrip|ps-only|ps-sxt|local-original-restoration|local-residual-median)$/.test(config.operation)) throw Error('benchmark_unsupported_operation');
        if(config.operation==='ps-sxt'){
            if(actionSetExists(config.actionSet))throw Error('benchmark_action_set_already_loaded');
            app.load(new File(config.actionPath));actionLoaded=true;
            if(!actionSetExists(config.actionSet))throw Error('benchmark_action_set_not_loaded');
            var ref=new ActionReference();ref.putName(charIDToTypeID('Actn'),config.actionName);ref.putName(charIDToTypeID('ASet'),config.actionSet);
            if(executeActionGet(ref).getInteger(charIDToTypeID('NmbC'))!==1)throw Error('benchmark_action_step_count');
        }
        for (var i = 0; i < config.jobs.length; i++) {
            var job = config.jobs[i], doc = null, rowStarted = new Date().getTime(), row=null;
            currentStage = job.sample + ':open';
            try {
                doc = app.open(new File(job.input));
                var width = doc.width.as('px'), height = doc.height.as('px');
                if (width !== job.width || height !== job.height || doc.mode !== DocumentMode.RGB ||
                    doc.bitsPerChannel !== BitsPerChannelType.EIGHT || !/sRGB/i.test(doc.colorProfileName)) {
                    throw Error('benchmark_input_color_or_geometry_mismatch');
                }
                var profile = doc.colorProfileName, originalLayers = doc.layers.length;
                currentStage = job.sample + ':edit-layer';
                var original=doc.activeLayer;original.name='Original (unmodified source)';
                if(config.operation==='local-original-restoration'){
                    if(!job.protectionMask||!job.processedCandidate)throw Error('benchmark_restoration_inputs_missing');
                    var processed=null;
                    try{
                        processed=app.open(new File(job.processedCandidate));
                        if(processed.width.as('px')!==width||processed.height.as('px')!==height||
                           processed.mode!==DocumentMode.RGB||processed.bitsPerChannel!==BitsPerChannelType.EIGHT||
                           processed.colorProfileName!==profile)throw Error('benchmark_restoration_candidate_geometry_or_color');
                        processed.activeLayer.duplicate(doc,ElementPlacement.PLACEATBEGINNING);
                    }finally{
                        if(processed!==null)processed.close(SaveOptions.DONOTSAVECHANGES);
                        app.activeDocument=doc;
                    }
                    doc.activeLayer=doc.layers[0];doc.activeLayer.name='Bound SXT candidate (unmodified pixels)';
                }else{doc.activeLayer=original.duplicate();doc.activeLayer.name='Processed candidate';}
                var editedLayers = doc.layers.length;
                if (editedLayers !== originalLayers + 1) throw Error('benchmark_layer_edit_no_effect');
                var processStart=new Date().getTime(),selectionPixels=null,filterHistory=null;
                if(config.operation==='ps-only'){
                    var range=new ActionDescriptor();range.putEnumerated(charIDToTypeID('Clrs'),charIDToTypeID('Clrs'),charIDToTypeID('Hghl'));
                    range.putInteger(charIDToTypeID('Fzns'),config.recipe.fuzziness);
                    range.putInteger(charIDToTypeID('MnmB'),config.recipe.highlightMinimum);
                    range.putInteger(charIDToTypeID('MxmB'),255);
                    executeAction(charIDToTypeID('ClrR'),range,DialogModes.NO);
                    doc.selection.expand(config.recipe.expandPixels);doc.selection.feather(config.recipe.starFeatherPixels);
                    var stars=doc.channels.add();stars.name='PS highlight star selection (editable)';
                    doc.selection.store(stars);doc.selection.deselect();
                    var histogram=stars.histogram;selectionPixels=width*height-histogram[0];
                    if(selectionPixels<=0||selectionPixels>=width*height)throw Error('benchmark_star_selection_empty_or_whole');
                    doc.activeChannels=doc.componentChannels;
                    doc.selection.load(stars,SelectionType.REPLACE);
                    doc.activeLayer.applyMinimum(config.recipe.minimumRadiusPixels);filterHistory=doc.activeHistoryState.name;
                    doc.selection.deselect();
                }else if(config.operation==='local-residual-median'){
                    if(!job.protectionMask||typeof job.medianRadiusPixels!=='number'||
                        job.medianRadiusPixels!==Math.floor(job.medianRadiusPixels)||job.medianRadiusPixels<1||job.medianRadiusPixels>100)
                        throw Error('benchmark_local_median_recipe_invalid');
                    // Only the later frozen editable mask admits these pixels.
                    // Median is a display estimate, not original-source recovery.
                    doc.activeLayer.name='Local residual Median display estimate';
                    doc.activeLayer.applyMedianNoise(job.medianRadiusPixels);filterHistory=doc.activeHistoryState.name;
                }else if(config.operation==='ps-sxt'){
                    app.doAction(config.actionName,config.actionSet);filterHistory=doc.activeHistoryState.name;
                    if(!/SXT ML11 Default/.test(filterHistory))throw Error('benchmark_filter_action_no_history');
                }
                var processingSeconds=(new Date().getTime()-processStart)/1000;
                if(config.operation!=='roundtrip'&&config.operation!=='local-original-restoration')exportPng(doc,job.raw);
                var protectStart=new Date().getTime();
                currentStage=job.sample+':import-protection';
                if(job.protectionMask){var protection=importProtection(doc,job.protectionMask);protectOriginal(doc,original,protection);}
                var protectionSeconds=(new Date().getTime()-protectStart)/1000;
                var saveStart=new Date().getTime();
                if(job.psd){var psdOptions=new PhotoshopSaveOptions();psdOptions.layers=true;psdOptions.alphaChannels=true;psdOptions.embedColorProfile=true;
                    doc.saveAs(new File(job.psd),psdOptions,true,Extension.LOWERCASE);}
                var output = new File(job.output);
                if (output.exists) throw Error('benchmark_output_already_exists');
                currentStage = job.sample + ':save';
                if (config.pngExport === 'save-for-web-profile') {
                    exportPng(doc,job.output);
                } else {
                    var options = new PNGSaveOptions();
                    options.interlaced = false;
                    doc.saveAs(output, options, true, Extension.LOWERCASE);
                }
                row={sample:job.sample, status:'EXPORTED_NOT_PIXEL_ACCEPTANCE',
                           input:job.input, output:job.output, width:width, height:height,
                           mode:'RGB', bits:8, colorProfile:profile, originalLayers:originalLayers,
                           editedLayers:editedLayers, finalLayers:doc.layers.length, alphaChannels:doc.channels.length-3,
                           selectionPixels:selectionPixels,filterHistory:filterHistory,processingSeconds:processingSeconds,
                           protectionSeconds:protectionSeconds,saveSeconds:(new Date().getTime()-saveStart)/1000};
            } finally {
                if (doc !== null) doc.close(SaveOptions.DONOTSAVECHANGES);
            }
            if((config.operation==='local-original-restoration'||config.operation==='local-residual-median')&&job.psd){
                var persisted=null;
                try{
                    persisted=app.open(new File(job.psd));
                    var top=persisted.layers[0],reference=new ActionReference();
                    persisted.activeLayer=top;
                    reference.putEnumerated(charIDToTypeID('Lyr '),charIDToTypeID('Ordn'),charIDToTypeID('Trgt'));
                    var descriptor=executeActionGet(reference),maskKey=stringIDToTypeID('hasUserMask');
                    if(persisted.layers.length!==3||!descriptor.hasKey(maskKey)||!descriptor.getBoolean(maskKey))
                        throw Error('benchmark_restoration_psd_mask_readback_failed');
                    row.psdReadback={layers:persisted.layers.length,alphaChannels:persisted.channels.length-3,
                        width:persisted.width.as('px'),height:persisted.height.as('px'),hasEditableUserMask:true,
                        topLayer:top.name,sourceLayer:persisted.layers[2].name};
                }finally{if(persisted!==null)persisted.close(SaveOptions.DONOTSAVECHANGES);}
            }
            row.wallSeconds=(new Date().getTime()-rowStarted)/1000;rows.push(row);
        }
        report.status = 'EXPORTED_NOT_PIXEL_ACCEPTANCE';
    } catch (error) {
        report.errorStage = currentStage;
        report.errorCode = error.number;
        report.error = /^benchmark_/.test(String(error.message)) ? String(error.message) : 'PHOTOSHOP_API_ERROR';
    } finally {
        if(actionLoaded){
            try{var del=new ActionDescriptor(),set=new ActionReference();set.putName(charIDToTypeID('ASet'),config.actionSet);
                del.putReference(charIDToTypeID('null'),set);executeAction(charIDToTypeID('Dlt '),del,DialogModes.NO);
                if(actionSetExists(config.actionSet))throw Error('benchmark_action_cleanup_failed');
            }catch(cleanup){report.status='FAILED';report.error='benchmark_action_cleanup_failed';}
        }
        app.displayDialogs = priorDialogs;
        if (priorActive !== null) app.activeDocument = priorActive;
        report.documentsAfter = app.documents.length;
        report.documentIdsAfter = documentIds();
        report.wallSeconds = (new Date().getTime()-started)/1000;
    }
    return json(report);
})();
