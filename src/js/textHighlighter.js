(function (app) { 'use strict';

    // Text highlighting propagation routine
    // Constructor arguments:
    //      options: {
    //          root:         - selector for the element that contains text for reading
    //          minReadingDuration  - minimum fixation duration to consider the word has been read (ms)
    //      }
    function TextHighlighter(options) {

        this.root = options.root || document.documentElement;
        this.split();
    }

    // Splits the text nodes into words, each in its own span.word element
    TextHighlighter.prototype.split = function () {

        var re = /[^\s]+/gi;

        var nodeIterator = document.createNodeIterator(
            document.querySelector( this.root ),
            NodeFilter.SHOW_TEXT,
            { acceptNode: function(node) {
                if ( ! /^\s*$/.test(node.data) ) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_REJECT;
            }}
        );

        // Show the content of every non-empty text node that is a child of root
        var node;
        var docFrags = [];

        while ((node = nodeIterator.nextNode())) {

            var word;
            var index = 0;
            var docFrag = document.createDocumentFragment();
            
            while ((word = re.exec( node.textContent )) !== null) {

                if (index < word.index) {
                    var space = document.createTextNode( node.textContent.substring( index, word.index ) );
                    docFrag.appendChild( space );
                }

                var span = document.createElement( 'span' );
                span.classList.add( 'word' );
                span.textContent = word[ 0 ];
                docFrag.appendChild( span );

                index = re.lastIndex;
            }

            docFrags.push( { 
                node: node,
                docFrag: docFrag 
            });
        }

        docFrags.forEach( function (item) {
            item.node.parentNode.replaceChild( item.docFrag, item.node );
        });
    };

    // Resets the highlighting 
    TextHighlighter.prototype.reset = function () {

        var currentWord = document.querySelector( '.currentWord' );
        if (currentWord) {
            currentWord.classList.remove( 'currentWord' );
        }
    };

    // Sets the first word highlighted 
    TextHighlighter.prototype.init = function () {

        this.reset();
    };

    // Propagates the highlighing if the focused word is the next after the current
    // Arguments:
    //        word:         - the focused word 
    TextHighlighter.prototype.setFocusedWord = function (word) {

        var currentWord = document.querySelector( '.currentWord' );
        if (currentWord != word) {
            if (currentWord) {
                currentWord.classList.remove( 'currentWord' );
            }
            if (word) {
                word.classList.add( 'currentWord' );
            }
        }
    };

    // private

    // export

    app.TextHighlighter = TextHighlighter;
    
})( Reading || window );
