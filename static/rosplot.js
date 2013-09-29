/**
 * tty.js
 * Copyright (c) 2013-2014, Christopher Haster (MIT License)
 */

var ROSPlot = (function() {
  var ros = new ROSLIB.Ros({
    url: 'ws://' + window.location.hostname + ':9001'
  });

  // Possible plots
  function help_plot(ctx) {
    ctx.fillStyle = '#f0f0f0'
    ctx.font = '12px monospace';

    var y = 12;
    ctx.fillText('Commands:', 0, y);

    for (var cmd in cmds) {
      ctx.fillText(cmd + ' - ' + cmds[cmd].help, 12, y += 12);
    }

    ctx.fillText('Params can be specified like so:', 0, y += 24);
    ctx.fillText('/name/space/topic.param', 12, y += 12);
  }

  // Possible commands
  var cmds = {
    help: {
      help: 'shows basic commands',
      cmd: function() {
        this.plot(help_plot);
      }
    },

    plot: {
      help: 'plots paramss against time',
      cmd: function() {}
    },

    plot2: {
      help: 'plots one param against another',
      cmd: function() {}
    },

    image: {
      help: 'renders image in realtime',
      cmd: function() {

      }
    }
  }


  function ROSPlot(context, width, height) {
    this.context = context;
    this.width = width;
    this.height = height;

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
    if (this._plot) {
      this._plot(this.context);
    }
  }

  ROSPlot.prototype.plot = function(plot) {
    for (var i=0; i < this.topics.length; i++) {
      this.topics[i].unsubscribe();
    }

    this.topics = [];
    this._plot = plot;
  }

  return ROSPlot;
})();
