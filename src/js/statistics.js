(function (app) { 'use strict';

    // Text highlighting propagation routine
    // Constructor arguments:
    //      options: {
    //          root:         - selector for the element that contains statistics view
    //      }
    //      text:       - text controller
    function Statistics(options, text) {

        this.root = options.root || document.documentElement;
        this.wordSelector = '.' + options.wordClass || '.word';

        _text = text;

        _view = document.querySelector( this.root );
        _view.style.display = 'none';

        var self = this;

        var close = document.querySelector( this.root + ' .close' );
        close.addEventListener('click', function () {
            _view.style.display = 'none';
        });

        var saveLocal = document.querySelector( this.root + ' .saveLocal' );
        saveLocal.addEventListener('click', function () {
            self._saveLocal();
        });

        var saveRemote = document.querySelector( this.root + ' .saveRemote' );
        saveRemote.addEventListener('click', function () {
            self._saveRemote();
        });
    }

    // Print the statistics
    Statistics.prototype.print = function () {
        
        if (_currentWord) {
            var record = text.get(_currentWord);
            if (record) {
                record.stop();
            }
        }

        var text = Record.getHeader() + '\n';

        _words.forEach(function (record) {
            text += record.toString() + '\n';
        });

        text += '\n' + Fixation.getHeader() + '\n';

        _fixationsFiltered = [];        
        var lastFix = null;
        for (var i = 0; i < _fixations.length; i += 1) {
            var fix = _fixations[i];
            if (fix.duration <= 80) {
                continue;
            }
            if (!lastFix || lastFix.ts !== fix.ts) {
                text += fix.toString() + '\n';
                if (lastFix) {
                    _fixationsFiltered.push( lastFix );
                }
            }
            lastFix = fix;
        }

        var textarea = document.querySelector( this.root + ' textarea' );
        textarea.value = text;

        _view.style.display = 'block    ';
    };

    // Prepares to collect data
    Statistics.prototype.init = function () {
        
        _currentWord = null;
        _words.clear();
        _fixations = [];
        
        _view.style.display = 'none';
    };

    // Propagates the highlighing if the focused word is the next after the current
    // Arguments:
    //        word:         - the focused word  (DOM element)
    Statistics.prototype.setFocusedWord = function (word) {

        var record;
        if (_currentWord != word) {
            if (_currentWord) {
                record = _words.get(_currentWord);
                if (record) {
                    record.stop();
                }
            }
            if (word) {
                record = _words.get(word);
                if (!record) {
                    record = new Record(word);
                    _words.set(word, record);
                }

                record.start();
            }
        }

        _currentWord = word;
    };

    // Logs fixation
    Statistics.prototype.logFixation = function (fixation) {
        _fixations.push(new Fixation(fixation));
    };

    // private
    Statistics.prototype._saveLocal = function () {
        var textToWrite = document.querySelector( this.root + ' textarea' ).value;
        var textFileAsBlob = new Blob([textToWrite], {type: 'text/plain'});
        
        var downloadLink = document.createElement("a");
        downloadLink.download = 'results.txt';
        downloadLink.innerHTML = 'Download File';

        var URL = window.URL || window.webkitURL;
        downloadLink.href = URL.createObjectURL( textFileAsBlob );
        downloadLink.onclick = function(event) { // self-destrly
            document.body.removeChild(event.target);
        };
        downloadLink.style.display = 'none';
        document.body.appendChild( downloadLink );

        downloadLink.click();
    }

    Statistics.prototype._saveRemote = function () {
        var name = prompt( 'Please enter the name', GUID() );
        if (name) {
            var setup = _text.getSetup();
            var record = app.firebase.child( name + '_' + setup.textID + '_' + setup.lineSize);
            record.set({
                fixations: _fixationsFiltered,
                words: this._getWordsList(),
                setup: setup
            });
        }
    }

    Statistics.prototype._getWordsList = function () {
        var list = [];
        var words = document.querySelectorAll( this.wordSelector );
        for (var i = 0; i < words.length; i += 1) {
            var word = words.item(i);
            var rect = word.getBoundingClientRect();
            var item = {
                text: word.textContent,
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            };
            list.push(item);
        }
        return list;
    };

    // private
    var _view;
    var _text;
    var _currentWord = null;
    var _words = new Map();
    var _fixations = [];
    var _fixationsFiltered = [];

    // definitions

    function Record(elem) {
        this.rect = elem.getBoundingClientRect();
        this.text = elem.textContent;
        this.duration = 0;
        this.focusCount = 0;
        this.timestamp = 0;
    }

    Record.prototype.start = function () {
        this.timestamp = performance.now();
        this.focusCount++;
    };

    Record.prototype.stop = function () {
        this.duration += performance.now() - this.timestamp;
    };

    Record.prototype.toString = function () {
        return this.text + '\t' + Math.round(this.duration) + '\t' + this.focusCount + '\t' +
            Math.round(this.rect.left) + '\t' + Math.round(this.rect.top) + '\t' + 
            Math.round(this.rect.width) + '\t' + Math.round(this.rect.height);
    };

    Record.getHeader = function () {
        return 'text\tdur\tfocus\tx\ty\tw\th';
    };

    function Fixation(fixation) {
        this.ts = fixation.ts;
        this.x = Math.round(fixation.x);
        this.y = Math.round(fixation.y);
        this.duration = fixation.duration;
    }

    Fixation.prototype.toString = function () {
        return this.ts + '\t' + this.x + '\t' + this.y + '\t' + this.duration;
    };
    
    Fixation.getHeader = function () {
        return 'ts\tx\ty\tdur';
    };

    // private functions

    function GUID() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }

    // export

    app.Statistics = Statistics;
    
})( Reading || window );
