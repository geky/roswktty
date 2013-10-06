/**
 * tty.js
 * Copyright (c) 2013-2014, Christopher Haster (MIT License)
 */

ROSManager = (function() {
  var bridge_port = 9001;
  var mjpeg_port = 9002;

  function ROSManager() {
    this.ros = new ROSLIB.Ros({
      url: 'ws://' + window.location.hostname + ':' + bridge_port
    });

    this.topics = []
  }

  ROSManager.prototype.mjpeg = function(topic, width, height, quality) {
    var url = 'http://' + window.location.hostname 
    url += ':' + mjpeg_port + '/stream';

    if (topic) url += '?topic=' + topic;
    if (width) url += '?width=' + width;
    if (height) url += '?height=' + height;
    if (quality) url += '?quality=' + quality;
    return url;
  }

  ROSManager.prototype.time = function() {
    return new Date().getTime();
  }

  ROSManager.prototype.subscribe = function(name, cb) {
    if (name.length < 1) return;
    if (name[0] != '/') name = '/' + name;

    var ref = { cb: cb };

    ref.name = name.match('[a-zA-Z0-9_/]*');
    if (ref.name) {
      ref.name = ref.name[0];
    } else {
      ref.name = '';
    }

    ref.field = name.substring(ref.name.length);
    ref.parse = Function('d', 'return d' + ref.field);


    var topic = this.topics[ref.name];

    if (topic) {
      topic.refs.push(ref);
      return ref;
    }

    topic = {
      topic: new ROSLIB.Topic({
        ros: this.ros,
        name: ref.name,
      }),
      refs: [ref],
    }

    console.log('subscribed: ' + ref.name);
    topic.topic.subscribe(function(data) {
      for (var i = 0; i < topic.refs.length; i++) {
        topic.refs[i].cb(topic.refs[i].parse(data));
      }
    });

    this.topics[ref.name] = topic;
    return ref;
  }

  ROSManager.prototype.unsubscribe = function(ref) {
    var topic = this.topics[ref.name];

    var ind = topic.refs.indexOf(ref);
    topic.refs.splice(ind, 1);

    if (topic.refs.length == 0) {
      console.log('unsubscribed: ' + ref.name);
      topic.topic.unsubscribe();
      delete this.topics[ref.name];
    }
  }

  ROSManager.prototype.gettopics = function(cb) {
    this.ros.getTopics(cb);
  }

  return ROSManager;
})();

var ros = new ROSManager();


