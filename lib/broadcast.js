class Broadcast {
  constructor(docid) {
    this.controller = null;
    this.peer = null;
    this.outConns = [];
    this.inConns = [];
    this.outgoingBuffer = [];
    this.MAX_BUFFER_SIZE = 40;
    this.currentStream = null;
    // this.docid = "id" + Math.random().toString(16).slice(2)
    this.docid = docid == '' ? "id" + Math.random().toString(16).slice(2) : docid
  }

  send(operation) {
    const operationJSON = JSON.stringify(operation);
    if (operation.type === 'insert' || operation.type === 'delete') {
      this.addToOutgoingBuffer(operationJSON);
    }
    this.outConns.forEach(conn => conn.send(operationJSON));
  }

  addToOutgoingBuffer(operation) {
    console.log("BUFFERRRR===", operation)
    if (this.outgoingBuffer.length === this.MAX_BUFFER_SIZE) {
      this.outgoingBuffer.shift();
    }

    this.outgoingBuffer.push(operation);
    console.log("OUTGOING", this.outgoingBuffer)
  }

  processOutgoingBuffer(peerId) {
    console.log("PROCESSSSSSSSSSSS===", peerId)
    const connection = this.outConns.find(conn => conn.peer === peerId);
    this.outgoingBuffer.forEach(op => {
      connection.send(op);
    });
  }

  bindServerEvents(targetPeerId, peer) {
    this.peer = peer;
    this.onOpen(targetPeerId);
    this.heartbeat = this.startPeerHeartBeat(peer);
  }

  startPeerHeartBeat(peer) {
    console.log("PEER STARTT")
    let timeoutId = 0;
    const heartbeat = () => {
      timeoutId = setTimeout(heartbeat, 20000);
      if (peer.socket._wsOpen()) {
        peer.socket.send({ type: 'HEARTBEAT' });
      }
    };

    heartbeat();

    return {
      start: function () {
        if (timeoutId === 0) { heartbeat(); }
      },
      stop: function () {
        clearTimeout(timeoutId);
        timeoutId = 0;
      }
    };
  }

  onOpen(targetPeerId) {
    console.log("OPEN")
    console.log("DOC ID->", this.docid)
    // var docid = "id" + Math.random().toString(16).slice(2)
    this.peer.on('open', id => {
      this.controller.updateShareLink(id, this.docid);
      this.onPeerConnection();
      this.onError();
      this.onDisconnect();
      if (targetPeerId == 0) {
        this.controller.addToNetwork(id, this.controller.siteId);
      } else {
        this.requestConnection(targetPeerId, id, this.controller.siteId)
      }
    });
  }

  onError() {
    this.peer.on("error", err => {
      const pid = String(err).replace("Error: Could not connect to peer ", "");
      this.removeFromConnections(pid);
      console.log(err.type);
      if (!this.peer.disconnected) {
        this.controller.findNewTarget();
      }
      this.controller.enableEditor();
    });
  }

  onDisconnect() {
    this.peer.on('disconnected', () => {
      this.controller.lostConnection();
    });
  }

  requestConnection(target, peerId, siteId) {
    const conn = this.peer.connect(target);
    this.addToOutConns(conn);
    conn.on('open', () => {
      conn.send(JSON.stringify({
        type: 'connRequest',
        peerId: peerId,
        siteId: siteId,
      }));
    });
  }

  // evaluateRequest(peerId, siteId) {
  //     this.acceptConnRequest(peerId, siteId);
  // }

  evaluateRequest(peerId, siteId) {
    if (this.hasReachedMax()) {
      this.forwardConnRequest(peerId, siteId);
    } else {
      this.acceptConnRequest(peerId, siteId);
    }
  }

  hasReachedMax() {
    const halfTheNetwork = Math.ceil(this.controller.network.length / 2);
    const tooManyInConns = this.inConns.length > Math.max(halfTheNetwork, 2);
    const tooManyOutConns = this.outConns.length > Math.max(halfTheNetwork, 2);

    return tooManyInConns || tooManyOutConns;
  }

  forwardConnRequest(peerId, siteId) {
    const connected = this.outConns.filter(conn => conn.peer !== peerId);
    const randomIdx = Math.floor(Math.random() * connected.length);
    connected[randomIdx].send(JSON.stringify({
      type: 'connRequest',
      peerId: peerId,
      siteId: siteId,
    }));
  }



  addToOutConns(connection) {
    if (!!connection && !this.isAlreadyConnectedOut(connection)) {
      this.outConns.push(connection);
      console.log("OUTCONNS=", this.outConns)
    }
  }

  addToInConns(connection) {
    if (!!connection && !this.isAlreadyConnectedIn(connection)) {
      this.inConns.push(connection);
    }
  }

  addToNetwork(peerId, siteId) {
    this.send({
      type: "add to network",
      newPeer: peerId,
      newSite: siteId
    });
  }

  removeFromNetwork(peerId) {
    console.log("Remove from network broadcast")
    this.send({
      type: "remove from network",
      oldPeer: peerId
    });
    console.log("Remove from network broadcast-111")
    // this.controller.removeFromNetwork(peerId);
  }

  removeFromConnections(peer) {
    console.log("Remove from connections")
    this.inConns = this.inConns.filter(conn => conn.peer !== peer);
    this.outConns = this.outConns.filter(conn => conn.peer !== peer);
    // this.removeFromNetwork(peer);
    this.controller.removeFromNetwork(peer);
    console.log("peer id list->", this.inConns)
  }

  isAlreadyConnectedOut(connection) {
    if (connection.peer) {
      return !!this.outConns.find(conn => conn.peer === connection.peer);
    } else {
      return !!this.outConns.find(conn => conn.peer.id === connection);
    }
  }

  isAlreadyConnectedIn(connection) {
    if (connection.peer) {
      return !!this.inConns.find(conn => conn.peer === connection.peer);
    } else {
      return !!this.inConns.find(conn => conn.peer.id === connection);
    }
  }

  onPeerConnection() {
    this.peer.on('connection', (connection) => {
      this.onConnection(connection);
      this.onData(connection);
      console.log("onpeer", connection)
      this.onConnClose(connection);
    });
  }

  acceptConnRequest(peerId, siteId) {
    const connBack = this.peer.connect(peerId);
    this.addToOutConns(connBack);
    this.controller.addToNetwork(peerId, siteId);

    const initialData = JSON.stringify({
      type: 'syncResponse',
      siteId: this.controller.siteId,
      peerId: this.peer.id,
      initialStruct: this.controller.crdt.struct,
      initialVersions: this.controller.vector.versions,
      network: this.controller.network
    });

    if (connBack.open) {
      console.log("INSIDE CONNBACKOPEN")
      connBack.send(initialData);
    } else {
      connBack.on('open', () => {
        console.log("INSIDE ELSE CONNBACK")
        connBack.send(initialData);
      });
    }
  }

  videoCall(id, ms) {
    if (!this.currentStream) {
      const callObj = this.peer.call(id, ms);
      this.onStream(callObj);
    }
  }

  onConnection(connection) {
    this.controller.updateRootUrl(connection.peer, this.docid);
    this.addToInConns(connection);
  }


  onData(connection) {
    connection.on('data', data => {
      const dataObj = JSON.parse(data);

      switch (dataObj.type) {
        case 'connRequest':
          this.evaluateRequest(dataObj.peerId, dataObj.siteId);
          break;
        case 'syncResponse':
          this.processOutgoingBuffer(dataObj.peerId);
          this.controller.handleSync(dataObj, this.docid);
          break;
        case 'syncCompleted':
          this.processOutgoingBuffer(dataObj.peerId);
          break;
        case 'add to network':
          this.controller.addToNetwork(dataObj.newPeer, dataObj.newSite);
          break;
        case 'remove from network':
          console.log('TRYING TO REMOVE')
          this.controller.removeFromNetwork(dataObj.oldPeer);
          break;
        default:
          this.controller.handleRemoteOperation(dataObj);
      }
    });
  }

  randomId() {
    const possConns = this.inConns.filter(conn => {
      return this.peer.id !== conn.peer;
    });
    const randomIdx = Math.floor(Math.random() * possConns.length);
    if (possConns[randomIdx]) {
      return possConns[randomIdx].peer;
    } else {
      return false;
    }
  }

  onConnClose(connection) {
    console.log("onConnClose->", connection)
    connection.on('close', () => {
      console.log('CLOSING CONNECTION')
      this.removeFromConnections(connection.peer);
      console.log('url id => ', this.controller.urlId)
      if (connection.peer == this.controller.urlId) {
        const id = this.randomId();
        if (id) { this.controller.updatePageURL(id, this.docid); }
      }
      if (!this.hasReachedMax()) {
        this.controller.findNewTarget();
      }
    });
  }
}

export default Broadcast;
