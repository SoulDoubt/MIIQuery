/*
    Arguably useful js functions for use with MII 14
    By: Allan Irvine, Wipro Technologies June 2014
    
*/

/*---------------------------------------- AJAX WAITING FUNCTIONS------------------------*/




/* -------------------------------------- MII DATA PARSING ------------------------------*/

/*
    Converts a collection of MII Rowsets objects returned via an AJAX call 
    into the array-of-arrays format that jqplot insists upon.
    IMPORTANT NOTE: If you have more data to add to the plot, like targets, or the 
    result set from another query, push those results into the array returned by this function.
    DO NOT place the return value of this function into another array and expect jqPlot to 
    draw you anything.
    IF you are looking to combine results from multiple calls to this function, you will need
    to take the individual elements from these arrays and combine them into an array yourself.


*/

function makeMIIDataPlotable(data) {
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
            var rowCount = rs.Row.length;
            var rows = [];
            for (var j = 0; j < rowCount; j++) {
                var dataRow = rs.Row[j];

                var itemArray = [];
                // Some data sources (PI) will return "NA" as a value sometimes if the value at the given
                // timestamp was somehow "bad". jqplot will fail to draw any points if there is a string value present
                // and it is expecting a numeric value. Thereforme 'NA' values must be excluded.
                var includeRow = true;
                for (var k = 0; k < columns.length; k++) {
                    var dataItem = dataRow[columns[k]];
                    if (columns[k] == "DateTime") {

                        dataItem = formatMIIDate(dataItem);
                    } else if (dataItem === "NA") {
                        includeRow = false;
                    }
                    itemArray.push(dataItem);
                }
                if (includeRow) {
                    rows.push(itemArray);
                }
            }
            plottableRows.push(rows);
        }
        return plottableRows;
    } else if (rowsets.FatalError != undefined) {
        return [{
            "FatalError": "Fatal Error: " + rowsets.FatalError
        }];
    }
}

// returns the 0'th value for the given tag present in data
// data must be a raw MII query Result.
function dataBindTagMII(tagname, data) {
    if (data.Rowsets.Rowset !== undefined) {
        var rs = data.Rowsets.Rowset;
        for (var i = 0; i < rs.length; i++) {
            var tagColumn = "";
            var r = rs[i];
            var cols = r["Columns"].Column;
            for (var k = cols.length - 1; k > -1; k--) {
                var c = cols[k];
                if (c.SourceColumn == tagname) {
                    tagColumn = c.Name;
                    break;
                }
            }
            if (tagColumn !== "") {
                if (r.Row.length > 0) {
                    return r.Row[0][tagColumn];
                }
            }
        }
    } else if (data.Rowsets.FatalError !== undefined) {
        return "Fatal Error: " + data.Rowsets.FatalError;
    } else
        return "NA";

}

function dataBindLIMSMII(data) {

}

function checkForFatalError(data) {
    if (data.Rowsets.FatalError !== undefined) {
        return data.Rowsets.FatalError;
    } else {
        return false;
    }
}

function getColumnNames(data) {
    var rowsets = data.Rowsets;
    if (rowsets.Rowset != undefined) {
        var rset = rowsets.Rowset;
        var rsc = rset.length;
        var plottableRows = [];
        for (var i = 0; i < rsc; i++) {
            //var columns = [];
            var columnDescriptions = [];
            var rs = rowsets.Rowset[i];
            var colCount = rs.Columns.Column.length;
            for (var x = 0; x < colCount; x++) {
                columnDescriptions.push(rs.Columns.Column[x].Description);
                //columns.push(rs.Columns.Column[x].SourceColumn);
            }
        }
    }
    return columnDescriptions;
}

/*
    useful for inspecting the properties of objects to find all the 
    features that SAP decided not to bother documenting.
*/

function getMethods(obj) {

    var result = [];
    for (var id in obj) {
        try {
            //if (typeof(obj[id]) == "function") {
            result.push(id + ": " + obj[id].toString());
            //}
        } catch (err) {
            result.push(id + ": inaccessible");
        }
    }
    return result;
}


