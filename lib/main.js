import Peer from 'peerjs';
import SimpleMDE from 'simplemde';

import Controller from './controller';
import Broadcast from './broadcast';
import Editor from './editor';

if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {

} else {
  new Controller(
    (location.search.slice(1) || '0'),
    location.origin,
    new Peer({
        debug: 3,
        //secure:true,
        // host: 'task-peerpad.herokuapp.com/', // change here the herokuapp name
        host: "127.0.0.1",
        port: 5001
       
      }),
    new Broadcast(),
    new Editor(new SimpleMDE({
      placeholder: "Share the link to invite collaborators to your document.",
      spellChecker: false,
      toolbar: false,
      autofocus: false,
      indentWithTabs: true,
      tabSize: 4,
      indentUnit: 4,
      lineWrapping: false,
      shortCuts: []
    }))
  );
}
