/**
 * tty.js
 * Copyright (c) 2013-2014, Christopher Haster (MIT License)
 */

var ROSPlot = (function() {
  var ros = {
    ros: new ROSLIB.Ros({
      url: 'ws://' + window.location.hostname + ':9001'
    }),

    mjpeg: function(topic, width, height) {
      var url = 'http://' + window.location.hostname + ':9002/stream';
      if (topic) url += '?topic=' + topic;
      if (width) url += '?width=' + width;
      if (height) url += '?height=' + height;
      return url;
    },

    time: function() {
      return new Date().getTime();
    },

    subscribe: function(name, cb) {
      var topics = this.topics;
      var ros = this.ros;

      if (name.length < 1) return;
      if (name[0] != '/') name = '/' + name;

      var ref = {
        name: name,
        fields: [],
        cb: cb
      }

      ros.getTopics(function(names) {
        var name = ''

        for (var i = 0; i < names.length; i++) {
          var m = ref.name.match(names[i]);

          if (m && m[0].length > name.length) {
            name = m[0];
          }
        }

        ref.fields = ref.name.substring(name.length+1)
        if (ref.fields.length == 0) {
          ref.fields = [];
        } else {
          ref.fields = ref.fields.split('/');
        }

        ref.name = name;

        var topic = topics[name];

        if (topic) {
          topic.refs.push(ref);
          return;
        }

        topic = {
          topic: new ROSLIB.Topic({
            ros: ros,
            name: name,
          }),
          refs: [ref],
        }

        console.log('subscribed: ' + name);
        topic.topic.subscribe(function(data) {
          for (var i = 0; i < topic.refs.length; i++) {
            var ref = topic.refs[i];

            var field = data;
            for (var ii = 0; ii < ref.fields.length; ii++) {
              field = field[ref.fields[ii]];
            }

            ref.cb(field);
          }
        });

        topics[name] = topic;
      });

      return ref;
    },

    unsubscribe: function(ref) {
      var topic = this.topics[ref.name];

      var ind = topic.refs.indexOf(ref);
      topic.refs.splice(ind, 1);

      if (topic.refs.length == 0) {
        console.log('unsubscribed: ' + ref.name);
        topic.topic.unsubscribe();
        delete this.topics[ref.name];
      }
    },

    topics: {},
  }

  var colors = ["#2e3436", "#cc0000", "#4e9a06", "#c4a000",
                "#3465a4", "#75507b", "#06989a", "#d3d7cf",
                "#555753", "#ef2929", "#8ae234", "#fce94f",
                "#729fcf", "#ad7fa8", "#34e2e2", "#eeeeec"];


  // Possible commands
  var cmds = {
    help: {
      help: 'shows basic commands',

      cmd: function() {
        this.title('');

        this.plot(function(ctx) {
          ctx.fillStyle = '#f0f0f0'
          ctx.font = '12px monospace';

          var y = 12;
          ctx.fillText('Commands:', 0, y);

          for (var cmd in cmds) {
            ctx.fillText(cmd + ' - ' + cmds[cmd].help, 12, y += 12);
          }

          ctx.fillText('Params can be specified like so:', 0, y += 24);
          ctx.fillText('/name/space/topic.param', 12, y += 12);
        });
      }
    },

    plot: {
      help: 'plots params against time',

      cmd: function(input) {
        if (input.length <= 1) return;

        var topics = [];
        var buffer = 5;

        for (var i = 1; i < input.length; i++) {
          topics[i-1] = {
            name: input[i],
            color: colors[i % colors.length],
            times: [],
            values: [],
          }
        }

        this.title(topics[0].name);

        var draw = function(ctx) {
          var off = 3;
          var min_y = 1;
          var max_y = this.height - 1;
          var min_x = 1;
          var max_x = this.width - 27;

          var max_value = -Infinity;
          var min_value = +Infinity;
          var max_time = ros.time();
          var min_time = max_time - (buffer)*1000;

          var x, y;

          for (var i = 0; i < topics.length; i++) {
            var topic = topics[i];

            while (topic.times.length > 0 && 
                   topic.times[0] < min_time-1000) {
              topic.times.shift();
              topic.values.shift();
            }

            while (topic.times.length > 1 && 
                   topic.times[0] == topic.times[1]) {
              topic.times.shift();
              topic.values.shift();
            } 

            for (var ii = 0; ii < topic.values.length; ii++) {
              var value = topic.values[ii];

              if (value > max_value) {
                max_value = value;
              }

              if (value < min_value) {
                min_value = value;
              }
            }
          }

          if (min_value == max_value) {
            max_value += 0.00001;
            min_value -= 0.00001;
          }

          ctx.lineWidth = 2;
          ctx.strokeStyle = '#555';
          ctx.beginPath();
          ctx.moveTo(max_x, min_y-off);
          ctx.lineTo(max_x, max_y+off);
          ctx.moveTo(min_x-off, max_y);
          ctx.lineTo(max_x+off, max_y);

          y = ~~((max_y-min_y)/2 + min_y);
          ctx.moveTo(max_x-off, min_y);
          ctx.lineTo(max_x+off, min_y);
          ctx.moveTo(max_x-off, y);
          ctx.lineTo(max_x+off, y);

          for (var i = 0; i < buffer; i++) {
            x = ~~((max_x-min_x) * (i/buffer) + min_x);
            ctx.moveTo(x, max_y-off);
            ctx.lineTo(x, max_y+off);
          }

          ctx.stroke();

          x = (max_value-min_value)/2 + min_value;
          ctx.fillStyle = '#f0f0f0';
          ctx.font = '9px monospace';
          ctx.fillText(String(min_value).substring(0,4), 
                       max_x+2*off, max_y);
          ctx.fillText(String(x).substring(0,4), 
                       max_x+2*off, y+off);
          ctx.fillText(String(max_value).substring(0,4), 
                       max_x+2*off, min_y+2*off);

          for (var i = 0; i < topics.length; i++) {
            ctx.strokeStyle = topics[i].color;
            ctx.beginPath();

            var prev_time = min_time;

            for (var ii = 0; ii < topics[i].values.length; ii++) {
              var v = topics[i].values[ii];
              var t = topics[i].times[ii];

              var count = 0;
              for (var iii = ii; iii < topics[i].values.length; iii++) { 
                if (topics[i].times[iii] == t) {
                  count++;
                } else {
                  break;
                }
              }

              t -= (t-prev_time) * (count-1) / count;
              prev_time = t;

              v = (v-min_value) / (max_value-min_value);
              t = (t-min_time) / (max_time-min_time);

              x = (t*(max_x - min_x))+min_x;
              y = ((1-v)*(max_y - min_y))+min_y;

              if (ii == 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }

            ctx.stroke();
            
            ctx.fillStyle = topics[i].color;
            ctx.font = '12px monospace';
            ctx.fillText(topics[i].name, min_x, (i+1)*12 + min_y);
          }
        }

        this.plot(draw);
        this.animate(draw);

        for (var i = 0; i < topics.length; i++) {
          var ref;

          (function(topic) {
            ref = ros.subscribe(topic.name, function(data) {
              topic.times.push(ros.time());
              topic.values.push(data);
            })
          })(topics[i]);

          this.topics.push(ref);
        }
      }
    },

    plot2: {
      help: 'plots one param against another',
      cmd: function() {}
    },

    watch: {
      help: 'renders image in realtime',

      cmd: function(input) {
        if (input.length <= 1) return;
        var topic = input[1];
        var image = new Image();

        this.title(topic);

        this.plot(function(ctx) {
          image.src = ros.mjpeg(topic, this.width, this.height);
        });

        this.animate(function(ctx) {
          if (!image || image.width * image.height <= 0) {
            ctx.fillStyle = '#f0f0f0';
            ctx.font = '12px monospace';
            ctx.fillText('No Stream!', 12, 12);
          } else {
            ctx.drawImage(image, 0, 0, this.width, this.height);
          }
        });
      }
    }
  }


  function ROSPlot(canvas, title) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.title = title || function() {};

    this.topics = [];

    this.command('help');
  }

  ROSPlot.prototype.command = function(input) {
    input = input.split(' ');
    if (input.length == 0) return;

    var cmd = cmds[input[0]];

    if (cmd) {
      this._cmd = cmd.cmd;
      this._cmd(input);
    }

    this.render();
  }

  ROSPlot.prototype.render = function() {
    // Clear the canvas
    this.canvas.width = this.canvas.width;

    // Update dimensions
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    if (this._plot) {
      this._plot(this.context);
    }
  }

  ROSPlot.prototype.clean = function() {
    for (var i=0; i < this.topics.length; i++) {
      ros.unsubscribe(this.topics[i]);
    }

    this.topics = [];

    delete this._plot;
    delete this._cmd;
    delete this._animate;
  }

  ROSPlot.prototype.plot = function(plot) {
    this.clean();
    this._plot = plot;
  }

  ROSPlot.prototype.animate = function(plot) {
    this._animate = plot;
    var self = this;

    var requestAnim = (
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function(callback) {
        setInterval(callback, 100);
      }
    );

    var draw = function() {
      if (self._animate) {
        // Clear the canvas
        self.canvas.width = self.canvas.width;

        // Call ourselves in through the closure
        self._animate(self.context);
        requestAnim(draw);
      }
    }

    requestAnim(draw);
  }

  return ROSPlot;
})();