/* ---------------------------------------DATE FUNCTIONS ---------------------------------------------*/

/*
    Turns an MII date string into a js Date object, usually...
*/
function formatMIIDate(miiDate) {
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
}

function firstDayOfMonth(dt) {
    return new Date(dt.getFullYear(), dt.getMonth(), 1, 0, 0);
}

function lastDayOfMonth(dt) {
    return new Date(dt.getFullYear(), dt.getMonth() + 1, 0, 23, 59, 59);
}

function sevenDaysAgo(dt) {
    var d = new Date(dt);
    d.setDate(dt.getDate() - 7);
    return d;
}

// dt MUST MUST MUST be a valid js Date Object
// date format is yyyy-MM-dd HH:mm:ss
// THIS IS THE ISO-8601 representation minus the time zone, so don't 
// start complaining about how it's not your favorite.
// Also, you must set the query template to use this format exactly.
function toMIIQueryDate(dt) {
    if (Object.prototype.toString.call(dt) === "[object Date]") {

        return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()) + ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ':' + pad(dt.getSeconds());
    }
    return "";

}

function pad(i) {
    if (i < 10) {
        return '0' + i;
    }
    return i;
}

/*
    Turn a string into a date (use at your own risk).
*/

function dateify(str) {
    var dt = new Date(str);
    return dt;
}

function getDailyDates(dt) {
    var sd = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 7, 0, 0);
    var ed = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1, 7, 0, 0);
    return {
        start: sd,
        end: ed
    };
}

/* --------------------------------------- QUERY TEMPLATE EXECUTION ------------------------------------*/
/*
    Execute an MII Query Template via ajax

    queryParams: a JSON object representing key value pairs of your params
                 for example { "Param.1" : "SINUSOID", "RowCount": 1000 }
*/

function createRequestURL(template, queryParams) {
    var urlBase = '/XMII/Illuminator?QueryTemplate=';
    var templateUri = encodeURIComponent(template);
    var params = "";

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
}

function ajaxQuery(queryTemplate, queryParams, beforeSendCallback, successCallback, errorCallback, completeCallback) {


    var finalURL = createRequestURL(queryTemplate, queryParams);

    var req = $.ajax({
        type: 'POST',
        url: finalURL,
        data: {},
        dataType: 'json',
        cache: false,
        async: true,
        crossDomain: true,
        beforeSend: beforeSendCallback,
        success: successCallback,
        error: errorCallback,
        complete: completeCallback
    });

    return req; // return the deferred object so we can sync calls if necessary.
}

function ajaxGet(queryTemplate, queryParams) {

    var finalURL = createRequestURL(queryTemplate, queryParams);
    // this function MUST return a deferred.
    return $.get(finalURL);
}

/* --------------------------------------------- PI TAG UTILS --------------------------------*/

function TagData(tag, displayText, units, target, displaySequence) {
    this.Tag = tag;
    this.DisplayText = displayText;
    this.Data = null;
    this.Descriptor = '';
    this.LookupColumn = '';
    this.Units = units;
    this.Target = target;
    this.Aggregation = "";
    this.DisplaySequence = displaySequence === undefined ? 0 : displaySequence;

}



function createTagQueryParams(tags, startDate, endDate) {
    var qp = {};
    qp["StartDate"] = toMIIQueryDate(startDate);
    qp["EndDate"] = toMIIQueryDate(endDate);
    for (var i = 0; i < tags.length; i++) {
        var key = "TagName." + (i + 1);
        qp[key] = tags[i].Tag;
    }
    return qp;
}



/* --------------------------------------------- MATH FUNCTIONS ------------------------------*/

function mdArrayMax(arr, index) {
    return arr.reduce(function(max, arr) {
        return max >= arr[index] ? max : arr[index];
    }, -Infinity);
}

function mdArrayMin(arr, index) {
    return arr.reduce(function(min, arr) {
        return min <= arr[index] ? min : arr[index];
    }, Infinity);
}

