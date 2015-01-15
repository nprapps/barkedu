// Global state
var $upNext = null;
var $w;
var $h;
var $slides;
var $arrows;
var $nextArrow;
var $startCardButton;
var $controlBtn;
var $thisPlayerProgress;
var $playedBar;
var isTouch = Modernizr.touch;
var mobileSuffix;
var aspectWidth = 16;
var aspectHeight = 9;
var optimalWidth;
var optimalHeight;
var w;
var h;
var slideStartTime = new Date();
var completion = 0;
var arrowTest;
var lastSlideExitEvent;
var narrativePlayer = null;
var ambientPlayer = null;
var progressInterval;
var subtitles;


var resize = function() {
    $w = $(window).width();
    $h = $(window).height();

    $slides.width($w);

    optimalWidth = ($h * aspectWidth) / aspectHeight;
    optimalHeight = ($w * aspectHeight) / aspectWidth;

    w = $w;
    h = optimalHeight;

    if (optimalWidth > $w) {
        w = optimalWidth;
        h = $h;
    }
};

var setUpFullPage = function() {
    var anchors = ['_'];
    for (var i = 0; i < COPY.content.length; i++) {
        anchors.push(COPY.content[i][0]);
    }
    $.fn.fullpage({
        anchors: (!APP_CONFIG.DEPLOYMENT_TARGET) ? anchors : false,
        autoScrolling: false,
        keyboardScrolling: false,
        verticalCentered: false,
        fixedElements: '.primary-navigation, #share-modal',
        resize: false,
        css3: true,
        loopHorizontal: false,
        afterRender: onPageLoad,
        afterSlideLoad: lazyLoad,
        onSlideLeave: onSlideLeave
    });
};

var onPageLoad = function() {
    setSlidesForLazyLoading(0);
    $('.section').css({
      'opacity': 1,
      'visibility': 'visible',
    });
    showNavigation();
};

// after a new slide loads
var lazyLoad = function(anchorLink, index, slideAnchor, slideIndex) {
    setSlidesForLazyLoading(slideIndex);
    showNavigation();
    slideStartTime = Date.now();
    checkForAudio(slideAnchor);

    // Completion tracking
    how_far = (slideIndex + 1) / ($slides.length - APP_CONFIG.NUM_SLIDES_AFTER_CONTENT);

    if (how_far >= completion + 0.25) {
        completion = how_far - (how_far % 0.25);

        if (completion === 0.25) {
            ANALYTICS.completeTwentyFivePercent();
        }
        else if (completion === 0.5) {
            ANALYTICS.completeFiftyPercent();
        }
        else if (completion === 0.75) {
            ANALYTICS.completeSeventyFivePercent();
        }
        else if (completion === 1) {
            ANALYTICS.completeOneHundredPercent();
        }
    }
};

var setSlidesForLazyLoading = function(slideIndex) {
    /*
    * Sets up a list of slides based on your position in the deck.
    * Lazy-loads images in future slides because of reasons.
    */
    var slides = [
        $slides.eq(slideIndex - 2),
        $slides.eq(slideIndex - 1),
        $slides.eq(slideIndex),
        $slides.eq(slideIndex + 1),
        $slides.eq(slideIndex + 2)
    ];

    // Mobile suffix should be blank by default.
    mobileSuffix = '';

    if ($w < 769) {
        mobileSuffix = '-sq';
    }

    for (var i = 0; i < slides.length; i++) {
        loadImages(slides[i]);
    };

}

var loadImages = function($slide) {
    /*
    * Sets the background image on a div for our fancy slides.
    */
    if ($slide.data('bgimage')) {
        var image_filename = $slide.data('bgimage').split('.')[0];
        var image_extension = '.' + $slide.data('bgimage').split('.')[1];
        var image_path = 'assets/' + image_filename + mobileSuffix + image_extension;

        if ($slide.css('background-image') === 'none') {
            $slide.css('background-image', 'url(' + image_path + ')');
        }
    }

    var $images = $slide.find('img.lazy-load');
    if ($images.length > 0) {
        for (var i = 0; i < $images.length; i++) {
            var image = $images.eq(i).data('src');
            $images.eq(i).attr('src', 'assets/' + image);
        }
    }
};

