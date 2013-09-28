/**
 * tty.js
 * Copyright (c) 2013-2014, Christopher Haster (MIT License)
 */

var ROSPlot = (function() {
  var cmds = {
    help: function() {
      console.log('test');
    }
    

  } 

  function ROSPlot(context, width, height) {
    this.context = context;
    this.width = width;
    this.height = height;

    cmds.help([]);
  }

  ROSPlot.prototype.cmd = function(input) {
    input = input.split(' ');
    if (input.length == 0) return;

    var cmd = cmds[input[0]];

    if (cmd) {
      cmd(input);
    }

    this.render();
  }

  ROSPlot.prototype.render = function() {
    if (this.plot) {
      this.plot(this.context, this.width, this.height);
    }
  }

  return ROSPlot;
})();
