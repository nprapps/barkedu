var AUDIO = (function() {
    var narrativePlayer = null;
    var ambientPlayer = null;
    var ambientId = null;
    var subtitles = null;
    var progressInterval = null;
    var narrativeURL = null;
    var subtitlesURL = null;
    var ambientURL = null;

    var checkForAudio = function(slideAnchor) {
        for (var i = 0; i < COPY.content.length; i++) {
            var rowAnchor = COPY.content[i][0];
            var narrativeFilename = COPY.content[i][9];
            var narrativeSubtitles = COPY.content[i][10];
            var ambientFilename = COPY.content[i][11];
            var ambientVolume = COPY.content[i][12];

            if (rowAnchor === slideAnchor && narrativeFilename !== null && !NO_AUDIO) {
                $thisPlayerProgress = $('#slide-' + rowAnchor).find('.player-progress');
                $playedBar = $('#slide-' + rowAnchor).find('.player-progress .played');
                $controlBtn = $('#slide-' + rowAnchor).find('.control-btn');
                $subtitleWrapper = $('#slide-' + rowAnchor).find('.subtitle-wrapper');
                $subtitles = $('#slide-' + rowAnchor).find('.subtitles');
                $slideTitle = $('#slide-' + rowAnchor).find('.slide-title');

                narrativeURL = APP_CONFIG.S3_BASE_URL + '/assets/audio/' + narrativeFilename;
                subtitlesURL = APP_CONFIG.S3_BASE_URL + '/data/' + narrativeSubtitles;
                setNarrativeMedia();
            } else {
                _pauseNarrativePlayer();
            }

            if (rowAnchor === slideAnchor && ambientFilename !== null && ambientURL !== $ambientPlayer.data().jPlayer.status.src && !NO_AUDIO) {
                ambientURL = APP_CONFIG.S3_BASE_URL + '/assets/audio/' + ambientFilename;
                setAmbientMedia();

            } else if (rowAnchor === slideAnchor && ambientVolume !== null && ambientPlayer && ambientPlayer.playing()) {
                // todo: handle browsers without webaudio
                ambientPlayer.fade(ambientPlayer.volume(), ambientVolume, 1000);
            }
        }
    }

    var setUpNarrativePlayer = function() {
        $narrativePlayer.jPlayer({
            swfPath: 'js/lib',
            loop: false,
            supplied: 'mp3',
            timeupdate: onNarrativeTimeupdate,
        });
    }

    var setNarrativeMedia = function() {
        $.getJSON(subtitlesURL, function(data) {
            subtitles = data.subtitles;
            _startNarrativePlayer();
        });
    }

    var onNarrativeTimeupdate = function(e) {
        var totalTime = e.jPlayer.status.duration;
        var position = e.jPlayer.status.currentTime;

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

    var setUpAmbientPlayer = function(audioFilename, volume) {
        if (!ambientPlayer || audioFilename !== ambientPlayer._src) {
            // if (ambientPlayer) {
            //     if (ambientPlayer._webAudio) {
            //         ambientPlayer.fade(ambientPlayer.volume(ambientId), 0, 2000);
            //     } else {
            //         // ambientPlayer.volume(0, ambientId)
            //         // ambientPlayer.unload();
            //     }
            // }

            $ambientPlayer.jPlayer({
                swfPath: 'js/lib',
                loop: true,
                supplied: 'mp3',
            });

            // ambientId = ambientPlayer._sounds[0]._id;

            // var fadeVolume = volume ? volume : 1;
            // if (ambientPlayer._webAudio) {
            //     ambientPlayer.fade(0, fadeVolume, 4000);
            // } else {
            //     ambientPlayer.volume(fadeVolume);
            //     _onAmbientFaded(ambientId);
            // }
        }
    }

    var setAmbientMedia = function() {
        $ambientPlayer.jPlayer('setMedia', {
            mp3: ambientURL
        }).jPlayer('play');
    }

    var _onPlay = function() {
        console.log('play');
    }

    var _startNarrativePlayer = function() {
        $narrativePlayer.jPlayer('setMedia', {
            mp3: narrativeURL
        }).jPlayer('play');
        $controlBtn.removeClass('play').addClass('pause');
    }

    var _resumeNarrativePlayer = function() {
        $narrativePlayer.jPlayer('play');
        $controlBtn.removeClass('play').addClass('pause');
    }

    var _pauseNarrativePlayer = function(end) {
        $narrativePlayer.jPlayer('pause');

        clearInterval(progressInterval);
        if (end) {
            $playedBar.css('width', $thisPlayerProgress.width() + 'px');
        }
        $controlBtn.removeClass('pause').addClass('play');
    }

    var _onAmbientFaded = function(id) {
        /*
        * Custom remove a stale Howl object
        */
        if (ambientPlayer.volume(null, id) === 0) {
            for (var i = 0; i < Howler._howls.length; i++) {
                var sound = Howler._howls[i]._sounds[0];
                if (sound._id === id) {
                    Howler._howls.splice(i, 1);
                }
            }
        }
    }

    var cleanUpAudio = function() {
        if (narrativePlayer && narrativePlayer.playing()) {
            narrativePlayer.unload();
        }
    }

    var toggleNarrativeAudio = function() {
        if ($narrativePlayer.data().jPlayer.status.paused) {
            _resumeNarrativePlayer();
        } else {
            _pauseNarrativePlayer(false);
        }
    }

    var toggleAllAudio = function() {
        if ($narrativePlayer.data().jPlayer.status.paused) {
            _resumeNarrativePlayer(false);
        } else {
            _pauseNarrativePlayer();
        }
        if ($ambientPlayer.data().jPlayer.status.paused) {
            ambientPlayer.jPlayer('play');
        } else {
            ambientPlayer.jPlayer('pause');
        }
    }

    var playAmbientPlayer = function() {
        ambientPlayer._sounds[0]._node.play();
    }

    return {
        'checkForAudio': checkForAudio,
        'cleanUpAudio': cleanUpAudio,
        'toggleNarrativeAudio': toggleNarrativeAudio,
        'toggleAllAudio': toggleAllAudio,
        'setUpAmbientPlayer': setUpAmbientPlayer,
        'setUpNarrativePlayer': setUpNarrativePlayer,
        'playAmbientPlayer': playAmbientPlayer
    }
}());