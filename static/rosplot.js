/**
 * tty.js
 * Copyright (c) 2013-2014, Christopher Haster (MIT License)
 */

var ROSPlot = (function() {
  var ros = new ROSLIB.Ros({
    url: 'ws://' + window.location.hostname + ':9001'
  });

  var mjpeg = 'http://' + window.location.hostname + ':9002/stream';

  var animate = (
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback) {
      setInterval(callback, 100);
    }
  );


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
      cmd: function() {}
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
        var ctx = this.context;
        var width;
        var height;

        this.title(topic);

        this.plot(function(ctx) {
          width = this.width;
          height = this.height;

          var src = mjpeg;
          src += '?topic=' + topic;
          src += '?width=' + width;
          src += '?height=' + height;
          image.src = src;
        });

        var draw = function() {
          if (!image || image.width * image.height <= 0) {
            ctx.fillStyle = '#f0f0f0';
            ctx.font = '12px monospace';
            ctx.fillText('Stream Error!!', 12, 12);
          } else {
            ctx.drawImage(image, 0, 0, width, height);
          }

          if (ctx) animate(draw);
        }

        this.defered.push(function() {
          ctx = null;
        });

        draw();
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
      this.defered[i]();
    }

    this.defered = [];
  }

  ROSPlot.prototype.plot = function(plot) {
    this.clean();
    this._plot = plot;
  }

  return ROSPlot;
})();
