# ROS Web Kit

ROS plotting, image streaming, and a Terminal in your browser.

Uses node.js, socket.io and of course, ROS.

Modified version of [tty.js](https://github.com/chjj/tty.js). For the simply terminal interface refer to chjj's wonderful application. 

## Features

- Tabs, Stacking Windows, Maximizable Terminals
- Connection to ROS bridge
- Plotting of ROS topics
- Ability to efficiently render programs: vim, mc, irssi, vifm, etc.
- Support for xterm mouse events
- 256 color support

## Install

``` bash
$ git clone https://github.com/geky/ros_tty_js
$ cd ros_tty_js
$ rosmake
```

## Usage

``` bash
$ roslaunch ros_tty_js ros_tty_js.launch
```

This will create a server running on port 9000. Simply navigate to it with a browser.

## Configuration

Configuration specific to tty.js is stored in `~/.tty.js/config.json` or `~/.tty.js` as a single JSON file. An example configuration file looks like:

``` json
{
  "users": {
    "hello": "world"
  },
  "https": {
    "key": "./server.key",
    "cert": "./server.crt"
  },
  "port": 8080,
  "hostname": "127.0.0.1",
  "shell": "sh",
  "shellArgs": ["arg1", "arg2"],
  "static": "./static",
  "limitGlobal": 10000,
  "limitPerUser": 1000,
  "localOnly": false,
  "cwd": ".",
  "syncSession": false,
  "sessionTimeout": 600000,
  "log": true,
  "io": { "log": false },
  "debug": false,
  "term": {
    "termName": "xterm",
    "geometry": [80, 24],
    "scrollback": 1000,
    "visualBell": false,
    "popOnBell": false,
    "cursorBlink": false,
    "screenKeys": false,
    "colors": [
      "#2e3436",
      "#cc0000",
      "#4e9a06",
      "#c4a000",
      "#3465a4",
      "#75507b",
      "#06989a",
      "#d3d7cf",
      "#555753",
      "#ef2929",
      "#8ae234",
      "#fce94f",
      "#729fcf",
      "#ad7fa8",
      "#34e2e2",
      "#eeeeec"
    ]
  }
}
```

Usernames and passwords can be plaintext or sha1 hashes.

### 256 colors

If tty.js fails to check your terminfo properly, you can force your `TERM`
to `xterm-256color` by setting `"termName": "xterm-256color"` in your config.

## License

Copyright (c) 2012-2013, Christopher Jeffrey (MIT License)

[1]: http://invisible-island.net/xterm/ctlseqs/ctlseqs.html#Mouse%20Tracking
