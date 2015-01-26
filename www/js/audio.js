var AUDIO = (function() {
    var narrativePlayer = null;
    var ambientPlayer = null;
    var ambientId = null;
    var subtitles = null;
    var progressInterval = null;
    var narrativeURL = null;
    var subtitlesURL = null;
    var ambientURL = null;
    var narrativeVisibile = false;

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

            if (rowAnchor === slideAnchor && ambientFilename !== null && !NO_AUDIO) {
                ambientURL = APP_CONFIG.S3_BASE_URL + '/assets/audio/' + ambientFilename;
                setAmbientMedia(ambientURL);

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

    var _startNarrativePlayer = function() {
        $narrativePlayer.jPlayer('setMedia', {
            mp3: narrativeURL
        }).jPlayer('play');
        $controlBtn.removeClass('play').addClass('pause');
        narrativeVisible = true;
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

    var toggleNarrativeAudio = function() {
        if ($narrativePlayer.data().jPlayer.status.paused) {
            _resumeNarrativePlayer();
        } else {
            _pauseNarrativePlayer(false);
        }
    }

    var fakeNarrativePlayer = function() {
        $narrativePlayer.jPlayer('setMedia', {
            mp3: APP_CONFIG.S3_BASE_URL + '/assets/audio/' + 'drone-test.mp3'
        }).jPlayer('play').jPlayer('pause');
    }

    var checkNarrativeState = function(anchor) {
        narrativeVisible = false;
    }

    var onNarrativeTimeupdate = function(e) {
        var totalTime = e.jPlayer.status.duration;
        var position = e.jPlayer.status.currentTime;

        // animate progress bar
        var percentage = position / totalTime;

        if (subtitles) {
            // if we're resetting the bar. ugh.
            if ($playedBar.width() == $thisPlayerProgress.width()) {
                $playedBar.addClass('no-transition');
                $playedBar.css('width', 0);
            } else {
                $playedBar.removeClass('no-transition');
                $playedBar.css('width', $thisPlayerProgress.width() * percentage + 'px');

                if (percentage === 1) {
                    $controlBtn.removeClass('pause').addClass('play');
                }
            }
            // animate subtitles
            var activeSubtitle = null;
            $slideTitle.hide();
            for (var i = 0; i < subtitles.length; i++) {
                if (position < subtitles[i]['time']) {
                    if (i > 0) {
                        activeSubtitle = subtitles[i - 1]['transcript'];
                    } else {
                        activeSubtitle = subtitles[i]['transcript'];
                    }
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
    }

    var setUpAmbientPlayer = function() {
        $ambientPlayer.jPlayer({
            swfPath: 'js/lib',
            loop: true,
            supplied: 'mp3',
        });
    }

    var setAmbientMedia = function(url) {
        if (!$ambientPlayer.data().jPlayer.status.paused) {
            $ambientPlayer.jPlayerFade().to(1000, 1, 0, function() {
                $ambientPlayer.jPlayer('setMedia', {
                    mp3: url
                }).jPlayer('play');

                $ambientPlayer.jPlayerFade().to(1000, 0, 1);

            });
        } else {
            $ambientPlayer.jPlayer('setMedia', {
                mp3: url
            }).jPlayer('play');
            $ambientPlayer.jPlayerFade().to(1000, 0, 1);
        }
    }

    var toggleAllAudio = function() {
        console.log(narrativeVisible);
        if (isHidden()) {
            if (narrativeVisible) {
                _pauseNarrativePlayer(false);
            }
            $ambientPlayer.jPlayer('pause');

        } else {
            if (narrativeVisible) {
                _resumeNarrativePlayer();
            }
            $ambientPlayer.jPlayer('play');
        }
    }

    return {
        'checkForAudio': checkForAudio,
        'toggleNarrativeAudio': toggleNarrativeAudio,
        'toggleAllAudio': toggleAllAudio,
        'setUpAmbientPlayer': setUpAmbientPlayer,
        'setUpNarrativePlayer': setUpNarrativePlayer,
        'setAmbientMedia': setAmbientMedia,
        'fakeNarrativePlayer': fakeNarrativePlayer,
        'checkNarrativeState': checkNarrativeState
    }
}());