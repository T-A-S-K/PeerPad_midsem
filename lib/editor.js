import CRDT from './crdt';
import RemoteCursor from './remoteCursor';

class Editor {
  constructor(mde) {
    this.controller = null;
    this.mde = mde;
    this.remoteCursors = {};
    this.customTabBehavior();
  }

  customTabBehavior() {
    this.mde.codemirror.setOption("extraKeys", {
      Tab: function (codemirror) {
        codemirror.replaceSelection("\t");
      }
    });
  }

  bindButtons() {

    if (this.controller.urlId == 0) {
      this.bindUploadButton();
    } else {
      console.log("HIDEEEEEEEEEEEEEEEEEEEEEEE", this.controller.urlId)
      this.hideUploadButton();
    }

    this.bindSummarizeButton();
    this.bindDownloadButton();
    this.bindProfileButton();
  }

  hideUploadButton(doc = document) {
    const ulButton = doc.querySelector('#emailValue');
    const fileInput = doc.querySelector('#upload');
    const fileInput1 = doc.querySelector('#myLink');
    const fileInput2 = doc.querySelector('#clipboard');
    ulButton.style.display = 'none';
    fileInput.style.display = 'none';
    fileInput1.style.display = 'none';
    fileInput2.style.display = 'none';
  }

  bindUploadButton(doc = document) {
    const fileSelect = doc.querySelector('#file');
    fileSelect.onchange = () => {
      const file = doc.querySelector("#file").files[0];
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        const fileText = e.target.result;
        this.controller.localInsert(fileText, { line: 0, ch: 0 });
        this.replaceText(this.controller.crdt.toText());
        this.hideUploadButton();
      }
      fileReader.readAsText(file, "UTF-8");
    }
  }

  bindProfileButton(doc = document) {
    const profileButton = document.querySelector('#profile');
    profileButton.onclick = () => {
      window.location.href = '/profile'
    };
  }


  bindSummarizeButton() {
    const summButton = document.querySelector('#summarize');

    summButton.onclick = () => {
      const textToSummarize = this.mde.value();
      console.log(textToSummarize);
      let url = 'https://9a38-2405-201-27-d079-a070-e6f8-ca92-e50f.in.ngrok.io/' + textToSummarize;
      console.log(url)
      fetch('https://9a38-2405-201-27-d079-a070-e6f8-ca92-e50f.in.ngrok.io/' + textToSummarize, {
        headers: { 'Content-Type': 'application/json' },
      }).then(response => response.json())
        .then(data => {
          console.log('Success:', data['final_summary']);
          const textToSave = data['final_summary'];
          const textAsBlob = new Blob([textToSave], { type: "text/plain" });
          const textAsURL = window.URL.createObjectURL(textAsBlob);
          const fileName = "PeerPad-" + Date.now();
          const downloadLink = document.createElement("a");

          downloadLink.download = fileName;
          downloadLink.innerHTML = "Download File";
          downloadLink.href = textAsURL;
          downloadLink.onclick = this.afterDownload;
          downloadLink.style.display = "none";

          document.body.appendChild(downloadLink);
          downloadLink.click();
        }).catch(function (err) {
          // There was an error
          console.warn('Something went wrong.', err);
        });
    };
  }

  bindDownloadButton() {
    const dlButton = document.querySelector('#download');

    dlButton.onclick = () => {
      const textToSave = this.mde.value();
      const textAsBlob = new Blob([textToSave], { type: "text/plain" });
      const textAsURL = window.URL.createObjectURL(textAsBlob);
      const fileName = "PeerPad-" + Date.now();
      const downloadLink = document.createElement("a");

      downloadLink.download = fileName;
      downloadLink.innerHTML = "Download File";
      downloadLink.href = textAsURL;
      downloadLink.onclick = this.afterDownload;
      downloadLink.style.display = "none";

      document.body.appendChild(downloadLink);
      downloadLink.click();
    };
  }

  afterDownload(e, doc = document) {
    doc.body.removeChild(e.target);
  }

  bindChangeEvent() {
    this.mde.codemirror.on("change", (_, changeObj) => {
      if (changeObj.origin === "setValue") return;
      if (changeObj.origin === "insertText") return;
      if (changeObj.origin === "deleteText") return;

      switch (changeObj.origin) {
        case '*compose':
        case '+input':
        //          this.processInsert(changeObj);    // uncomment this line for palindromes!
        case 'paste':
          this.processInsert(changeObj);
          break;
        case '+delete':
        case 'cut':
          this.processDelete(changeObj);
          break;
        default:
          throw new Error("Unknown operation attempted in editor.");
      }
    });
  }

  processInsert(changeObj) {
    console.log("process insert:", changeObj)
    //   this.processDelete(changeObj);
    const chars = this.extractChars(changeObj.text);
    const startPos = changeObj.from;
    // console.log("Hello")
    // console.log(chars)
    this.updateRemoteCursorsInsert(chars, changeObj.to);
    this.controller.localInsert(chars, startPos);
  }

  isEmpty(textArr) {
    return textArr.length === 1 && textArr[0].length === 0;
  }

  processDelete(changeObj) {
    if (this.isEmpty(changeObj.removed)) return;
    const startPos = changeObj.from;
    const endPos = changeObj.to;
    const chars = this.extractChars(changeObj.removed);
    console.log("CHANGE OBJ-",changeObj)
    this.updateRemoteCursorsDelete(chars, changeObj.to, changeObj.from);
    this.controller.localDelete(startPos, endPos);
  }

  extractChars(text) {
    if (text[0] === '' && text[1] === '' && text.length === 2) {
      return '\n';
    } else {
      console.log("extract chars:", text.join("\n"))
      return text.join("\n");
    }
  }

  replaceText(text) {
    const cursor = this.mde.codemirror.getCursor();
    this.mde.value(text);
    this.mde.codemirror.setCursor(cursor);
  }

  insertText(value, positions, siteId) {
    const localCursor = this.mde.codemirror.getCursor();
    const delta = this.generateDeltaFromChars(value);

    this.mde.codemirror.replaceRange(value, positions.from, positions.to, 'insertText');
    this.updateRemoteCursorsInsert(positions.to, siteId);
    this.updateSelfCursor(positions.to, siteId, 'insert', value);

    if (localCursor.line > positions.to.line) {
      localCursor.line += delta.line
    } else if (localCursor.line === positions.to.line && localCursor.ch > positions.to.ch) {
      if (delta.line > 0) {
        localCursor.line += delta.line
        localCursor.ch -= positions.to.ch;
      }

      localCursor.ch += delta.ch;
    }

    this.mde.codemirror.setCursor(localCursor);
  }

  removeCursor(siteId) {
    const remoteCursor = this.remoteCursors[siteId];

    if (remoteCursor) {
      remoteCursor.detach();

      delete this.remoteCursors[siteId];
    }
  }

  updateRemoteCursorsInsert(chars, position, siteId) {

    const positionDelta = this.generateDeltaFromChars(chars);
    console.log("updateRemoteCursor:", positionDelta, this.remoteCursors)
    for (const cursorSiteId in this.remoteCursors) {
      if (cursorSiteId === siteId) continue;
      const remoteCursor = this.remoteCursors[cursorSiteId];
      const newPosition = Object.assign({}, remoteCursor.lastPosition);

      if (newPosition.line > position.line) {
        newPosition.line += positionDelta.line;
      } else if (newPosition.line === position.line && newPosition.ch > position.ch) {
        if (positionDelta.line > 0) {
          newPosition.line += positionDelta.line;
          newPosition.ch -= position.ch;

        }

        newPosition.ch += positionDelta.ch;
      }
      console.log("updateRemoteCursorNew:", newPosition)
      remoteCursor.set(newPosition)
    }
  }

  updateRemoteCursorsDelete(chars, to, from, siteId) {
    const positionDelta = this.generateDeltaFromChars(chars);

    for (const cursorSiteId in this.remoteCursors) {
      if (cursorSiteId === siteId) continue;
      const remoteCursor = this.remoteCursors[cursorSiteId];
      const newPosition = Object.assign({}, remoteCursor.lastPosition);

      if (newPosition.line > to.line) {
        newPosition.line -= positionDelta.line;
      } else if (newPosition.line === to.line && newPosition.ch > to.ch) {
        if (positionDelta.line > 0) {
          newPosition.line -= positionDelta.line;
          newPosition.ch += from.ch;
        }

        newPosition.ch -= positionDelta.ch;
      }

      remoteCursor.set(newPosition)
    }
  }

  updateSelfCursor(position, siteId, opType, value) {
    const remoteCursor = this.remoteCursors[siteId];
    const clonedPosition = Object.assign({}, position);

    if (opType === 'insert') {
      if (value === '\n') {
        clonedPosition.line++;
        clonedPosition.ch = 0
      } else {
        clonedPosition.ch++;
      }
    } else {
      clonedPosition.ch--;
    }

    if (remoteCursor) {
      remoteCursor.set(clonedPosition);
    } else {
      this.remoteCursors[siteId] = new RemoteCursor(this.mde, siteId, clonedPosition);
    }
  }

  deleteText(value, positions, siteId) {
    const localCursor = this.mde.codemirror.getCursor();
    const delta = this.generateDeltaFromChars(value);

    this.mde.codemirror.replaceRange("", positions.from, positions.to, 'deleteText');
    this.updateRemoteCursorsDelete(positions.to, siteId);
    this.updateSelfCursor(positions.to, siteId, 'delete');

    if (localCursor.line > positions.to.line) {
      localCursor.line -= delta.line;
    } else if (localCursor.line === positions.to.line && localCursor.ch > positions.to.ch) {
      if (delta.line > 0) {
        localCursor.line -= delta.line;
        localCursor.ch += positions.from.ch;
      }

      localCursor.ch -= delta.ch;
    }

    this.mde.codemirror.setCursor(localCursor);
  }

  generateDeltaFromChars(chars) {
    const delta = { line: 0, ch: 0 };
    let counter = 0;

    while (counter < chars.length) {
      if (chars[counter] === '\n') {
        delta.line++;
        delta.ch = 0;
      } else {
        delta.ch++;
      }

      counter++;
    }

    return delta;
  }
}

export default Editor;
