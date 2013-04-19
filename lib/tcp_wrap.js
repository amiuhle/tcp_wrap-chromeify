/*
void TCPWrap::Initialize(Handle<Object> target) {
  HandleWrap::Initialize(target);
  StreamWrap::Initialize(target);

  HandleScope scope(node_isolate);

  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  t->SetClassName(String::NewSymbol("TCP"));

  t->InstanceTemplate()->SetInternalFieldCount(1);

  enum PropertyAttribute attributes =
      static_cast<PropertyAttribute>(v8::ReadOnly | v8::DontDelete);
  t->InstanceTemplate()->SetAccessor(String::New("fd"),
                                     StreamWrap::GetFD,
                                     NULL,
                                     Handle<Value>(),
                                     v8::DEFAULT,
                                     attributes);

  NODE_SET_PROTOTYPE_METHOD(t, "close", HandleWrap::Close);

  NODE_SET_PROTOTYPE_METHOD(t, "ref", HandleWrap::Ref);
  NODE_SET_PROTOTYPE_METHOD(t, "unref", HandleWrap::Unref);

  NODE_SET_PROTOTYPE_METHOD(t, "readStart", StreamWrap::ReadStart);
  NODE_SET_PROTOTYPE_METHOD(t, "readStop", StreamWrap::ReadStop);
  NODE_SET_PROTOTYPE_METHOD(t, "shutdown", StreamWrap::Shutdown);

  NODE_SET_PROTOTYPE_METHOD(t, "writeBuffer", StreamWrap::WriteBuffer);
  NODE_SET_PROTOTYPE_METHOD(t, "writeAsciiString", StreamWrap::WriteAsciiString);
  NODE_SET_PROTOTYPE_METHOD(t, "writeUtf8String", StreamWrap::WriteUtf8String);
  NODE_SET_PROTOTYPE_METHOD(t, "writeUcs2String", StreamWrap::WriteUcs2String);

  NODE_SET_PROTOTYPE_METHOD(t, "open", Open);
  NODE_SET_PROTOTYPE_METHOD(t, "bind", Bind);
  NODE_SET_PROTOTYPE_METHOD(t, "listen", Listen);
  NODE_SET_PROTOTYPE_METHOD(t, "connect", Connect);
  NODE_SET_PROTOTYPE_METHOD(t, "bind6", Bind6);
  NODE_SET_PROTOTYPE_METHOD(t, "connect6", Connect6);
  NODE_SET_PROTOTYPE_METHOD(t, "getsockname", GetSockName);
  NODE_SET_PROTOTYPE_METHOD(t, "getpeername", GetPeerName);
  NODE_SET_PROTOTYPE_METHOD(t, "setNoDelay", SetNoDelay);
  NODE_SET_PROTOTYPE_METHOD(t, "setKeepAlive", SetKeepAlive);

#ifdef _WIN32
  NODE_SET_PROTOTYPE_METHOD(t, "setSimultaneousAccepts", SetSimultaneousAccepts);
#endif

  tcpConstructor = Persistent<Function>::New(node_isolate, t->GetFunction());

  onconnection_sym = NODE_PSYMBOL("onconnection");
  oncomplete_sym = NODE_PSYMBOL("oncomplete");

  target->Set(String::NewSymbol("TCP"), tcpConstructor);
} */
var deferred = require('deferred');

var noop = function() {};
var socket = chrome.socket;
var timers = require('timers');

function TCP() {
  this._socketId = null;
  this.writeQueueSize = 0;

  var def = deferred();
  var self = this;

  socket.create('tcp', undefined, function (createInfo) {
    self._socketId = createInfo.socketId;
    console.log('TCP', 'socketId', self._socketId);
    def.resolve(self._socketId);
  });
  self._promise = def.promise;
}

TCP.prototype.close = function() {
  this.readStop();
  socket.destroy(this._socketId);
};

TCP.prototype.ref = function() {
  console.log('TCP.ref', arguments);
};

TCP.prototype.unref = function() {
  console.log('TCP.unref', arguments);
};

TCP.prototype.readStart = function() {
  this._readHandle = timers.setInterval(read, 500, this);
};

var read = function(self) {
  socket.read(self._socketId, undefined, function(readInfo) {
    if(readInfo.resultCode > 0) {
      var data = readInfo.data;
      var view = new Uint8Array(data);
      var buffer = new Buffer(view);
      self.onread(buffer, 0, buffer.length);
    }
  });
};

TCP.prototype.readStop = function() {
  timers.clearInterval(this._readHandle);
};

TCP.prototype.shutdown = function() {
  console.log('TCP.shutdown', arguments);
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
  socket.write(this._socketId, data, function(writeInfo) {
    self.writeQueueSize -= writeInfo.bytesWritten;
    req.oncomplete(0, self, req);
  });
  return req;
};

TCP.prototype.writeAsciiString = function() {
  console.log('TCP.writeAsciiString', arguments);
};

TCP.prototype.writeUtf8String = function() {
  console.log('TCP.writeUtf8String', arguments);
};

TCP.prototype.writeUcs2String = function() {
  console.log('TCP.writeUcs2String', arguments);
};

TCP.prototype.open = function() {
  console.log('TCP.open', arguments);
};

TCP.prototype.bind = function() {
  console.log('TCP.bind', arguments);
};

TCP.prototype.listen = function() {
  console.log('TCP.listen', arguments);
};

TCP.prototype.connect = function(address, port) {
  var self = this;
  var req = {
    oncomplete: noop
  };
  this._promise.then(function() {
    socket.connect(self._socketId, address, port, function(result) {
      req.oncomplete(0, self, result, true, true);
    });
  });
  return req;
};

TCP.prototype.bind6 = function() {
  console.log('TCP.bind6', arguments);
};

TCP.prototype.connect6 = function() {
  console.log('TCP.connect6', arguments);
};

TCP.prototype.getsocketname = function() {
  console.log('TCP.getsocketname', arguments);
};

TCP.prototype.setNoDelay = function(enable) {
  var self = this;
  this._promise.then(function() {
    console.log(arguments);
    console.log('TCP.setNoDelay', enable);
    socket.setNoDelay(self._socketId, enable, function(result) {
      console.log('setNoDelay callback', result);
    });
  });
};

TCP.prototype.setKeepAlive = function(enable, delay) {
  console.log('TCP.setKeepAlive', enable, delay);
  var self = this;
  this._promise.then(function() {
    socket.setKeepAlive(self._socketId, enable, delay, function(result) {
      console.log('setKeepAlive callback', result);
    });
  });
};

exports.TCP = TCP;