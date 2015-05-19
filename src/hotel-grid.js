/**
 * Created by featZima
 * Author: featzima@gmail.com
 * Date: 15.11.2013
 */

var GroupModel = function(title) {
    this.title = title;
};

var RoomModel = function(group, category, title) {
    this.group = group;
    this.category = category;
    this.title = title;
};

var RecordModel = function(id, room, from, to, guest) {
    this.id = id;
    this.room = room;
    this.from = moment(from);
    this.to = moment(to);
    this.guest = guest;
};

var HotelGridModel = function(params) {
    this.containerSelector = params.container;
    this.container = document.querySelector(this.containerSelector);
    this.groups = [];
    this.rooms = [];
    this.records = [];
    this.viewOptions = {
        grid: {},
        cellWidth: 45,
        cellHeight: 40,
        monthHeaderHeight: 30,
        daysHeaderHeight: 30,
        time_start: params.from || moment().subtract(6, 'months'),
        time_end: params.to || moment().add(6, 'months')
    };
    this.viewTemplates = {
        record: _.template('<div class="room-state__guest"><%= days %> : <%= guest %></div>')
    };
    this.renderBaseHtml();
};

// Room groups api
HotelGridModel.prototype.addRoomGroup = function (title) {
    this.groups.push(new GroupModel(title));
};

HotelGridModel.prototype.getRoomGroup = function (title) {
    return _.find(this.groups, function(group) {
        return group.title == title;
    }, this);
};

// Rooms api
HotelGridModel.prototype.addRoom = function (groupTitle, category, titles) {
    var group = this.getRoomGroup(groupTitle);
    _.each(titles, function(title) {
        this.rooms.push(new RoomModel(group, category, title));
    }, this);
};

HotelGridModel.prototype.getRoom = function (title) {
    return _.find(this.rooms, function(room) {
        return room.title == title;
    }, this);
};

HotelGridModel.prototype.getRoomsForGroup = function (groupTitle) {
    return _.filter(this.rooms, function(room) {
        return room.group.title == groupTitle;
    }, this);
};

HotelGridModel.prototype.getRecordsForRoom = function (room) {
    return _.filter(this.records, function(record) {
        return record.room == room;
    }, this);
};

// Records api
HotelGridModel.prototype.addRecord = function(record) {
    var room = this.getRoom(record.room);
    this.records.push(new RecordModel(record.id, room, record.from, record.to, record.guest));
};

// View api
HotelGridModel.prototype.scrollTo = function(scrollDate) {
    var content = this.holder.content,
        recordsLayer = this.holder.recordsLayer;

    var daysOffset = scrollDate.diff(this.viewOptions.time_start, 'days');
    var daysInView = content.offsetWidth / this.viewOptions.cellWidth;

    recordsLayer.scrollLeft = parseInt(daysOffset - daysInView / 2) * this.viewOptions.cellWidth;
};

HotelGridModel.prototype.renderBaseHtml = function() {
    var legend = document.createElement('div');
    legend.className = 'hotel-grid__legend';
    this.container.appendChild(legend);

    var content = document.createElement('div');
    content.className = 'hotel-grid__content';
    this.container.appendChild(content);

    var canvasLayer = document.createElement('canvas');
    canvasLayer.className = 'hotel-grid__canvas-layer';
    content.appendChild(canvasLayer);

    var recordsLayer = document.createElement('div');
    recordsLayer.className = 'hotel-grid__records-layer';
    content.appendChild(recordsLayer);

    var records = document.createElement('div');
    records.className = 'hotel-grid__records';
    recordsLayer.appendChild(records);

    this.holder = {
        legend: legend,
        content: content,
        canvasLayer: canvasLayer,
        recordsLayer: recordsLayer,
        records: records,
        context: canvasLayer.getContext('2d')
    };

    this.adaptInnerSizes();
    this.bindToUI();
};

HotelGridModel.prototype.bindToUI = function() {
    var that = this;
    this.holder.recordsLayer.addEventListener('scroll', function () {
        that.renderCanvas();
    })
};

HotelGridModel.prototype.adaptInnerSizes = function () {
    var canvas  = this.holder.canvasLayer,
        content = this.holder.content,
        records = this.holder.records,
        legend  = this.holder.legend;

    canvas.width = content.offsetWidth;
    canvas.height = content.offsetHeight;

    var contentWidth = (this.viewOptions.time_end.diff(this.viewOptions.time_start, 'days') + 1) * this.viewOptions.cellWidth;
    records.style.width = contentWidth + 'px';

    legend.style.paddingBottom = this.getScrollbarWidth() + 'px';
};

HotelGridModel.prototype.getScrollbarWidth = function () {
    // try get scroll bar width from holder
    if (this.holder.scrollBarWidth) return this.holder.scrollBarWidth;

    // in fail calculate scroll bar width
    var outer = document.createElement("div");
    outer.style.visibility = "hidden";
    outer.style.width = "100px";
    outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps

    document.body.appendChild(outer);

    var widthNoScroll = outer.offsetWidth;
    // force scrollbars
    outer.style.overflow = "scroll";

    // add inner div
    var inner = document.createElement("div");
    inner.style.width = "100%";
    outer.appendChild(inner);

    var widthWithScroll = inner.offsetWidth;

    // remove divs
    outer.parentNode.removeChild(outer);

    this.holder.scrollBarWidth = widthNoScroll - widthWithScroll;
    return this.holder.scrollBarWidth;
};

