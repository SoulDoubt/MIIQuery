/* 
    MIIQuery - A jquery plugin for MII 
    By: Allan Irvine - WIPRO

    
*/

(function($) {

    $.ajaxSetup({
        async: true,
        timeout: 60000
    });

    function createWaitDiv(waitText) {
        var $waitDiv = $("<div />");
        $waitDiv.css({
            'vertical-align': 'middle',
            'text-align': 'center',
            'width': '100%',
            'height': '100%'
        });
        var $waitImg = $("<img src='./images/ajax-loader.gif' />");
        $waitDiv.append($waitImg);
        if (waitText !== undefined) {
            var $waitText = $("<span/>");
            $waitText.text(waitText);
            $waitDiv.append($("<br/>"));
            $waitDiv.append($waitText);
        }
        return $waitDiv;
    }




    /*
        Creates an HTML table from an "arbitrary" MII SQL Query template
    */
    $.fn.miiGridHTML = function(options) {

        var $self = this;


        var defaults = {

            title: "Default Title",
            queryTemplate: "",
            width: "300px",
            queryParams: {},
            titleClass: "gridTitle",
            loadingText: "Loading..."

        };

        var opts = $.extend({}, defaults, options);

        var $waitDiv = createWaitDiv(opts.loadingText);

        var bSend = function() {
            $self.append($waitDiv);
        };

        var complete = function() {
            $waitDiv.remove();
        };

        var error = function(xhr, status, errorThrown) {
            var $ed = $("<div/>").html(xhr.responseText);
            $self.empty();
            $self.append($ed);
        };

        var success = function(data, status, xhr) {
            // ajax query was successful
            var fData = miiUtils.formatMIIData(data);
            if (fData.length == 1) {
                var d = fData[0];
                var columnNames = miiUtils.getMIIColumnNames(data);
                delete data;
                if (d.FatalError == undefined) {
                    var table = [];
                    table.push("<table class='fakeGrid'><tr>");
                    table.push("<td colspan='" + columnNames.length + "' class='gridTitle'>" + opts.title + "</td></tr><tr>");
                    var clen = columnNames.length;
                    for (var c = 0; c < clen; c++) {
                        table.push("<td class='gridHeader'>" + columnNames[c] + "</td>");
                    }
                    table.push("</tr>");
                    var dlen = d.length;
                    for (var r = 0; r < dlen; r++) {
                        var row = d[r];
                        if (row.length == columnNames.length) {
                            if (r % 2 == 0) {
                                table.push("<tr class='kppStriped'>");
                            } else {
                                table.push("<tr>");
                            }
                            for (var j = 0; j < row.length; j++) {
                                table.push("<td>" + row[j] + "</td>");
                            }
                            table.push("</tr>");
                        }
                    }
                    table.push("</table>");
                    var $htm = $(table.join(" "));

                    $self.css("width", opts.width);
                    $self.append($htm);
                } else {
                    $title = $("<span/>").text(opts.title);
                    $htm = $("<span/>").text(d.FatalError).css({
                        "color": "red"
                    });
                    $self.css({
                        "width": opts.width,
                        "border": "1px solid"
                    });
                    $self.append($title);
                    $self.append($("<br/>"));
                    $self.append($htm);
                }
            }
        };

        bSend();
        var $query = miiUtils.miiGet(opts.queryTemplate, opts.queryParams);
        $query.done(success);
        $query.always(complete);
        $query.fail(error);
        //miiUtils.miiQuery(opts.queryTemplate, opts.queryParams, bSend, , error, complete);

        return this;

    }

    $.fn.piDataGridHTML = function(options) {
        var $self = this;

        this._data = [];

        var defaults = {
            title: "Default Title",
            width: "300px",
            titleClass: "gridTitle",
            columnNames: ['Measure', 'Value', 'Target'],
            tags: [],
            data: null,
            queryTemplates: [],
            waitText: "Loading..."
        };


        var opts = $.extend({}, defaults, options);

        var $waitDiv = createWaitDiv(opts.waitText);

        this.empty();

        this.append($waitDiv);

        if (opts.data != null) {
            this._data = opts.data;
            buildTable2();
        } else {
            if (opts.queryTemplates.length > 0) {
                var result = miiUtils.executeMultipleQueryTemplates(opts.queryTemplates);
                result.done(function() {
                    // jQuery is a bit weird here in that if we only executed a single ajax get in the call to executeMultipleQueryTemplates
                    // then the result will be passed to the done function as 3 args in the usual way: (result, status, xhr), otherwise if more than 
                    // one ajax get were executed we get multiple args passed to the done function each an array structured [result, status, xhr]
                    // so we have to check for these cases...
                    var argLength = arguments.length;
                    if ($.isArray(arguments[0])) {
                        for (var i = 0; i < argLength; i++) {
                            // lets have fun and assume that the args array's elements are in the same order as the 
                            // query Template array's - UPDATE: THis assumption appears to be correct! Yay!
                            var tagLength = opts.queryTemplates[i].tags.length;
                            var qtTags = opts.queryTemplates[i].tags;
                            for (var j = 0; j < tagLength; j++) {
                                miiUtils.bindCombinedRowsetData(qtTags[j], [arguments[i][0]]);
                            }
                        }
                    } else {
                        var tagLength = opts.queryTemplates[0].tags.length;
                        var qtTags = opts.queryTemplates[0].tags;
                        for (var i = 0; i < tagLength; i++) {
                            miiUtils.bindCombinedRowsetData(qtTags[i], [arguments[0]]);

                        }
                    }
                    buildTable2();
                });
                result.fail(function(xhr, status, errorThrown) {
                    //alert("Deferred fail called with this many args: " + arguments.length);
                    $self.empty();
                    var $msg = $("<span>").css({
                        "color": "red"
                    }).text(opts.title + " Error: " + status);
                    $self.append($msg);
                });
            }
        }


        function buildTable() {

            var table = [];
            table.push("<table class='fakeGrid'><tr>");
            table.push("<td colspan='" + opts.columnNames.length + "' class='gridTitle'>" + opts.title + "</td></tr><tr>");
            var clen = opts.columnNames.length;
            for (var c = 0; c < clen; c++) {
                table.push("<td class='gridHeader'>" + opts.columnNames[c] + "</td>");
            }

            // we need to now extract the individual tag arrays in each query template object into a single array
            var allTags = [];
            var templateLength = opts.queryTemplates.length;
            for (var t = 0; t < templateLength; t++) {
                allTags = $.merge(allTags, opts.queryTemplates[t].tags);
            }
            allTags.sort(function(a, b) {
                return a.DisplaySequence - b.DisplaySequence;
            });
            table.push("</tr>");
            //var dlen = opts.tags.length;
            var dlen = allTags.length;
            for (var r = 0; r < dlen; r++) {
                //var tag = opts.tags[r];
                var tag = allTags[r];
                var value = "NA";
                var tt = "";
                var dtVal = "";
                if (tag.Data != null && tag.Source === "PI") {
                    value = tag.Data[0][tag.LookupColumn];
                    dtVal = tag.Data[0]["DateTime"];
                } else if (tag.Data !== null && tag.Source === "LIMS") {
                    value = tag.Data[0]["NumericResult"];
                    dtVal = tag.Data[0]["SampleDatetime"];
                    tag.Descriptor = tag.Data[0]["LONG_DESC"] !== undefined ? tag.Data[0]["LONG_DESC"] + " " + tag.Data[0]["ResultName"] : '';
                }
                if (tag.Descriptor === "" || tag.Descriptor === undefined || tag.Descriptor === null) {
                    tag.Descriptor = "Tag Not Found";
                }
                var tagType = "";
                var tagDescriptor = "";
                if (tag.Source === "PI") {
                    tagType = "PI Tag: ";
                    tagDescriptor = tag.Descriptor;
                } else if (tag.Source === "LIMS") {
                    tagType = "LIMS Sample: ";
                    tag.Tag = tag.SampleName + "-" + tag.TestType;
                    tagDescriptor = tag.Descriptor;
                }

                tt = tagType + tag.Tag + '&#013;Descriptor: ' + tagDescriptor + '&#013;Timestamp: ' + dtVal + '&#013;Aggregation: ' + tag.Aggregation;
                if (r % 2 == 0) {
                    table.push("<tr class='kppStriped'>");
                } else {
                    table.push("<tr>");
                }
                for (var j = 0; j < opts.columnNames.length; j++) {
                    switch (opts.columnNames[j]) {
                        case 'Measure':
                            table.push("<td>" + tag.DisplayText + "</td>");
                            break;
                        case 'Value':
                            table.push("<td title='" + tt + "' class='right' onclick='miiUtils.createTrendDiv'>" + value + " " + tag.Units + "</td>");
                            break;
                        case 'Units':
                            table.push("<td>" + tag.Units + "</td>");
                            break;
                        case 'Target':
                            var targetText = (tag.Target === undefined || tag.Target === '') ? '' : tag.Target + " " + tag.Units;
                            table.push("<td class='right'>" + targetText + "</td>");
                            break;
                    }
                }
                table.push("</tr>");

            }
            table.push("</table>");
            var $htm = $(table.join(" "));

            $self.css("width", opts.width);
            $self.empty();
            $self.append($htm);
        }

        function buildTable2() {


            var $table = $('<table/>');
            $table.addClass('fakeGrid');
            var $headerTr = $('<tr/>');
            $headerTr.append($("<td/>").attr("colspan", opts.columnNames.length).addClass("gridTitle").text(opts.title));
            $table.append($headerTr)
            //$table.append($("<tr><td colspan='" + opts.columnNames.length + "' class='gridTitle'>" + opts.title + "</td></tr><tr>");
            var clen = opts.columnNames.length;
            var $colNameTr = $("<tr/>");
            for (var c = 0; c < clen; c++) {
                var $td = $("<td/>").addClass("gridHeader").text(opts.columnNames[c]);
                $colNameTr.append($td);
                //table.push("<td class='gridHeader'>" + opts.columnNames[c] + "</td>");
            }
            $table.append($colNameTr);
            // we need to now extract the individual tag arrays in each query template object into a single array
            var allTags = [];
            var templateLength = opts.queryTemplates.length;
            for (var t = 0; t < templateLength; t++) {
                allTags = $.merge(allTags, opts.queryTemplates[t].tags);
            }
            allTags.sort(function(a, b) {
                return a.DisplaySequence - b.DisplaySequence;
            });

            //var dlen = opts.tags.length;
            var dlen = allTags.length;
            for (var r = 0; r < dlen; r++) {
                //var tag = opts.tags[r];
                var $dataTr = $("<tr/>");
                var tag = allTags[r];
                var value = "NA";
                var tt = "";
                var dtVal = "";
                if (tag.Data != null && tag.Source === "PI") {
                    value = tag.Data[0][tag.LookupColumn];
                    dtVal = tag.Data[0]["DateTime"];
                } else if (tag.Data !== null && tag.Source === "LIMS") {
                    value = tag.Data[0]["NumericResult"];
                    dtVal = tag.Data[0]["SampleDatetime"];
                    tag.Descriptor = tag.Data[0]["LONG_DESC"] !== undefined ? tag.Data[0]["LONG_DESC"] + " " + tag.Data[0]["ResultName"] : '';
                }
                if (tag.Descriptor === "" || tag.Descriptor === undefined || tag.Descriptor === null) {
                    tag.Descriptor = "Tag Not Found";
                }
                var tagType = "";
                var tagDescriptor = "";
                if (tag.Source === "PI") {
                    tagType = "PI Tag: ";
                    tagDescriptor = tag.Descriptor;
                } else if (tag.Source === "LIMS") {
                    tagType = "LIMS Sample: ";
                    tag.Tag = tag.SampleName + "-" + tag.TestType;
                    tagDescriptor = tag.Descriptor;
                }

                tt = tagType + tag.Tag + '&#013;Descriptor: ' + tagDescriptor + '&#013;Timestamp: ' + dtVal + '&#013;Aggregation: ' + tag.Aggregation;
                if (r % 2 == 0) {
                    $dataTr.addClass("kppStriped");
                    //table.push("<tr class='kppStriped'>");
                } // else {
                //table.push("<tr>");
                //}
                for (var j = 0; j < opts.columnNames.length; j++) {
                    var $cell = $("<td/>");
                    switch (opts.columnNames[j]) {
                        case 'Measure':
                            $cell.text(tag.DisplayText);
                            $dataTr.append($cell);
                            //table.push("<td>" + tag.DisplayText + "</td>");
                            break;
                        case 'Value': // we need to break the closure on 'tag' if using it in any dynamically assigned event handlers...
                            (function(dataTag) {
                                var $anc = $("<span/>").css({
                                    "cursor": "pointer"
                                }).html(value + " " + dataTag.Units).on('click', function(e) {
                                    miiUtils.createTrendDiv(e, dataTag);
                                });
                                // this replace call is rendundant because you could set the newline char properly above                                
                                $cell.attr("title", tt.replace(/&#013;/g, '\n')).addClass("right");
                                $cell.append($anc);
                                $dataTr.append($cell);
                            })(tag);
                            //table.push("<td title='" + tt + "' class='right' onclick='miiUtils.createTrendDiv'>" + value + " " + tag.Units + "</td>");
                            break;
                        case 'Units':
                            $cell.text(tag.Units);
                            $dataTr.append($cell);
                            //table.push("<td>" + tag.Units + "</td>");
                            break;
                        case 'Target':
                            var targetText = (tag.Target === undefined || tag.Target === '') ? '' : tag.Target + " " + tag.Units;
                            $cell.addClass("right").text(targetText);
                            $dataTr.append($cell);
                            //table.push("<td class='right'>" + targetText + "</td>");
                            break;
                    }
                }
                $table.append($dataTr);

            }
            //table.push("</table>");
            //var $htm = $(table.join(" "));

            $self.css("width", opts.width);
            $self.empty();
            $self.append($table);
        }

    };

    /* Extend the fn object again to draw a jqPlot chart with the 
        

        queryOpts : JSON object containing options to be used by the query template

        chartOpts : JSON object comprising jqPlot Chart Options

        chartObject : a variable that will be assigned the jqPlot object that is created
                      you can use this to refer to the plot once this plugin returns.

    */
    $.fn.miiJQPlot = function(options, chartOpts, data, additionalData) {

        var $self = this;
        //var elemID = $self.selector.substring(1, $self.selector.length);
        var elemID = $self[0].id;
        var target = $("#" + elemID);
        /* if (elemID === undefined || elemID === ""){
            elemID = $self[0].id;
        }*/
        var _options;
        this.Options = null;
        this._data = null;
        this.ChartOptions = null;
        this.AdditionalData = null;

        this.chartObject = null;
        this.miiResponseData = null;
        this.miiQueryURL = "";

        this.UpdateChart = function(options) {
            var $self = this;

            var newParams = null;


            var updateComplete = function(data, status, xhr) {
                $waitDiv.remove();
                if (options.additionalData != null) {
                    $self._data.push(options.additionalData);
                }
                $self.chartObject.replot({
                    data: $self._data,
                    resetAxes: options.resetAxes,
                    axes: options.axes
                });
            };

            if (!options) {
                alert("no options supplied to UpdateChart");
                return this;
            }

            if (options.queryParams != null) {
                newParams = $.extend({}, this.Options.queryParams, options.queryParams);
            }

            if (options.data != null) {
                // in this case, the client is providing data through some other means
                this._data = options.data;
                if (options.additionalData != null) {
                    this._data.push(options.additionalData);
                }
                this.chartObject.replot({
                    data: _data,
                    resetAxes: options.resetAxes,
                    axes: options.axes
                });

            } else {

                // an MII query will be used to populate _data
                // clear any existing data from this object
                _data = null;
                if (this.chartObject != null) {
                    if (options.data !== undefined && $.isArray(options.data)) {
                        _data = options.data;
                    }
                    if (_data === null) {
                        if (this.Options.queryTemplate !== undefined && this.Options.queryTemplate != "") {
                            miiUtils.miiQuery(this.Options.queryTemplate, newParams, bSend, success, error, updateComplete);
                        } else {
                            $what = $("<span/>").text("No MII Query Template provided and no data provided either. Just what were you expecting to see charted here?");
                            $self.append($what);
                        }
                    } else {
                        if (this.AdditionalData != null) {
                            if ($.isArray(this.AdditionalData)) {
                                _data.push(this.AdditionalData);
                            }
                        }

                    }
                }
            }
        }; // this.UpdateChart

        if (arguments.length === 4) {
            _options = options;
            this.ChartOptions = chartOpts;
            this._data = data;
            this.AdditionalData = additionalData;
        } else if (arguments.length === 3) {
            this._data = data;
            _options = options;
            this.ChartOptions = chartOpts;
        } else if (arguments.length === 2) {
            _options = options;
            this.ChartOptions = chartOpts;
        }

        var defaults = {
            waitText: "Loading...",
            errorText: "An Error Occurred",
            queryTemplate: "",
            queryParams: {},
            singleTag: false,
            dataSource: null
        };

        this.Options = $.extend({}, defaults, _options);

        var $waitDiv = createWaitDiv(this.Options.waitText);

        var bSend = function() {
            $self.append($waitDiv);
        }

        var success = function(data, status, xhr) {
            var d;
            $self.miiResponseData = data;
            /* if ($self.Options.singleTag) {
                if ($self.Options.dataSource === "LIMS") {
                    d = miiUtils.formatMIILIMSData(data);
                } else
                    d = miiUtils.formatMIIData(data);
            } else {*/
            d = miiUtils.formatMIIData(data);
            //}
            $self._data = d;
        };

        var error = function(xhr, status) {
            $msg = $("<div/>").html(xhr.responseText);
            $self.empty();
            $self.append($msg);
        }

        var complete = function() {
            var d = $self._data;
            $waitDiv.remove();
            $self.css({
                "height": "300px"
            });
            if (d != null && d !== undefined && d.length > 0) {
                if (d[0].FatalError == undefined) {
                    if ($self.AdditionalData != null) {
                        if ($.isArray($self.AdditionalData)) {
                            d.push($self.AdditionalData);
                        }
                    }
                    $self.chartObject = $.jqplot(elemID, d, $self.ChartOptions);
                } else {
                    $error = $("<div/>").css({
                        "width": "100%",
                        "height": "300px",
                        "text-align": "center",
                        "vertical-align": "middle",
                        "font-weight": "bold"
                    }).text($self.Options.errorText + " " + d[0].FatalError);
                    $self.append($error);
                }
            } else {
                $error = $("<div/>").css({
                    "width": "100%",
                    "height": "300px",
                    "text-align": "center",
                    "vertical-align": "middle",
                    "font-weight": "bold",
                    "color": "red"
                }).text($self.Options.errorText + " No data was returned from the server.");
                $self.append($error);
            }
        };

        if (this._data === null) {
            if (this.Options.queryTemplate !== undefined && this.Options.queryTemplate != "") {
                //miiUtils.miiQuery(this.Options.queryTemplate, this.Options.queryParams, bSend, success, error, complete);
                bSend();
                var paramsCopy = $.extend({}, this.Options.queryParams);
                paramsCopy["Content-Type"] = "text/html";
                this.miiQueryURL = miiUtils.createRequestURL(this.Options.queryTemplate, paramsCopy);
                var q = miiUtils.miiGet(this.Options.queryTemplate, this.Options.queryParams);
                q.done(success).fail(error).always(complete);
            } else {
                $what = $("<span/>").text("No MII Query Template provided and no data provided either. Just what were you expecting to see charted here?");
                this.append($what);
            }
        } else {
            if (this.AdditionalData != null) {
                if ($.isArray(this.AdditionalData)) {
                    this._data.push(this.AdditionalData);
                }
            }
            this.chartObject = $.jqplot(elemID, this._data, this.ChartOptions);
        }

        return this;
    };




    $.fn.miiI5Grid = function(queryTemplate, displayTemplate, title, width, height, divID) {

        var defaults = {
            queryTemplate: null,
            displayTemplate: null,
            title: "",
            width: "640px",

        };

        var grid = new com.sap.xmii.grid.init.i5Grid(displayTemplate, queryTemplate);
        grid.setGridWidth(width);
        grid.setGridHeight(height);
        grid.draw(divID);
        grid.getGridObject().setTitle(title);
        grid.registerCreationEventHandler(gridCreated);
        grid.refresh();
    };

}(jQuery));

// we have need of some utility methods that we'll try to keep out of the global namespace under an object called miiUtils because
// we're good people and we care.


var miiUtils = miiUtils || {

    createTagQueryParams: function(tags, startDate, endDate) {
        var qp = {};
        qp["StartDate"] = toMIIQueryDate(startDate);
        qp["EndDate"] = toMIIQueryDate(endDate);
        for (var i = 0; i < tags.length; i++) {
            var key = "TagName." + (i + 1);
            qp[key] = tags[i].Tag;
        }
        return qp;
    },

    createLIMSQueryParams: function(limsData, startDate, endDate) {
        var qp = {};
        qp["StartDate"] = toMIIQueryDate(startDate);
        qp["EndDate"] = toMIIQueryDate(endDate);

        for (var i = 0; i < limsData.length; i++) {
            var ld = limsData[i];
            var sampleNameParam = "Param." + ((i * 2) + 1).toString();
            var testTypeParam = "Param." + ((i * 2) + 2).toString();
            qp[sampleNameParam] = ld.SampleName;
            qp[testTypeParam] = ld.TestType;
        }

        return qp;
    },

    createPcoAggregateQueryParams: function(tags, startDate, endDate) {
        // ugh, the way to send tags to a Pco query is by constructing a comma-delinited string of the 
        // tag names and setting the 'SelectedTags' property to this.
        var qp = {};
        qp["StartDate"] = toMIIQueryDate(startDate);
        qp["EndDate"] = toMIIQueryDate(endDate);
        var interval = (endDate - startDate) / (1000 * 60 * 60 * 24);
        qp["IntervalCount"] = interval < 1 ? 1 : interval;
        var tagString = "";
        for (var i = 0; i < tags.length; i++) {
            tagString += tags[i].Tag + ",";
        }
        tagString = tagString.substring(0, tagString.length - 1);
        qp["SelectedTags"] = tagString;
        return qp;

    },

    // Tag data is suitable for PI
    TagData: function(tag, displayText, units, target, displaySequence) {
        this.Source = "PI";
        this.Tag = tag;
        this.DisplayText = displayText;
        this.Data = null;
        this.Descriptor = '';
        this.LookupColumn = '';
        this.Units = units;
        this.Target = target;
        this.Aggregation = "";
        this.DisplaySequence = displaySequence === undefined ? 0 : displaySequence;
    },

    // Lims Data is suitable for LIMS - don't even start saying there should be a prototype object for these things.....
    // I care not about your OOP patterns and such.
    LimsData: function(sampleName, resultName, displayText, units, target, displaySequence) {
        this.SampleName = sampleName;
        this.TestType = resultName;
        this.DisplayText = displayText;
        this.DisplaySequence = displaySequence;
        this.Data = null;
        this.Units = units;
        this.Target = target;
        this.Source = "LIMS";


    },


    /*
        Given a query template path and a params object, constructs the URL for the MII query template request
    */
    createRequestURL: function(template, queryParams) {
        var urlBase = '/XMII/Illuminator?QueryTemplate=';
        var templateUri = encodeURIComponent(template);
        var params = "";

        // Mii will send us back its special blend of HTML unless we specify json. ALWAYS specify json!
        // however if you really want HTML, set it in your params object and this will not override it.
        if (!queryParams["Content-Type"]) {
            queryParams["Content-Type"] = "text/json";
        }
        // for some reason MII isn't happy with $.param(queryParams) output. It seems to encode dates
        // in a way that MII does not like, but encodeURIComponent is fine which I find strange...
        for (var key in queryParams) {
            var pVal = queryParams[key];
            params += "&" + key + "=" + encodeURIComponent(pVal);
        }

        var finalURL = urlBase + templateUri + "&" + params;
        return finalURL;
    },

    /*
        Executes the given query template with the provided params object.
        Uses HTTP GET and does not allow for callbacks, Use the returned deferred object 
        to handle resolution/rejection events as necessary.
    */
    miiGet: function(queryTemplate, queryParams) {
        var finalURL = miiUtils.createRequestURL(queryTemplate, queryParams)
        return $.ajax({
            url: finalURL,
            data: {},
            dataType: 'json',
            cache: false,
            async: true,
            type: "GET",
            context: queryTemplate
        });
    },

    /*
        Executes multiple Query Templates asynchronously. 
        Returns a promise from a master deferred that tracks the state of all query templates, therefore
        the .done method handler on the return value will receive data from all templates in the order they appear in the templates array.
    */
    executeMultipleQueryTemplates: function(templates) {
        if ($.isArray(templates)) {
            if (templates.length > 0) {
                var deferreds = [];
                for (var i = 0; i < templates.length; i++) {
                    deferreds.push(this.miiGet(templates[i].template, templates[i].params));
                }
                return $.when.apply(null, deferreds);
            }
        }
        return null;
    },

    /*
        Utility function
        Returns a valid date object given a date string extracted from MII query data. 
    */
    formatMIIDate: function(miiDate) {
        var d = Date.parse(miiDate);
        if (Object.prototype.toString.call(d) === "[object Date]") {
            return d;
        }
        // just remove the 'T' character and it's good to go...
        var arr = miiDate.split('T');
        if (arr.length == 2) {
            var dtstr = arr[0] + " " + arr[1];
            var dt = new Date(dtstr);
            return dt;
        }
        return miiDate;
    },

    /*
        Utility Function
        Grabs the column names from returned MII query data.
    */
    getMIIColumnNames: function(data) {
        var rowsets = data.Rowsets;
        if (rowsets.Rowset != undefined) {
            var rset = rowsets.Rowset;
            var rsc = rset.length;
            for (var i = 0; i < rsc; i++) {
                var columnDescriptions = [];
                var rs = rowsets.Rowset[i];
                var colCount = rs.Columns.Column.length;
                for (var x = 0; x < colCount; x++) {
                    columnDescriptions.push(rs.Columns.Column[x].Description);
                }
            }
        }
        return columnDescriptions;
    },

    bindCombinedRowsetData: function(tagInfo, rowsetData) {
        for (var i = 0; i < rowsetData.length; i++) {
            var rowsets = rowsetData[i].Rowsets;
            // each rowsets object actually contains a collection of actual rowsets depending on how many tags were queried...
            if (rowsets.Rowset !== undefined && rowsets.FatalError === undefined) {
                var rowsetCount = rowsets.Rowset.length
                for (var j = 0; j < rowsetCount; j++) {
                    var rs = rowsets.Rowset[j];
                    // if no Tag property is present on the tagInfo object, we are not sealing with a PI tag...
                    if (tagInfo.Source === "LIMS") {
                        if (rs.Row !== undefined) {
                            var testRow = rs.Row[0];
                            if (testRow !== undefined) {
                                if (testRow["SampleName"] === tagInfo.SampleName && testRow["TestType"] === tagInfo.TestType) {
                                    tagInfo.Data = rs.Row;
                                }
                            }
                        }
                    } else if (tagInfo.Source === "PI") {
                        // now iterate the columns collection for tag mapping purposes                    
                        var columnCount = rs.Columns.Column.length;
                        for (var k = 0; k < columnCount; k++) {
                            var column = rs.Columns.Column[k];
                            if (column.SourceColumn === tagInfo.Tag) {
                                // we have a) found the rowset object that contains the data for the given tag and b) found the descriptor for the tag
                                tagInfo.Descriptor = column.Description;
                                if (tagInfo.DisplayText === undefined || tagInfo.DisplayText === null) {
                                    tagInfo.DisplayText = column.Description;
                                }
                                // we can deduce from the lack of any description on the column that the tag was not found in PI. That's the 
                                // only way that a column would have no description. Actually this isn't true, some error conditions will put us
                                // there as well, but it's essentially the same result, we do not have any valid data.
                                if (column.Description === undefined || column.Description === null || column.Description === "") {
                                    tagInfo.Descriptor = "Tag Not Found";
                                }
                                tagInfo.Data = rs.Row;
                                tagInfo.LookupColumn = column.Name;
                                var aggString = column.Name.substring(0, column.Name.indexOf("_"));
                                if (aggString.match(/(AVG|TOT|SUM|MIN|MAX|Average|Total|Sum)/)) {
                                    tagInfo.Aggregation = aggString;
                                } else {
                                    tagInfo.Aggregation = "None";
                                }
                                delete rowsetData;
                                return;
                            }
                        }
                    }

                }
            } else if (rowsets.Rowset !== undefined && rowsets.FatalError !== undefined) {
                tagInfo.LookupColumn = "FatalError";
                tagInfo.Data = [{
                    "FatalError": rowsets.FatalError
                }];
                tagInfo.Descriptor = rowsets.FatalError;
            } else {
                // in this case the rowset data did not come from MII and probably doesn't exist
            }
        }
        delete rowsetData;
    },

    formatMIIData: function(data) {
        var rowsets = data.Rowsets;
        if (rowsets.Rowset != undefined) {
            var rset = rowsets.Rowset;
            var rsc = rset.length;
            var plottableRows = [];
            for (var i = 0; i < rsc; i++) {
                var columns = [];
                var columnDescriptions = [];
                var rs = rowsets.Rowset[i];
                var colCount = rs.Columns.Column.length;
                for (var x = 0; x < colCount; x++) {
                    columnDescriptions.push(rs.Columns.Column[x].Description);
                    columns.push(rs.Columns.Column[x].Name);
                }
                if (rs.Row) {
                    var rowCount = rs.Row.length;
                    var rows = [];
                    for (var j = 0; j < rowCount; j++) {
                        var dataRow = rs.Row[j];

                        var itemArray = [];
                        // Some data sources (PI) will return "NA" as a value sometimes if the value at the given
                        // timestamp was somehow "bad". jqplot will fail to draw any points if there is a string value present
                        // and it is expecting a numeric value. Thereforme 'NA' values must be excluded.
                        var includeRow = true;
                        var collen = columns.length;
                        for (var k = 0; k < collen; k++) {
                            var dataItem = dataRow[columns[k]];
                            if (columns[k].toLowerCase().indexOf("datetime") > -1) {
                                dataItem = formatMIIDate(dataItem);
                                itemArray.push(dataItem);
                            } else if ($.isNumeric(dataItem)) {
                                itemArray.push(dataItem);
                            }
                        }
                        if (includeRow) {
                            rows.push(itemArray);
                        }
                    }
                    plottableRows.push(rows);
                }
            }
            delete data;
            return plottableRows;
        } else if (rowsets.FatalError != undefined) {
            delete data;
            return [{
                "FatalError": "Fatal Error: " + rowsets.FatalError
            }];
        }
    },


    /*  Execute a given query template and assign the provided callbacks 
        A deferred is returned for further processing if necessary.

        This method uses POST as described in MII documentation, but no data is sent and all parameters are in the URL.

    */
    miiQuery: function(queryTemplate, queryParams, beforeSendCallback, successCallback, errorCallback, completeCallback) {

        var finalURL = this.createRequestURL(queryTemplate, queryParams);

        var req = $.ajax({
            type: 'POST',
            url: finalURL,
            data: {},
            dataType: 'json',
            cache: false,
            beforeSend: beforeSendCallback,
            success: successCallback,
            error: errorCallback,
            complete: completeCallback
        });
        return req;
    },


    createTrendDiv: function(evt, tagData) {

        var avgTemplate = "Long Harbour PIMS/DailyAvgTagQuery";
        var avgPcoTemplate = "Long Harbour PIMS/DailyAvgPcoQuery";
        var totTemplate = "Long Harbour PIMS/DailyTotTagQuery";
        var totPcoTemplate = "Long Harbour PIMS/DailyTotPcoQuery";
        var currentValTemplate = "Long Harbour PIMS/CurrentValuePcoQuery";
        var limsCurrentValTemplate = "Long Harbour PIMS/LIMSValueQuery";

        var $div = $("#popupTrend");

        var $chartDiv = $("<div/>").css({
            "width": "400px",
            "height": "300px",
            "z-index": 1201
        }).attr({
            "id": "popupTrendChartHolder"
        });

        /*var $menuDiv = $("<div/>").css({
            "height": "20px",
            "width": "100%",
            "background-color": "#FF2233"
        }).text("I am the menu");
*/
        // remove the container from the DOM if it exists already
        // this will 'close' and open trend dialogs
        if ($div.length > 0) {
            $("#popupTrend").remove();
        }


        $div = $("<div>").css({
            "width": "400px",
            "height": "320px",
            "z-index": 1200,
            "padding-left" : "12px"
        }).attr({
            "id": "popupTrend"
        });

        $div.append($chartDiv);
        //$div.append($menuDiv);

        var ed = new Date();
        var sd = new Date();
        sd.setDate(ed.getDate() - 30);

        var qt = "";
        var qParams = {};
        switch (tagData.Source) {
            case "PI":
                var agg = tagData.Aggregation.toLowerCase();
                if (agg === "none" || agg === "" || agg === undefined) {
                    qt = currentValTemplate;
                    qParams = miiUtils.createPcoAggregateQueryParams([tagData], sd, ed);
                } else if (agg.match(/(avg|average)/)) {
                    qt = avgPcoTemplate;
                    qParams = miiUtils.createPcoAggregateQueryParams([tagData], sd, ed);
                } else if (agg.match(/sum|tot/)) {
                    qt = totPcoTemplate;
                    qParams = miiUtils.createPcoAggregateQueryParams([tagData], sd, ed);
                }
                break;
            case "LIMS":
                qt = limsCurrentValTemplate;
                qParams = miiUtils.createLIMSQueryParams([tagData], sd, ed);
                break;
        }


        var queryOptions = {
            queryTemplate: qt,
            queryParams: qParams,
            waitText: "Loading 30 Day Trend",
            singleTag: true,
            dataSource: tagData.Source
        };

        var chartOptions = {
            title: tagData.DisplayText,
            showTitle: false,
            axes: {
                xaxis: {
                    renderer: $.jqplot.DateAxisRenderer,
                    tickOptions: {
                        formatString: '%d-%b-%Y'
                    },
                    label: 'Date',
                    min: sd,
                    max: ed
                }
            },
            series: [{
                label: tagData.Tag,
                color: "#007E7A",
                yaxis: 'yaxis',
                index: 4,
                showMarker: true,
                lineWidth: 1
            }],
            highlighter: {
                show: true

            },
            cursor: {
                show: false
            },
            legend: {
                show: true,
                location: "nw",
                placement: "insideGrid"
            },
            grid: {
                background: "#FFFFFF"
            }
        };

        $chartDiv.miiJQPlot(queryOptions, chartOptions, null, null);

        $div.dialog({
            width: 450,
            height: 350,
            title: tagData.DisplayText

        });

        // if the chart was created as a result of an mii Query (likely) then we should give users access to the raw data
        // as you would get in MII.        
        if ($chartDiv.miiQueryURL !== "" && $chartDiv.miiQueryURL !== undefined) {
            $dialogHeader = $(".ui-dialog-titlebar");
            $btn = $("<button/>").text("D").on('click', function() {
                //alert($chartDiv.miiQueryURL);
                window.open($chartDiv.miiQueryURL);
            }).css({
                "float": "right"
            });
            $dialogHeader.append($btn);
        }

    }

};
