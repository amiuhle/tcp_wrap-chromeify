var noop = function() {};

function TCP() {
  this._socketId = null;
  this.writeQueueSize = 0;
}

TCP.prototype.connect = function(address, port) {
  var self = this;
  var req = {
    oncomplete: noop
  };
  chrome.socket.create('tcp', undefined, function (createInfo) {
    console.log('create callback', createInfo);
    self._socketId = createInfo.socketId;
    chrome.socket.connect(self._socketId, address, port, function(result) {
      console.log('connect callback', result);
      req.oncomplete(0, self, result, true, true);
    });
  });
  return req;
};

TCP.prototype.readStart = function() {
  console.log('TCP.readStart');
  this._readHandle = setInterval(this.read.bind(this), 500);
};

TCP.prototype.read = function() {
  // console.log('TCP.read');
  var self = this;
  chrome.socket.read(this._socketId, undefined, function(readInfo) {
    if(readInfo.resultCode > 0) {
      var data = readInfo.data;
      var view = new Uint8Array(data);
      var buffer = new Buffer(view);
      self.onread(buffer, 0, buffer.length);
    }
  });
};

TCP.prototype.readStop = function() {
  clearInterval(this._readHandle);
};

TCP.prototype.writeBuffer = function(data) {
  if(data.constructor.name !== 'ArrayBuffer') {
    var array = new Uint8Array(data.length);
    for(var i = 0; i < array.length; i++) {
      var value = data[i];
      array[i] = value;
    }
    data = array.buffer;
  }
  var self = this;
  self.writeQueueSize += data.byteLength;
  var req = {
    oncomplete: noop,
    bytes: data.byteLength
  };
  chrome.socket.write(this._socketId, data, function(writeInfo) {
    console.log('write callback', writeInfo);
    self.writeQueueSize -= writeInfo.bytesWritten;
    req.oncomplete(0, self, req);
  });
  return req;
};

TCP.prototype.close = function() {
  this.readStop();
  chrome.socket.destroy(this._socketId);
};

exports.TCP = TCP;