var ROSPlot = (function() {

  var requestFrame = ( window.requestAnimationFrame       ||
                       window.webkitRequestAnimationFrame ||
                       window.mozRequestAnimationFrame    ||
                       window.oRequestAnimationFrame      ||
                       window.msRequestAnimationFrame     ||
                       function(callback) { setInterval(callback, 100); } );

  var colors = [ "#cc0000", "#4e9a06", "#c4a000", "#3465a4", 
                 "#75507b", "#06989a", "#d3d7cf", "#555753", 
                 "#ef2929", "#8ae234", "#fce94f", "#729fcf", 
                 "#ad7fa8", "#34e2e2", "#eeeeec" ];

  var stringize = function(value) {
    return ((value>0 ? ' ' : '') + value).substring(0, 5);
  }

  var cmds = {
    help: {
      help: 'shows basic commands',

      cmd: function(input) {
        this.title();
        this.paramize();

        if (input.length == 1) {
          this.plot(function(ctx) {
            ctx.fillStyle = '#f0f0f0'
            ctx.font = '12px monospace';

            var y = 12;
            ctx.fillText('Commands:', 0, y);

            for (var cmd in cmds) {
              ctx.fillText(cmd + ' - ' + cmds[cmd].help, 12, y += 12);
            }

            ctx.fillText('Fields can be specified like so:', 0, y += 24);
            ctx.fillText('/name/space/topic.field', 12, y += 12);
          });
        } else {
          this.plot(function(ctx) {
            ctx.fillStyle = '#f0f0f0'
            ctx.font = '12px monospace';

            var y = 12;
            ctx.fillText('Command ' + input[1] + ':', 0, y);

            var cmd = cmds[input[1]];
            ctx.fillText(cmd.help, 12, y += 12);

            if (cmd.param) {
              ctx.fillText('Params: ', 0, y += 24);
              for (var param in cmd.param) {
                ctx.fillText(param, 12, y += 12);
              }
            }
          });
        }
      }
    },

    set: {
      help: 'sets plot parameters',

      cmd: function(input) {
        if (input.length <= 2) return;

        this.param[input[1]] = eval(input[2]);
        this.render();
      }
    },

    topics: {
      help: 'lists available topics',

      cmd: function() {
        this.title();
        this.paramize();

        var self = this;
        var topics = []

        this.plot(function(ctx) {
          ctx.fillStyle = '#f0f0f0'
          ctx.font = '12px monospace';

          var y = 12;
          ctx.fillText('Topics:', 0, y);

          for (var i = 0; i < topics.length; i++) {
            ctx.fillText(topics[i], 12, y += 12);
          }
        });

        ros.gettopics(function(lookup) {
          topics = lookup;
          self.render();
        });
      }
    },

    echo: {
      help: 'echo raw topic data',

      cmd: function(input) {
        if (input.length <= 1) return;
        var topic = input[1];
        var ref;
        var message = {};

        this.title(topic);
        this.paramize();

        ref = ros.subscribe(topic, function (data) {
          message = data;
        });

        this.plot(function(ctx) {
          ctx.fillStyle = '#f0f0f0'
          ctx.font = '12px monospace';

          var y = 0;

          var echo = function(x, name, data) {
            if (data instanceof Array) {
              ctx.fillText(name + ': [' + data.join(', ') + ']', x, y += 12);
             
            } else if (data instanceof Object && !(data instanceof Array)) {
              ctx.fillText(name + ':', x, y += 12);

              for (var k in data) {
                echo(x + 12, k, data[k]);
              }
            } else {
              ctx.fillText(name + ': ' + data, x, y += 12);
            }
          }

          echo(0, topic, message);
        }, true);

        this.defer(function() {
          ros.unsubscribe(ref);
        });
      }
    },

    plot: {
      help: 'plots fields against time',

      param: {
        lines: true, 
        zero: true, 
        miny: null, maxy: null, 
        buffer: 5
      },

      cmd: function(input) {
        if (input.length <= 1) return;

        var topics;
        if (this.param._t_plot) {
          topics = this.param._topics;
        } else {
          topics = []
        }

        for (var i = 1; i < input.length; i++) {
          var topic = {
            name: input[i],
            color: colors[topics.length % colors.length],
            times: [],
            values: [],
          }

          !function(topic) {
            topic.ref = ros.subscribe(topic.name, function(data) {
              topic.times.push(ros.time());
              topic.values.push(data);
            })
          }(topic);

          topics.push(topic);
        }

        if (this.param._t_plot) return;

        this.title(topics[0].name);
        this.paramize(cmds.plot.param);

        this.param._t_plot = true;
        this.param._topics = topics;

        this.plot(function(ctx) {
          var min_y = 1;
          var max_y = this.height - 1;
          var min_x = 1;
          var max_x = this.width - 33;

          var max_value = -Infinity;
          var min_value = +Infinity;
          var max_time = ros.time();
          var min_time = max_time - (this.param.buffer)*1000;

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
              if (topic.values[ii] > max_value) {
                max_value = topic.values[ii];
              }

              if (topic.values[ii] < min_value) {
                min_value = topic.values[ii];
              }
            }
          }

          if (this.param.maxy != null) {
            max_value = this.param.maxy;
          }

          if (this.param.miny != null) {
            min_value = this.param.miny;
          }

          if (min_value == max_value) {
            max_value += 0.00001;
            min_value -= 0.00001;
          }

          ctx.lineWidth = 2;
          ctx.strokeStyle = '#555';
          ctx.beginPath();
          ctx.moveTo(max_x, min_y-3);
          ctx.lineTo(max_x, max_y+3);
          ctx.moveTo(min_x-3, max_y);
          ctx.lineTo(max_x+3, max_y);

          y = ~~((max_y-min_y)/2 + min_y);
          ctx.moveTo(max_x-3, min_y);
          ctx.lineTo(max_x+3, min_y);
          ctx.moveTo(max_x-3, y);
          ctx.lineTo(max_x+3, y);

          for (var i = 0; i < this.param.buffer; i++) {
            x = ~~((max_x-min_x) * (i/this.param.buffer) + min_x);
            ctx.moveTo(x, max_y-3);
            ctx.lineTo(x, max_y+3);
          }

          if (this.param.zero && max_value > 0 && min_value < 0) {
            var yy = (-min_value) / (max_value-min_value);
            yy = ((1-yy)*(max_y - min_y)) + min_y;
            ctx.moveTo(max_x+3, ~~yy);
            ctx.lineTo(min_x, ~~yy);
          }

          ctx.stroke();

          var value = (max_value-min_value)/2 + min_value;
          ctx.fillStyle = '#f0f0f0';
          ctx.font = '9px monospace';
          ctx.fillText(stringize(min_value), max_x+6, max_y);
          ctx.fillText(stringize(    value), max_x+6, y+3);
          ctx.fillText(stringize(max_value), max_x+6, min_y+6);

          for (var i = 0; i < topics.length; i++) {
            ctx.strokeStyle = topics[i].color;
            ctx.fillStyle = topics[i].color;
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

              if (this.param.lines) {
                if (ii == 0) {
                  ctx.moveTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
              } else {
                ctx.fillRect(~~x, ~~y, 2, 2);
              }
            }

            ctx.stroke();
            
            ctx.font = '12px monospace';
            ctx.fillText(topics[i].name, min_x, (i+1)*12 + min_y);
          }
        }, true);

        this.defer(function() {
          for (var i = 0; i < topics.length; i++) {
            ros.unsubscribe(topics[i].ref);
          }
        });
      }
    },

    plot2: {
      help: 'plots one field against another',

      param: {
        lines: true, 
        zero: true, 
        miny: null, maxy: null, 
        minx: null, maxx: null, 
        buffer: 5
      },

      cmd: function(input) {
        if (input.length <= 2) return;

        var topics;
        if (this.param._t_plot2) {
          topics = this.param._topics;
        } else {
          topics = []
        }

        for (var i = 1; i < input.length; i+=2) {
          var pair = {
            xname: input[i],
            yname: input[i+1],
            color: colors[topics.length % colors.length],
            times: [],
            xs: [],
            ys: []
          }

          var sub = function(name, times, mine, other) {
            return ros.subscribe(name, function(data) {
              if (mine.length < other.length) {
                times[mine.length-1] = ros.time();
                mine.push(data);
              } else if (mine.length > other.length) {
                times[mine.length-1] = ros.time();
                mine[mine.length-1] = data;
              } else {
                times.push(ros.time());
                mine.push(data);
              }
            });
          }

          pair.xref = sub(pair.xname, pair.times, pair.xs, pair.ys);
          pair.yref = sub(pair.yname, pair.times, pair.ys, pair.xs);
          topics.push(pair);
        }

        if (this.param._t_plot2) return;

        this.title(topics[0].xname);
        this.paramize(cmds.plot2.param);

        this.param._t_plot2 = true;
        this.param._topics = topics;

        this.plot(function(ctx) {
          var min_y = 1;
          var max_y = this.height - 10;
          var min_x = 33;
          var max_x = this.width - 1;

          var max_vx = -Infinity;
          var min_vx = +Infinity;
          var max_vy = -Infinity;
          var min_vy = +Infinity;

          var min_time = ros.time() - (this.param.buffer)*1000;

          var x, y;

          for (var i = 0; i < topics.length; i++) {
            var pair = topics[i];

            while (pair.times.length > 0 && 
                   pair.times[0] < min_time-1000) {
              pair.times.shift();
              pair.xs.shift();
              pair.ys.shift();
            }

            for (var ii = 0; ii < pair.times.length; ii++) {
              if (pair.xs[ii] > max_vx) {
                max_vx = pair.xs[ii];
              }

              if (pair.xs[ii] < min_vx) {
                min_vx = pair.xs[ii];
              }

              if (pair.ys[ii] > max_vy) {
                max_vy = pair.ys[ii];
              }

              if (pair.ys[ii] < min_vy) {
                min_vy = pair.ys[ii];
              }
            }
          }

          if (this.param.maxx != null) {
            max_vx = this.param.maxx;
          }

          if (this.param.minx != null) {
            min_vx = this.param.minx;
          }

          if (this.param.maxy != null) {
            max_vy = this.param.maxy;
          }

          if (this.param.miny != null) {
            min_vy = this.param.miny;
          }

          if (min_vx == max_vx) {
            max_vx += 0.00001;
            min_vx -= 0.00001;
          }

          if (min_vy == max_vy) {
            max_vy += 0.00001;
            min_vy -= 0.00001;
          }

          ctx.lineWidth = 2;
          ctx.strokeStyle = '#555';
          ctx.beginPath();
          ctx.moveTo(min_x, min_y-3);
          ctx.lineTo(min_x, max_y+3);
          ctx.moveTo(min_x-3, max_y);
          ctx.lineTo(max_x+3, max_y);

          x = ~~((max_x-min_x)/2 + min_x);
          ctx.moveTo(max_x, max_y-3);
          ctx.lineTo(max_x, max_y+3);
          ctx.moveTo(x, max_y-3);
          ctx.lineTo(x, max_y+3);

          y = ~~((max_y-min_y)/2 + min_y);
          ctx.moveTo(min_x-3, min_y);
          ctx.lineTo(min_x+3, min_y);
          ctx.moveTo(min_x-3, y);
          ctx.lineTo(min_x+3, y);

          if (this.param.zero && max_vx > 0 && min_vx < 0) {
            var xx = (-min_vx) / (max_vx-min_vx);
            xx = ((1-xx)*(max_x - min_x)) + min_x;
            ctx.moveTo(~~xx, max_y+3);
            ctx.lineTo(~~xx, min_y);
          }

          if (this.param.zero && max_vy > 0 && min_vy < 0) {
            var yy = (-min_vy) / (max_vy-min_vy);
            yy = ((1-yy)*(max_y - min_y)) + min_y;
            ctx.moveTo(min_x-3, ~~yy);
            ctx.lineTo(max_x, ~~yy);
          }

          ctx.stroke();

          var valuex = (max_vx-min_vx)/2 + min_vx;
          var valuey = (max_vy-min_vy)/2 + min_vy;
          ctx.fillStyle = '#f0f0f0';
          ctx.font = '9px monospace';

          ctx.fillText(stringize(min_vx),    min_x, max_y+10);
          ctx.fillText(stringize(valuex),     x-15, max_y+10);
          ctx.fillText(stringize(max_vx), max_x-24, max_y+10);

          ctx.fillText(stringize(min_vy), min_x-33, max_y);
          ctx.fillText(stringize(valuey), min_x-33, y+3);
          ctx.fillText(stringize(max_vy), min_x-33, min_y+6);

          for (var i = 0; i < topics.length; i++) {
            ctx.strokeStyle = topics[i].color;
            ctx.fillStyle = topics[i].color;
            ctx.beginPath();

            for (var ii = 0; ii < topics[i].times.length; ii++) {
              var vx = topics[i].xs[ii];
              var vy = topics[i].ys[ii];

              vx = (vx-min_vx) / (max_vx-min_vx);
              vy = (vy-min_vy) / (max_vy-min_vy);

              x = (vx*(max_x - min_x))+min_x;
              y = ((1-vy)*(max_y - min_y))+min_y;

              if (this.param.lines) {
                if (ii == 0) {
                  ctx.moveTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
              } else {
                ctx.fillRect(~~x, ~~y, 2, 2);
              }
            }

            ctx.stroke();
            
            ctx.font = '12px monospace';
            ctx.fillText(topics[i].xname, min_x+6, i*24+12 + min_y);
            ctx.fillText(topics[i].yname, min_x+6, i*24+24 + min_y);
          }
        }, true);

        this.defer(function() {
          for (var i = 0; i < topics.length; i++) {
            ros.unsubscribe(topics[i].xref);
            ros.unsubscribe(topics[i].yref);
          }
        });
      }
    },

    watch: {
      help: 'renders image in realtime',

      param: {
        quality: 90,
      },

      cmd: function(input) {
        if (input.length <= 1) return;
        var topic = input[1];
        var image = new Image();

        this.title(topic);
        this.paramize(cmds.watch.param);

        this.plot(function(ctx) {
          image.src = ros.mjpeg(topic, this.width, this.height,
                                this.param.quality);
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

    this._defered = [];

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

  ROSPlot.prototype.defer = function(fn) {
    this._defered.push(fn);
  }

  ROSPlot.prototype.clean = function() {
    for (var i=0; i < this._defered.length; i++) {
      this._defd = this._defered[i];
      this._defd();
    }

    this._defered = [];

    delete this._plot;
    delete this._cmd;
    delete this._animate;
  }

  ROSPlot.prototype.plot = function(plot, animate) {
    this.clean();
    this._plot = plot;

    if (animate) {
      this.animate(plot);
    }
  }

  ROSPlot.prototype.animate = function(animate) {
    var self = this;
    this._animate = animate;

    var frame = function() {
      if (self._animate) {
        // Clear the canvas
        self.canvas.width = self.canvas.width;

        self._animate(self.context);
        requestFrame(frame);
      }
    }

    requestFrame(frame);
  }
        
  ROSPlot.prototype.paramize = function(param) {
    this.param = {};
    for (var k in param) {
      this.param[k] = param[k];
    }
  }

  return ROSPlot;
})();
