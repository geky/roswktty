/**
 * tty.js
 * Copyright (c) 2013-2014, Christopher Haster (MIT License)
 */

var ROSPlot = (function() {
  var ros = new ROSLIB.Ros({
    url: 'ws://' + window.location.hostname + ':9001'
  });

  var mjpeg = 'http://' + window.location.hostname + ':9002/stream';


  var time = function() {
    return new Date().getTime();
  };


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

        for (var i = 1; i < input.length; i++) {
          topics[i-1] = {
            topic: input[i],
            color: '#ae3030',
            times: [],
            values: []
          };
        }

        var buffer = 5;

        if (topics.length > 1) {
          this.title(topics[0].topic + '...');
        } else {
          this.title(topics[0].topic);
        }

        var draw = function(ctx) {
          var off = 3;
          var min_y = off;
          var max_y = this.height - off;
          var min_x = off;
          var max_x = this.width - off*9;

          ctx.lineWidth = 2;
          ctx.strokeStyle = '#555';
          ctx.beginPath();
          ctx.moveTo(max_x, min_y-off);
          ctx.lineTo(max_x, max_y+off);
          ctx.moveTo(min_x-off, max_y);
          ctx.lineTo(max_x+off, max_y);

          var y = ~~((max_y-min_y)/2 + min_y);
          ctx.moveTo(max_x-off, min_y);
          ctx.lineTo(max_x+off, min_y);
          ctx.moveTo(max_x-off, y);
          ctx.lineTo(max_x+off, y);

          for (var i = 0; i < buffer; i++) {
            var x = ~~((max_x-min_x) * (i/buffer) + min_x);
            ctx.moveTo(x, max_y-off);
            ctx.lineTo(x, max_y+off);
          }

          ctx.stroke();

          ctx.fillStyle = '#f0f0f0';
          ctx.font = '9px monospace';
          ctx.fillText(0+'', max_x+2*off, max_y+off);
          ctx.fillText(0.02 + '', max_x+2*off, y+off);
          ctx.fillText(2.74839+'', max_x+2*off, min_y+off);
        }

        this.animate(draw);
        this.plot(draw);
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
          var src = mjpeg;
          src += '?topic=' + topic;
          src += '?width=' + this.width;
          src += '?height=' + this.height;
          image.src = src;
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

    this.defered = [];

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
    for (var i=0; i < this.defered.length; i++) {
      this._defd = this.defered[i];
      this._defd();
      delete this._defd;
    }

    this.defered = [];

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