function randomize(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function ajaxError(xhr, status) {
    alert("An ajax request failed with status: " + status + " The response from the server was: " + xhr.responseText);
}

/*------------------------------ DUMMY DATA FUNCTIONS -----------------------------------------*/

/*
    Creates daily dummy data for the month of the parameter today
    within the range of minval/maxval
*/

function monthsWorthOfDailyData(minVal, maxVal, today) {
    var minDate = firstDayOfMonth(today);
    var maxDate = lastDayOfMonth(today);

    var theDate = minDate;
    var data = [];
    while (theDate <= maxDate) {
        var d = new Date(theDate);
        var item = [];
        item.push(d);
        item.push(randomize(minVal, maxVal));
        data.push(item);
        var newDate = theDate.setDate(theDate.getDate() + 1);
        theDate = new Date(newDate);
    }
    return data;
}

function getDailyData(minVal, maxVal, minDate, maxDate) {
    var theDate = new Date(minDate);
    var data = [];
    while (theDate <= maxDate) {
        var d = new Date(theDate);
        var item = [];
        item.push(d);
        item.push(randomize(minVal, maxVal));
        data.push(item);
        var newDate = theDate.setDate(theDate.getDate() + 1);
        theDate = new Date(newDate);
    }
    return data;
}

function getTargetPoints(val, dt, end) {
    var minDate, maxDate;
    if (end !== undefined) {
        minDate = new Date(dt);
        maxDate = new Date(end);
    } else {
        minDate = firstDayOfMonth(dt);
        maxDate = lastDayOfMonth(dt);
    }
    var target = [];
    var min = [];
    min.push(minDate);
    min.push(val);
    target.push(min);
    var max = [maxDate, val];
    target.push(max);
    return target;
}

/*
        Fetches all data for the monthly production summary chart.
    */
function getMonthlyProductionData(testDate) {
    var minDate = firstDayOfMonth(testDate);
    var maxDate = lastDayOfMonth(testDate);

    var seriesMin = 75; //mdArrayMin(mpSeries, 1);
    var seriesMax = 175; //mdArrayMax(mpSeries, 1);

    var ret = [];
    var prodSum = [];
    var prodSeries = [];
    var prodTarget = [];
    var targetSum = [];
    var sumVal = 0;
    var targetS = 0;
    var seriesData = monthsWorthOfDailyData(seriesMin, seriesMax, testDate);
    var targetVal = 137;
    prodTarget = getTargetPoints(targetVal, testDate);
    for (var i = 0; i < seriesData.length; i++) {
        if (seriesData[i][0] <= testDate) {
            targetS += targetVal;
            sumVal += seriesData[i][1];
            prodSeries.push(seriesData[i]);
            var ps = [prodSeries[i][0], sumVal];
            prodSum.push(ps);
            var ts = [prodSeries[i][0], targetS];
            targetSum.push(ts);
        }
    }
    ret.push(prodSum, prodSeries, prodTarget, targetSum);
    return ret;
}

/* ---------------------------- MII Query-and-Display Functions----------------------------------*/

/*
    creates an i5 grid with the specified parameters and places it in the specified div
*/

function displayI5Grid(queryTemplate, displayTemplate, title, width, height, divID) {
    var grid = new com.sap.xmii.grid.init.i5Grid(displayTemplate, queryTemplate);
    grid.setGridWidth(width);
    grid.setGridHeight(height);
    grid.draw(divID);
    grid.getGridObject().setTitle(title);
    grid.registerCreationEventHandler(gridCreated);
    grid.refresh();
}

/*
    creates a grid applet with the specified parameters and places it in the specified div
*/

function displayGridApplet(queryTemplate, displayTemplate, title, width, height, divID, creationEventName) {
    var $applet = $([
        "<APPLET CODEBASE='/XMII/Classes' CODE='iGrid' ARCHIVE='illum8.zip' ID='" + divID + "_grid_applet" + " ' ",
        "WIDTH='" + width + "' HEIGHT='" + height + "' NAME='" + title + "' MAYSCRIPT>",
        "<PARAM NAME='QueryTemplate' VALUE='" + queryTemplate + "'>",
        "<PARAM NAME='DisplayTemplate' VALUE='" + displayTemplate + "'>",
        "<PARAM NAME='CreationEvent' VALUE='" + creationEventName + "' >",
        "<PARAM NAME='Content-Type' VALUE='image&#x2f;png'>",
        "<PARAM NAME='Title' VALUE='" + title + "'>",
        "</APPLET>"
    ].join(" "));
    var divstr = "#" + divID;
    $(divstr).append($applet);
}

/*
    Creates a standard HTML table of the values returned by an MII Query Template
    Which is what we really want most of the time anyway...
*/
function displayGridHTML(queryTemplate, title, width, height, divID) {
    var queryParams = {};

    if (divID.indexOf("#") != 0) {
        divID = "#" + divID;
    }

    var $waitDiv = $("<div />");

    var bSend = function() {

        $waitDiv.css({
            'vertical-align': 'middle',
            'text-align': 'center',
            'width': '100%',
            'height': '100%'
        });
        var $waitImg = $("<img src='./images/ajax-loader.gif' />");
        $waitDiv.append($waitImg);
        $(divID).append($waitDiv);
    };

    var complete = function() {
        $waitDiv.remove();
    };

    ajaxQuery(queryTemplate, queryParams, bSend, function(data, status, xhr) {
        // ajax query was successful... BUT
        // that doesn't mean the query was actually successful.
        var fData = makeMIIDataPlotable(data);
        var d = fData[0];
        var columnNames = getColumnNames(data);
        delete data;
        if (d.FatalError == undefined) {
            var table = [];
            table.push("<table class='fakeGrid'><tr>");
            table.push("<td colspan='" + columnNames.length + "' class='gridTitle'>" + title + "</td></tr><tr>");
            for (var c = 0; c < columnNames.length; c++) {
                table.push("<td class='gridHeader'>" + columnNames[c] + "</td>");
            }
            table.push("</tr>");
            for (var r = 0; r < d.length; r++) {
                var row = d[r];
                if (row.length == columnNames.length) {
                    if (r % 2 == 0) {
                        table.push("<tr class='kppStriped'>");
                    } else {
                        table.push("<tr>");
                    }
                    for (var j = 0; j < row.length; j++) {
                        if (!isNaN(row[j])) {
                            table.push("<td style='text-align: right;'>" + row[j] + "</td>");
                        } else {
                            table.push("<td>" + row[j] + "</td>");
                        }
                    }
                    table.push("</tr>");
                }
            }
            table.push("</table>");
            var $htm = $(table.join(" "));

            $(divID).css("width", width);
            $(divID).append($htm);
        } else {
            $title = $("<span/>").text(title);
            $htm = $("<span/>").text(d.FatalError).css({
                "color": "red"
            });
            $(divID).css({
                "width": width,
                "border": "1px solid"
            });
            $(divID).append($title);
            $(divID).append($("<br/>"));
            $(divID).append($htm);
        }

    }, ajaxError, complete);
}

function buildReagentsTableStandard(title, divID) {
    var queryParams = {};

    ajaxQuery("Long Harbour PIMS/Reagents_DummyQuery", queryParams, null, function(data, status, xhr) {
        var rowsets = data.Rowsets;
        var rowset = rowsets.Rowset[0];
        var rows = rowset.Row;
        var theRow = rows[0];
        var lvl = theRow["Level"];
        var count = theRow["Count"];
        var cons = theRow["Consumption"];
        var time = theRow["Time"];
        var html = [];
        var img = "";
        var img2 = "";
        img = getUpDownArrowImage(lvl > 50);
        img2 = getUpDownArrowImage(count > 12);
        html.push("<table class='invTable'><tr><td colspan='4' class='valeth'>" + title + "</td></tr>");
        html.push("<tr><td colspan='2' class='valeth'>In Process Inventory</td><td rowspan='2' class='valeth'>Consumption (24h Avg)</td><td rowspan='2' class='valeth'>Time Left</td></tr>");
        html.push("<tr><td class='valeth'>Tote Level</td><td class='valeth'># Totes</td></tr>");
        html.push("<tr><td>" + img + lvl + "%</td>");
        html.push("<td>" + img2 + count + "</td><td>" + cons + "L/h</td><td>" + time + " days</td></tr>");
        html.push("</table>");
        if (divID.indexOf("#") != 0) {
            divID = "#" + divID;
        }
        var $tbl = $(html.join(" "));
        $(divID).append($tbl);
    }, ajaxError);
}

function buildLeachPlantSolidsInventory(title, inventory, change, divID, isTank) {
    var html = [];
    html.push("<table class='invTable' style='margin-bottom: 5px; width: 280px;'><tr><td colspan='2' class='valeth'>" + title + "</td></tr>");
    if (isTank) {
        html.push("<tr><td class='valeth'>Tank Level</td><td class='valeth'>24h Change</td></tr>");
    } else {
        html.push("<tr><td class='valeth'>Solids Inventory</td><td class='valeth'>24h Change</td></tr>");
    }
    var img = getUpDownArrowImage(change > 6);
    var unit = isTank ? "%" : "t";
    var val = inventory + unit;
    html.push("<tr><td>" + val + "</td><td>" + img + change + "%</td></tr></table>");
    var $tbl = $(html.join(" "));
    $("#" + divID).append($tbl);




}

function buildLeachPlantSolidsInventory2(title, inventory, change, divID, isTank)
{
    var $tbl = $("<table/>").addClass("invTable").css({"margin-bottom" : "5px", "width" : "280px"});
    var $hdrTr = $("<tr/>");
    var $hdrTd0 = $("<td/>").addClass("valeth").attr({"colspan" : 2}).text(title);
    $hdrTr.append($hdrTd0);
    var $hdrTr1 = $("<tr/>");
    var $hdrTd1 = $("<td/>").addClass("valeth");
    var $hdrTd2 = $("<td/>").addClass("valeth").text("24h Change");

    if (isTank){
        $hdrTd1.text("Tank Level");
    }else{
        $hdrTd1.text("Solids Inventory");
    }
    $hdrTr1.append($hdrTd1);
    $hdrTr1.append($hdrTd2);
    var img = getUpDownArrowImage(change > 6);
    var unit = isTank ? "%" : "t";
    var val = inventory + unit;
    var $valTr = $("<tr/>")
    var $valtd1 = $("<td/>").text(val);
    var $valTd2 = $("<td/>").html(img + change + "%");
    $valTr.append($valtd1);
    $valTr.append($valTd2);
    $tbl.append($hdrTr);
    $tbl.append($hdrTr1);
    $tbl.append($valTr);

    $("#" + divID).append($tbl);
}

function createInventoryVariance(divID, title) {
    ajaxQuery("Long Harbour PIMS/NiEWInventoryQuery", {}, null, function(data, status, xhr) {
        var result = data.Rowsets.Rowset[0];
        if (result !== undefined) {
            var vals = result.Row[0];
            var table = ["<table class='inventory'><tr><td colspan='7' class='inventoryHeader'>", title, "</td></tr>"];
            var img0 = getUpDownArrowImage(randomize(0, 10) > 4);
            var img1 = getUpDownArrowImage(randomize(0, 10) > 4);
            var img2 = getUpDownArrowImage(randomize(0, 10) > 4);
            var img3 = getUpDownArrowImage(randomize(0, 10) > 4);
            var img4 = getUpDownArrowImage(randomize(0, 10) > 4);
            var img5 = getUpDownArrowImage(randomize(0, 10) > 4);
            table.push("<tr><td>Volume:</td>");
            table.push("<td class='inventoryValue'>" + img0 + vals["Volume"] + "%</td>");
            table.push("<td>1 Day</td>");
            table.push("<td class='inventoryValue'>" + img1 + vals["Weekly"] + "%</td>");
            table.push("<td>Weekly</td>");
            table.push("<td class='inventoryValue'>" + img2 + vals["TwoWeeks"] + "%</td>");
            table.push("<td>2 Weeks</td>");
            var tots = result.Row[1];
            table.push("<tr><td>Total Ni:</td>");
            table.push("<td class='inventoryValue'>" + img3 + tots["Volume"] + "%</td>");
            table.push("<td>1 Day</td>");
            table.push("<td class='inventoryValue'>" + img4 + tots["Weekly"] + "%</td>");
            table.push("<td>Weekly</td>");
            table.push("<td class='inventoryValue'>" + img5 + tots["TwoWeeks"] + "%</td>");
            table.push("<td>2 Weeks</td>");
            table.push("</tr></table>");
            var $htm = $(table.join(" "));
            $(divID).append($htm);
        }
    }, ajaxError, null);

}

function getUpDownArrowImage(up) {
    var img = "";
    if (up) {
        img = "<img src='./images/up_green_arrow.png' width='12px' height='12px' />";
    } else {
        img = "<img src='./images/down_arrow_red.png' width='12px' height='12px' />";
    }
    return img;
}

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

function createTank(name, level, gl, x, y, color, height) {
    var html = $("<div/>");
    if (color === undefined) {
        color = "#E37222"
    }
    var border = "3px solid " + color;
    html.css({
        "height": height === undefined ? "100px" : height,
        "width": "100px",
        "border": border,
        "text-align": "center",
        "vertical-align": "middle",
        "position": "absolute",
        "top": y,
        "left": x
    });
    var nametext = $("<span/>");
    nametext.css({
        "font-weight": "bold",
        "font-size": "0.75em"
    });
    nametext.html(name);
    html.append(nametext);
    var lvl = $("<span/>");
    lvl.css({
        "font-size": "0.7em",
        "text-decoration": "underline"
    });
    lvl.text(level + "% Level");
    html.append("<br/>");
    html.append(lvl);

    var gltext = $("<span/>");
    gltext.css({
        "font-size": "0.7em",
        "text-decoration": "underline"
    });
    gltext.text(gl + " g/l");
    html.append("<br/>");
    html.append(gltext);

    return html;
}

function createRConnector(x, y, length) {
    var con = $("<div/>");
    y = y - 6;
    var xt = x + "px";
    var yt = y + "px";
    var lt = length + "px";
    var imgLen = length - 4;
    var img = $("<img/>", {
        "src": "./images/arrow_right.jpg"
    });
    img.css({
        "position": "absolute",
        "top": yt,
        "left": xt,
        "width": lt,
        "height": "12px",
        "text-align": "right",
        "vertical-align": "middle"
    });
    return img;
}

function createDConnector(x, y, length) {
    var con = $("<div/>");
    y = y - 6;
    var xt = x + "px";
    var yt = y + "px";
    var lt = length + "px";
    var imgLen = length - 4;
    var img = $("<img/>", {
        "src": "./images/arrow_down.jpg"
    });
    img.css({
        "position": "absolute",
        "top": yt,
        "left": xt,
        "width": "12px",
        "height": lt,
        "text-align": "right",
        "vertical-align": "middle"
    });
    return img;
}

function createVBar(x, y, height) {

    var xt = x + "px";
    var yt = y + "px";
    var ht = height + "px";

    var thing = $("<div/>");
    thing.css({
        "position": "absolute",
        "top": yt,
        "left": xt,
        "border": "1px solid #6898EA",
        "background-color": "#6898EA",
        "height": ht,
        "width": "2px"
    });
    return thing;
}


/*------------- HACKS -------------------------------------------*/

/* Canvas printing in IE HACK!!!!! */
(function($) {
    $.fn.CanvasHack = function() {
        var canvases = this.find('canvas').filter(function() {
            return $(this).css('position') == 'absolute';
        });

        canvases.wrap(function() {
            var canvas = $(this);
            var div = $('<div />').css({
                position: 'absolute',
                top: canvas.css('top'),
                left: canvas.css('left')
            });
            canvas.css({
                top: '0',
                left: '0'
            });
            return div;
        });

        return this;
    };
})(jQuery);
