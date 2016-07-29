// Requires:
//      app,Colors
//      app.firebase
//      utils.metric

(function (app) { 'use strict';

    // Path visualization constructor
    // Arguments:
    //      options: {
    //          fixationColor       - fixation color
    //          showIDs             - if set, fixations and words are labelled by IDs. FIxations also have single color
    //          saccadeColor        - saccade color
    //          connectionColor     - connection color
    //          colorMetric         - word background coloring metric
    //          showConnections     - flat to display fixation-word connections
    //          showSaccades        - flag to display saccades
    //          showFixations       - flag to display fixations
    //          showOriginalFixLocation - flag to display original fixation location
    //      }
    function Path (options) {

        this.fixationColor = options.fixationColor || '#000';
        this.saccadeColor = options.saccadeColor || '#08F';
        this.connectionColor = options.connectionColor || '#FF0';
        this.showIDs = options.showIDs || true;

        this.colorMetric = options.colorMetric || app.Metric.Type.DURATION;
        this.showConnections = options.showConnections !== undefined ? options.showConnections : false;
        this.showSaccades = options.showSaccades !== undefined ? options.showSaccades : false;
        this.showFixations = options.showFixations !== undefined ? options.showFixations : false;
        this.showOriginalFixLocation = options.showOriginalFixLocation !== undefined ? options.showOriginalFixLocation : false;

        var lineColorA = 0.5;
        this.lineColors = [
            'rgba(255,0,0,' + lineColorA +')',
            'rgba(255,255,0,' + lineColorA +')',
            'rgba(0,255,0,' + lineColorA +')',
            'rgba(0,255,224,' + lineColorA +')',
            'rgba(0,128,255,' + lineColorA +')',
            'rgba(255,0,255,' + lineColorA +')',
        ];

        app.Visualization.call( this, options );
    }

    app.loaded( () => { // we have to defer the prototype definition until the Visualization mudule is loaded

    Path.prototype = Object.create( app.Visualization.prototype );
    Path.prototype.base = app.Visualization.prototype;
    Path.prototype.constructor = Path;

    Path.prototype._fillDataQueryList = function (list) {
        //var records = [];
        this._snapshot.forEach( childSnapshot => {
            var option = document.createElement('option');
            option.value = childSnapshot.key();
            option.textContent = childSnapshot.key();
            if (this._sessioName === option.value) {
                option.selected = true;
            }
            list.appendChild( option );

            // var fixations = this._remapStatic( childSnapshot.val() );
            // if (fixations) {
            //     records.push( childSnapshot.key() );
            //     records = records.concat( this._exportMapping( fixations ) );
            // }
        });
        //this._save( records.join( '\n' ), 'mapping.txt' );
    };

    Path.prototype._load = function (name) {
        if (!this._snapshot) {
            return;
        }

        //this._exportData();

        var session = this._snapshot.child( name );
        if (session && session.exists()) {
            var sessionVal = session.val();
            if (sessionVal) {
                this._sessioName = name;

                var fixations = this._remapStatic( sessionVal );
                //var fixations = this._remapDynamic( sessionVal );
                var metricRange = app.Metric.compute( sessionVal.words, this.colorMetric );

                var ctx = this._getCanvas2D();

                this._drawWords( ctx, sessionVal.words, metricRange, this.showIDs );
                if (this.showFixations && fixations) {
                    this._drawFixations( ctx, fixations );
                }
                this._drawTitle( ctx, name );
            }
        } else {
            window.alert( 'record ' + name + ' does not exist' );
        }
    };

   Path.prototype._drawFixations = function (ctx, fixations) {
        ctx.fillStyle = this.fixationColor;
        ctx.strokeStyle = this.saccadeColor;
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'middle';
        ctx.font = '12px Arial';

        var prevFix, fix;
        var id = 0;
        for (var i = 0; i < fixations.length; i += 1) {
            fix = fixations[i];
            if (fix.x <= 0 && fix.y <= 0) {
                continue;
            }

            if (this.showSaccades && prevFix) {
                this._drawSaccade( ctx, prevFix, fix );
            }

            this._drawFixation( ctx, fix, id );

            if (this.showConnections && fix.word) {
                ctx.strokeStyle = this.connectionColor;
                this._drawConnection( ctx, fix, {x: fix.word.left, y: fix.word.top} );
                ctx.strokeStyle = this.saccadeColor;
            }

            prevFix = fix;
            id++;
        }
    };

    Path.prototype._drawGreyFixation = function (ctx, fixation, id) {
        ctx.fillStyle = 'rgba(0,0,0,0.50)';
        ctx.beginPath();
        ctx.arc( fixation.x, fixation.y, 15, 0, 2*Math.PI);
        ctx.fill();

        ctx.fillStyle = '#FF0';
        ctx.fillText( '' + id, fixation.x, fixation.y );
    }

    Path.prototype._drawFixation = function (ctx, fixation, id) {
        if (this.showIDs) {
            return this._drawGreyFixation( ctx, fixation, id );
        }

        if (fixation.line !== undefined) {
            ctx.fillStyle = this.lineColors[ fixation.line % 6 ];
        }
        else {
            ctx.fillStyle = this.fixationColor;
        }

        ctx.beginPath();
        ctx.arc( fixation.x, fixation.y, Math.round( Math.sqrt( fixation.duration ) ) / 2, 0, 2*Math.PI);
        ctx.fill();

        if (this.showOriginalFixLocation && fixation._x) {
            ctx.fillStyle = "rgba(255,255,255,0.15)";
            ctx.beginPath();
            ctx.arc( fixation._x, fixation.y, Math.round( Math.sqrt( fixation.duration ) ) / 2, 0, 2*Math.PI);
            ctx.fill();
        }
    };

    Path.prototype._drawSaccade = function (ctx, from, to) {
        ctx.beginPath();
        ctx.moveTo( from.x, from.y );
        ctx.lineTo( to.x, to.y );
        ctx.stroke();
    };

    Path.prototype._drawConnection = function (ctx, from, to) {
        ctx.beginPath();
        ctx.moveTo( from.x, from.y );
        ctx.lineTo( to.x, to.y );
        ctx.stroke();
    };

    Path.prototype._exportMapping = function (fixations) {
        var records = fixations.map( fixation => {
            if (fixation.x < 0 || fixation.y < 0 ) {
                return null;
            }
            return `${fixation.x}\t${fixation.y}\t` + 
                ( fixation.line === undefined || fixation.line === null ? `-1\t` : `${fixation.line}\t` ) +
                ( fixation.word === undefined || fixation.word === null ? `-1\t` : `${fixation.word.index}\t` );
        });
        return records.filter( record => { return record !== null; } );
    }

    Path.prototype._remapDynamic = function (session) {
        var fixations = app.Fixations;
        var model = app.Model2;

        fixations.init( 80, 50 );
        model.init({
            linePredictor: {
                factors: {
                    currentLineDefDist: 0.4,
                    currentLineMaxDist: 0.4,
                    newLineSaccadeLengthFraction: 0.1
                }
            }
        });

        var layout = session.words.map( function (word) {
            return new Word({ left: word.x, top: word.y, right: word.x + word.width, bottom: word.y + word.height });
        });

        fixations.reset();
        model.reset( layout );
        //model.callbacks( { onMapped: function (fixation) {} } );
        
        var result = [];
        session.fixations.forEach( function (fix) {
            var fixation = fixations.add( fix.x, fix.y, fix.duration );
            if (fixation) {
                model.feedFixation( fixation );
                result.push( fixation );
            }
        });

        return result;
    };

    Path.prototype._remapStatic = function (session) {
        localStorage.setItem('data', JSON.stringify(session));

        app.StaticFit.map(session);
        return session.fixations;
    };


    Path.prototype._exportData = function () {

        var data = '';
        this._snapshot.forEach( childSnapshot => {
            var sessionName = childSnapshot.key();
            var session = this._snapshot.child( sessionName );
            if (session && session.exists()) {
                var sessionVal = session.val();
                data += `\n${sessionName.split('_')[0]}\n`;
                if (sessionVal && sessionVal.fixations) {
                    data += `${sessionVal.setup.lineSize}\t${sessionVal.setup.textID}\n`;
                    sessionVal.fixations.forEach( fix => {
                        //if (fix.x > 0 && fix.y > 0) {
                            data += `${fix.ts}\t${fix.x}\t${fix.y}\t${fix.duration}\n`;
                        //}
                    });
                }
            }
        });

        save( data, 'fixations.txt' );
    };

    Path.prototype._save = function (data, filename) {
        var blob = new Blob([data], {type: 'text/plain'});
        
        var downloadLink = document.createElement("a");
        downloadLink.download = filename;
        downloadLink.innerHTML = 'Download File';

        var URL = window.URL || window.webkitURL;
        downloadLink.href = URL.createObjectURL( blob );
        downloadLink.onclick = function(event) { // self-destrly
            document.body.removeChild(event.target);
        };
        downloadLink.style.display = 'none';
        document.body.appendChild( downloadLink );

        downloadLink.click();
    };

    });

    function Word(rect) {
        this.left = rect.left;
        this.top = rect.top;
        this.right = rect.right;
        this.bottom = rect.bottom;
    }

    Word.prototype.getBoundingClientRect = function () {
        return this;
    };

    app.Path = Path;
    
})( this.Reading || module.exports );