HotelGridModel.prototype.fillGrid = function(offsetX, offsetY) {
    var context = this.holder.context,
        canvas  = this.holder.canvasLayer;

    var offsetYY = this.viewOptions.daysHeaderHeight + this.viewOptions.monthHeaderHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#fff';
    context.fillRect(0,0,canvas.width,canvas.height);

    context.strokeStyle = '#f0f0f0';
    // horizontal lines
    for (y = offsetY + 0.5 + offsetYY; y < canvas.height; y += this.viewOptions.cellHeight) {
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
        context.closePath();
        context.stroke();
    }

    // vertical lines
    for (x = offsetX + 0.5; x < canvas.width; x += this.viewOptions.cellWidth) {
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x, offsetYY);
        context.lineTo(x, canvas.height);
        context.closePath();
        context.stroke();
    }

};

HotelGridModel.prototype.drawMonthsHeader = function(offsetX) {
    var context = this.holder.context,
        canvas  = this.holder.canvasLayer;

    var firstMonth = this.viewOptions.time_start.clone().date(1);

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = "#777";
    context.font = "normal 14px Arial";

    while (!firstMonth.isAfter(this.viewOptions.time_end)) {
        var offsetDays  = firstMonth.clone().date(15).diff(this.viewOptions.time_start, 'days');
        var offsetPixels = offsetDays * this.viewOptions.cellWidth;

        context.fillText(firstMonth.format("MMMM / YYYY"), offsetPixels - offsetX, this.viewOptions.cellHeight / 2);

        var offsetDaysBegin  = firstMonth.clone().date(3).diff(this.viewOptions.time_start, 'days');
        var offsetPixelsBegin = offsetDaysBegin * this.viewOptions.cellWidth;
        context.fillText(firstMonth.format("MMMM / YYYY"), offsetPixelsBegin - offsetX, this.viewOptions.cellHeight / 2);

        var offsetDaysEnd  = firstMonth.clone().date(26).diff(this.viewOptions.time_start, 'days');
        var offsetPixelsEnd = offsetDaysEnd * this.viewOptions.cellWidth;
        context.fillText(firstMonth.format("MMMM / YYYY"), offsetPixelsEnd - offsetX, this.viewOptions.cellHeight / 2);

        firstMonth.add(1, 'M');
    }
};

HotelGridModel.prototype.drawDaysHeader = function(offsetX) {
    var context = this.holder.context,
        canvas  = this.holder.canvasLayer;

    var offsetY = this.viewOptions.monthHeaderHeight;
    var allDays = this.viewOptions.time_end.diff(this.viewOptions.time_start, 'days');
    var firstDay = parseInt(offsetX / this.viewOptions.cellWidth);
    var lastDay = firstDay + parseInt(canvas.width / this.viewOptions.cellWidth);

    context.fillStyle = "#777";
    context.font = "normal 14px Arial";
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    for (i = firstDay; i <= lastDay ; i++) {
        var currentDay = moment(this.viewOptions.time_start);
        currentDay.add(i, 'days');
        if (currentDay.day() >= 5) {
            context.fillStyle = "#0099CC";
            context.font = "bold 14px Arial";
        } else {
            context.fillStyle = "#777";
            context.font = "normal 14px Arial";
        }
        context.fillText(currentDay.date(),
            i * this.viewOptions.cellWidth - offsetX + this.viewOptions.cellWidth / 2,
            offsetY + this.viewOptions.cellHeight / 2);
    }
};

HotelGridModel.prototype.renderCanvas = function() {
    var records = this.holder.recordsLayer;

    var offsetX = this.viewOptions.cellWidth - records.scrollLeft % this.viewOptions.cellWidth;
    var offsetY = this.viewOptions.cellHeight - records.scrollTop % this.viewOptions.cellHeight;

    this.fillGrid(offsetX, 0);
    this.drawMonthsHeader(records.scrollLeft);
    this.drawDaysHeader(records.scrollLeft);
};

HotelGridModel.prototype.renderData = function() {
    // save link to HTML node for more convenience
    var legend = this.holder.legend;

    // clear previous legend
    while (legend.lastChild) {
        legend.removeChild(legend.lastChild);
    }

    // calculate top padding for place legend on one level with records layer
    var topPadding = this.viewOptions.daysHeaderHeight + this.viewOptions.monthHeaderHeight;

    _.each(this.groups, function(group, groupIndex) {
        var groupNode = document.createElement('div');
        groupNode.className = 'group-title';
        groupNode.title = group.title;
        groupNode.innerText = group.title;
        legend.appendChild(groupNode);

        topPadding += this.viewOptions.cellHeight;

        _.each(this.getRoomsForGroup(group.title), function(room, roomIndex) {
            var roomNode = document.createElement('div');
            roomNode.className = 'room-title';
            roomNode.title = room.category + ' ' + room.title;
            roomNode.innerText = room.category + ' ' + room.title;
            legend.appendChild(roomNode);

            _.each(this.getRecordsForRoom(room), function(record) {
                var left = moment(record.from).diff(this.viewOptions.time_start, 'days') * this.viewOptions.cellWidth + this.viewOptions.cellWidth / 2;
                var days = moment(record.to).diff(moment(record.from), 'days');
                var width = days * this.viewOptions.cellWidth - 1;

                var recordNode = document.createElement('div');
                recordNode.setAttribute('data-id', record.id);
                recordNode.className = "room-state booked";
                recordNode.innerHTML = this.viewTemplates.record({days: days, guest: record.guest});
                recordNode.style.top = topPadding + 'px';
                recordNode.style.left = left + 'px';
                recordNode.style.width = width + 'px';

                this.holder.records.appendChild(recordNode);
            }, this);

            topPadding += this.viewOptions.cellHeight;
        }, this);
    }, this);

    this.adaptInnerSizes();
    this.renderCanvas();
};