var showNavigation = function() {
    /*
    * Nav doesn't exist by default.
    * This function loads it up.
    */

    if ($slides.first().hasClass('active')) {
        /*
        * Don't show arrows on titlecard
        */
        $arrows.hide();
    }

    else if ($slides.last().hasClass('active')) {
        /*
        * Last card gets no next arrow but does have the nav.
        */
        if (!$arrows.hasClass('active')) {
            showArrows();
        }

        $nextArrow.removeClass('active');
        $nextArrow.hide();
    } else if ($slides.eq(1).hasClass('active')) {
        showArrows();

        switch (arrowTest) {
            case 'bright-arrow':
                $nextArrow.addClass('titlecard-nav');
                break;
            case 'bouncy-arrow':
                $nextArrow.addClass('shake animated titlecard-nav');
                break;
            default:
                break;
        }

        $nextArrow.on('click', onFirstRightArrowClick);
    } else {
        /*
        * All of the other cards? Arrows and navs.
        */
        if ($arrows.filter('active').length != $arrows.length) {
            showArrows();
        }
        $nextArrow.removeClass('shake animated titlecard-nav');

        $nextArrow.off('click', onFirstRightArrowClick);
    }
}

var showArrows = function() {
    /*
    * Show the arrows.
    */
    $arrows.addClass('active');
    $arrows.show();
};

var determineArrowTest = function() {
    var possibleTests = ['faded-arrow', 'bright-arrow', 'bouncy-arrow'];
    var test = possibleTests[getRandomInt(0, possibleTests.length)]
    return test;
}

var getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

var onSlideLeave = function(anchorLink, index, slideIndex, direction) {
    /*
    * Called when leaving a slide.
    */
    if (narrativePlayer && narrativePlayer.playing()) {
        narrativePlayer.stop();
    }

    var timeOnSlide = Math.abs(new Date() - slideStartTime);
    ANALYTICS.exitSlide(slideIndex.toString(), timeOnSlide, lastSlideExitEvent);
}

var onFirstRightArrowClick = function() {
    var timeOnSlide = Math.abs(new Date() - slideStartTime);
    ANALYTICS.firstRightArrowClick(arrowTest, timeOnSlide);
}

var onStartCardButtonClick = function() {
    lastSlideExitEvent = 'go';
    $.fn.fullpage.moveSlideRight();
}

var onArrowsClick = function() {
    lastSlideExitEvent = 'arrow';
}

var onDocumentKeyDown = function(e) {
    if (e.which === 37 || e.which === 39) {
        lastSlideExitEvent = 'keyboard';
        ANALYTICS.useKeyboardNavigation();
        if (e.which === 37) {
            $.fn.fullpage.moveSlideLeft();
        } else if (e.which === 39) {
            $.fn.fullpage.moveSlideRight();
        }
    }
    // jquery.fullpage handles actual scrolling
    return true;
}

var onSlideClick = function(e) {
    if (isTouch) {
        lastSlideExitEvent = 'tap';
        $.fn.fullpage.moveSlideRight();
    }
    return true;
}

var onNextPostClick = function(e) {
    e.preventDefault();

    ANALYTICS.trackEvent('next-post');
    window.top.location = NEXT_POST_URL;
    return true;
}

var fakeMobileHover = function() {
    $(this).css({
        'background-color': '#fff',
        'color': '#000',
        'opacity': .9
    });
}

var rmFakeMobileHover = function() {
    $(this).css({
        'background-color': 'rgba(0, 0, 0, 0.2)',
        'color': '#fff',
        'opacity': .3
    });
}

/*
 * Text copied to clipboard.
 */
