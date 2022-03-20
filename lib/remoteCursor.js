import CSS_COLORS from './cssColors';
import { generateItemFromHash } from './hashAlgo';


export default class RemoteCursor {
  constructor(mde, siteId, position) {
    this.mde = mde;
    const color = generateItemFromHash(siteId, CSS_COLORS);
    this.createCursor(color);
    this.set(position);
  }

  createCursor(color) {
    const textHeight = this.mde.codemirror.defaultTextHeight();

    this.cursor = document.createElement('div');
    this.cursor.classList.add('remote-cursor');
    this.cursor.style.backgroundColor = color;
    this.cursor.style.height = textHeight + 'px';
  }



  set(position) {
    this.detach();

    const coords = this.mde.codemirror.cursorCoords(position, 'local');
    this.cursor.style.left = (coords.left >= 0 ? coords.left : 0) + 'px';
    this.mde.codemirror.getDoc().setBookmark(position, { widget: this.cursor });
    this.lastPosition = position;
    

    this.cursor.parentElement.appendChild(document.createTextNode("\u200b"));
  }

  detach() {
    if (this.cursor.parentElement)
      this.cursor.remove();
  }
}
