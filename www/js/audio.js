var AUDIO = (function() {
    var narrativePlayer = null;
    var narrativePlaying = false;
    var ambientPlayer = null;
    var ambientPlaying = false;;
    var subtitles = null;
    var progressInterval = null;

    var checkForAudio = function(slideAnchor) {
        for (var i = 0; i < COPY.content.length; i++) {
            var rowAnchor = COPY.content[i][0];
            var narrativeFile = COPY.content[i][9];
            var narrativeSubtitles = COPY.content[i][10];
            var ambientFile = COPY.content[i][11];
            var ambientVolume = COPY.content[i][12];

            var narrativeString = APP_CONFIG.S3_BASE_URL + '/assets/' + narrativeFile;
            var subtitlesString = APP_CONFIG.S3_BASE_URL + '/data/' + narrativeSubtitles;
            var ambientString = APP_CONFIG.S3_BASE_URL + '/assets/' + ambientFile;

            if (rowAnchor === slideAnchor && narrativeFile !== null && !NO_AUDIO) {
                $thisPlayerProgress = $('#slide-' + rowAnchor).find('.player-progress');
                $playedBar = $('#slide-' + rowAnchor).find('.player-progress .played');
                $controlBtn = $('#slide-' + rowAnchor).find('.control-btn');
                $subtitleWrapper = $('#slide-' + rowAnchor).find('.subtitle-wrapper');
                $subtitles = $('#slide-' + rowAnchor).find('.subtitles');
                $slideTitle = $('#slide-' + rowAnchor).find('.slide-title');

                _setUpNarrativePlayer(narrativeString, subtitlesString);
            }

            if (rowAnchor === slideAnchor && ambientFile !== null && !NO_AUDIO) {
                _setUpAmbientPlayer(ambientString, ambientVolume);
            } else if (rowAnchor === slideAnchor && ambientVolume !== null && ambientPlayer && ambientPlaying) {
                // todo: handle browsers without webaudio
                ambientPlayer.fade(ambientPlayer.volume(), ambientVolume, 1000);
            }
        }
    }

    var _setUpNarrativePlayer = function(audioFilename, subFile) {
        if (narrativePlayer) {
            narrativePlayer.unload();
        }

        narrativePlayer = new Howl({
            urls: [audioFilename],
            onend: _pauseNarrativePlayer
        });

        $.getJSON(subFile, function(data) {
            subtitles = data.subtitles;
            _startNarrativePlayer();
        });
    }

    var _setUpAmbientPlayer = function(audioFilename, volume) {
        if (!ambientPlayer || audioFilename !== ambientPlayer._src) {
            if (ambientPlayer) {
                ambientPlayer.fade(ambientPlayer.volume(), 0, 2000, _onAmbientFaded);
            }

            ambientPlayer = new Howl({
                urls: [audioFilename],
                autoplay: true,
                loop: true,
                volume: 0,
            });
            ambientPlaying = true;

            var fadeVolume = volume ? volume : 1;
            ambientPlayer.fade(0, fadeVolume, 4000, _onAmbientFaded);
        }
    }

    var _startNarrativePlayer = function() {
        narrativePlayer.play();
        narrativePlaying = true;
        progressInterval = setInterval(function() {
            _animateProgress();
        }, 500);
        $controlBtn.removeClass('play').addClass('pause');
    }

    var _pauseNarrativePlayer = function(end) {
        narrativePlayer.pause();
        narrativePlaying = false;
        clearInterval(progressInterval);
        if (end) {
            $playedBar.css('width', $thisPlayerProgress.width() + 'px');
            narrativePlayer.unload();
        }
        $controlBtn.removeClass('pause').addClass('play');
    }

    var _animateProgress = function() {
        var totalTime = narrativePlayer._duration;
        var position = narrativePlayer.pos();

        // animate progress bar
        var percentage = position / totalTime;

        // if we're resetting the bar. ugh.
        if ($playedBar.width() == $thisPlayerProgress.width()) {
            $playedBar.addClass('no-transition');
            $playedBar.css('width', 0);
        } else {
            $playedBar.removeClass('no-transition');
            $playedBar.css('width', $thisPlayerProgress.width() * percentage + 'px');
        }
        // animate subtitles
        var activeSubtitle = null;
        $slideTitle.hide();
        for (var i = 0; i < subtitles.length; i++) {
            if (position < subtitles[i]['time']) {
                activeSubtitle = subtitles[i - 1]['transcript'];
                $subtitleWrapper.fadeIn();
                $subtitles.text(activeSubtitle);
                break;
            } else {
                // this is the last one
                $subtitleWrapper.fadeIn();
                activeSubtitle = subtitles[i]['transcript'];
                $subtitles.text(activeSubtitle);
            }
        }
    }

    var _onAmbientFaded = function() {
        /*
        * Custom remove a stale Howl object
        */
        for (var i = 0; i < Howler._howls.length; i++) {
            var sound = Howler._howls[i];
            if (sound._volume === 0) {
                Howler._howls.splice(i, 1);
            }
        }
    }

    var cleanUpAudio = function() {
        if (narrativePlayer && narrativePlaying) {
            narrativePlayer.unload();
        }
    }

    var toggleNarrativeAudio = function() {
        if (narrativePlaying) {
            _pauseNarrativePlayer(false);
        } else {
            _startNarrativePlayer();
        }
    }

    var toggleAllAudio = function() {
        if (narrativePlayer) {
            if (narrativePlaying) {
                _pauseNarrativePlayer(false);
            } else {
                _startNarrativePlayer();
            }
        }
        if (ambientPlayer) {
            if (ambientPlaying) {
                ambientPlayer.pause();
                ambientPlaying = false;
            } else {
                ambientPlayer.play();
                ambientPlaying = true;
            }
        }
    }

    return {
        'checkForAudio': checkForAudio,
        'cleanUpAudio': cleanUpAudio,
        'toggleNarrativeAudio': toggleNarrativeAudio,
        'toggleAllAudio': toggleAllAudio
    }
}());