var onClippyCopy = function(e) {
    alert('Copied to your clipboard!');

    ANALYTICS.copySummary();
}

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

        // check for new narrative file
        if (rowAnchor === slideAnchor && narrativeFile !== null) {
            $thisPlayerProgress = $('#slide-' + rowAnchor).find('.player-progress');
            $playedBar = $('#slide-' + rowAnchor).find('.player-progress .played');
            $controlBtn = $('#slide-' + rowAnchor).find('.control-btn');

            narrativePlayer = new Howl({
                src: [narrativeString],
                onend: pauseNarrativePlayer
            });

            $.getJSON(subtitlesString, function(data) {
                subtitles = data.subtitles;
            })

            if (!narrativePlayer.playing()) {
                setTimeout(function(){
                    startNarrativePlayer(subtitles)
                }, 2000);
            }
        }

        // check for new ambient file
        if (rowAnchor === slideAnchor && ambientFile !== null) {
            // if we're not already playing this file
            if (!ambientPlayer || ambientString !== ambientPlayer._src) {
                ambientPlayer = new Howl({
                    src: [ambientString],
                    autoplay: true,
                    loop: true,
                    onfaded: onAmbientFade
                });
                if (ambientVolume) {
                    ambientPlayer.volume(ambientVolume);
                }
            }
        } else if (rowAnchor === slideAnchor && ambientVolume !== null && ambientPlayer && ambientPlayer.playing()) {
            ambientPlayer.fade(ambientPlayer.volume(), ambientVolume, 2000);
        }
    }
}

var onControlBtnClick = function(e) {
    e.preventDefault();

    if (narrativePlayer.playing()) {
        pauseNarrativePlayer(false);
    } else {
        startNarrativePlayer(subtitles);
    }
}

var startNarrativePlayer = function(subtitles) {
    narrativePlayer.play();
    progressInterval = setInterval(function() {
        animateProgress(subtitles);
            }, 500);
    $controlBtn.removeClass('play').addClass('pause');
}

var pauseNarrativePlayer = function(pause) {
    narrativePlayer.pause();
    clearInterval(progressInterval);
    if (pause) {
        $playedBar.css('width', $thisPlayerProgress.width() + 'px');
    }
    $controlBtn.removeClass('pause').addClass('play');
}

var animateProgress = function(subtitles) {
    var totalTime = narrativePlayer.duration();
    var position = narrativePlayer.seek();

    // animate progress bar
    var percentage = position / totalTime;
    $playedBar.css('width', $thisPlayerProgress.width() * percentage + 'px');

    // animate subtitles
    var activeSubtitle = null;

    $('.slide-title').fadeOut();
    for (var i = 0; i < subtitles.length; i++) {
        if (position < subtitles[i]['time']) {
            activeSubtitle = subtitles[i - 1]['transcript'];
            $('.subtitles').show();
            $('.subtitles').text(activeSubtitle);
            break;
        } else {
            // this is the last one
            activeSubtitle = subtitles[i]['transcript'];
            $('.subtitles').show();
            $('.subtitles').text(activeSubtitle);
        }
    }
}

var onAmbientFade = function(ambientVolume) {
    ambientPlayer.volume(ambientVolume);
}

$(document).ready(function() {
    $w = $(window).width();
    $h = $(window).height();

    $slides = $('.slide');
    $navButton = $('.primary-navigation-btn');
    $startCardButton = $('.btn-go');
    $arrows = $('.controlArrow');
    $nextArrow = $arrows.filter('.next');
    $upNext = $('.up-next');
    $controlBtn = $('.control-btn');
    arrowTest = determineArrowTest();

    $startCardButton.on('click', onStartCardButtonClick);
    $slides.on('click', onSlideClick);
    $upNext.on('click', onNextPostClick);
    $arrows.on('click', onArrowsClick);
    $controlBtn.on('click', onControlBtnClick);
    $arrows.on('touchstart', fakeMobileHover);
    $arrows.on('touchend', rmFakeMobileHover);
    $(document).keydown(onDocumentKeyDown);

    ZeroClipboard.config({ swfPath: 'js/lib/ZeroClipboard.swf' });
    var clippy = new ZeroClipboard($(".clippy"));
    clippy.on('ready', function(readyEvent) {
        clippy.on('aftercopy', onClippyCopy);
    });

    setUpFullPage();
    resize();

    // Redraw slides if the window resizes
    window.addEventListener("deviceorientation", resize, true);
    $(window).resize(resize);
});
