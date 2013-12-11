/**
 * ROSRRange radial range renderer
 * Copyright (c) 2013-2014, Christopher Haster (MIT License)
 */

var ROSRRange = (function() {
    function stringize(value) {
       return ((value>0 ? ' ' : '') + value).substring(0, 5); 
    }                                                          

    function ROSRRange(ros, topics) {
        this.ros = ros
        this.topics = []

        this.max = null
        this.min = null
        this.buffer = 5

        if (topics instanceof Array) {
            for (var i = 0; i < topics.length; i++) {
                this.addplot(topics[i])
            }
        } else {
            this.addplot(topics)
        }
    }

    ROSRRange.prototype.addplot = function(name) {
        var self = this
        var topics = this.topics
        var ros = this.ros

        var topic = {
            name: name,
            values: [],
            color: ros.colors[this.topics.length % ros.colors.length],
        }

        topic.ref = ros.subrange(topic.name, function(data) {
            for (var i = 0; i < data.length; i++) {
                if (!this.buffer || !topic.values[i]) {
                    topic.values[i] = data[i]
                } else {
                    var ratio = self.buffer * 60
                    topic.values[i] = topic.values[i] * ((ratio-1)/ratio) +
                                     data * (1/ratio)
                }
            }
        }, function(newname) {
            console.log('-> ' + newname)
            self.addplot(newname)
        }, function() {
            topics.splice(topics.indexOf(topic), 1)
            ros.unsubscribe(topic.ref)
        })

        topics.push(topic)

        if (topics.length == 1)
            this.title = topic.name
    }

    ROSRRange.prototype.render = function(ctx) {
        var topics = this.topics
        var ros = this.ros

        var min_y = 1
        var max_y = ctx.height - 12
        var min_x = 5
        var max_x = ctx.width - 5

        var center = ctx.width / 2
        var max_r = ~~((max_x-min_x)/2)
        if (max_y-min_y < max_r) max_r = max_y-min_y

        min_x = center - max_r
        max_x = center + max_r

        var max_value = -Infinity
        var min_value = +Infinity

        var x, y;
        var count = 0

        for (var i = 0; i < topics.length; i++) {
            count += topics[i].values.length

            for (var ii = 0; ii < topics[i].values.length; ii++) {
                if (topics[i].values[ii] > max_value)
                    max_value = topics[i].values[ii]

                if (topics[i].values[ii] < min_value)
                    min_value = topics[i].values[ii]
            }
        }

        if (this.max != null)
            max_value = this.max

        if (this.min != null)
            min_value = this.min

        if (min_value == max_value) {
            max_value += 0.00001
            min_value -= 0.00001
        }

        ctx.lineWidth = 2
        ctx.strokeStyle = '#555'
        ctx.beginPath()
        ctx.moveTo(max_x, max_y)
        ctx.lineTo(min_x, max_y)
        ctx.arc(center, max_y, max_r, Math.PI, 2*Math.PI);
        ctx.stroke()

        ctx.fillStyle = '#f0f0f0'
        ctx.font = '9px monospace'
        ctx.fillText(stringize(max_value), min_x+6, max_y+9)
        ctx.fillText(stringize(min_value), center, max_y+9)
        ctx.fillText(stringize(max_value), max_x-33, max_y+9)

        var width = Math.PI / count
        count = 0

        for (var i = 0; i < topics.length; i++, count++) {
            ctx.strokeStyle = topics[i].color
            ctx.fillStyle = topics[i].color

            ctx.beginPath();
            ctx.moveTo(center, max_y)

            for (var ii = 0; ii < topics[i].values.length; ii++, count++) {
                ctx.arc(center, max_y, 
                        max_r * (topics[i].values[ii]/max_value), 
                        (count  )*width + Math.PI, 
                        (count+1)*width + Math.PI);
            }

            ctx.fill()

            ctx.font = '12px monospace'
            ctx.fillText(topics[i].name, min_x, (i+1)*12 + min_y)
        }
    }

    ROSRRange.prototype.destroy = function() {
        for (var i = 0; i < this.topics.length; i++) {
            ros.unsubscribe(this.topics[i].ref)
        }
    }

    return ROSRRange
})();
