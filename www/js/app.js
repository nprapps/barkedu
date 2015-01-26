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
var $subtitleWrapper;
var $subtitles;
var $slideTitle;
var $ambientPlayer;
var $narrativePlayer;
var isTouch = Modernizr.touch;
var mobileSuffix;
var aspectWidth = 16;
var aspectHeight = 9;
var optimalWidth;
var optimalHeight;
var w;
var h;
var completion = 0;
var arrowTest;
var lastSlideExitEvent;
var firstRightArrowClicked = false;
var hammer;
var NO_AUDIO = (window.location.search.indexOf('noaudio') >= 0);
var visibilityProperty = null;

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
    AUDIO.checkForAudio(slideAnchor);
    checkForVideo(slideAnchor);

    if ($('#slide-' + slideAnchor).hasClass('image-fade')) {
        fadeBgImage(slideAnchor);
    }

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
    /*
    if ($w < 769) {
        mobileSuffix = '-sq';
    }*/

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

var checkForVideo = function(slideAnchor) {
    var $video = $('#slide-' + slideAnchor).find('video');
    if ($video.length > 0) {
        var sources = $video.find('source');
        var video = $video.get(0);

        if (!sources.attr('src')) {
            sources.attr('src', sources.data('src'));
            video.load();
        }
        video.play();
        $(video).on('ended', function() {
            video.currentTime = 0;
        });
    }
}

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
    AUDIO.checkNarrativeState();
    ANALYTICS.exitSlide(slideIndex.toString(), lastSlideExitEvent);
}

var onFirstRightArrowClick = function() {
    if (firstRightArrowClicked === false) {
        ANALYTICS.firstRightArrowClick(arrowTest);
        firstRightArrowClicked = true;
    }
}

var onStartCardButtonClick = function() {
    lastSlideExitEvent = 'go';
    $.fn.fullpage.moveSlideRight();
    if (isTouch) {
        AUDIO.setAmbientMedia(APP_CONFIG.S3_BASE_URL + '/assets/audio/drone-test.mp3');
        AUDIO.fakeNarrativePlayer();
    }
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

        if ($slides.first().hasClass('active')) {
            AUDIO.setAmbientMedia(APP_CONFIG.S3_BASE_URL + '/assets/audio/drone-test.mp3');
            AUDIO.fakeNarrativePlayer();
        };
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

var onSwipeLeft = function(e) {
    if (isTouch) {
        lastSlideExitEvent = 'swipeleft';
        $.fn.fullpage.moveSlideRight();
    }
}

var onSwipeRight = function(e) {
    if (isTouch) {
        lastSlideExitEvent = 'swiperight';
        $.fn.fullpage.moveSlideLeft();
    }
}

var onControlBtnClick = function(e) {
    e.preventDefault();
    AUDIO.toggleNarrativeAudio();
    e.stopPropagation();
}

var fadeBgImage = function(slideAnchor) {
    $('#slide-' + slideAnchor).addClass('image-fade-start');
}

// use the property name to generate the prefixed event name


var onVisibilityChange = function() {
    AUDIO.toggleAllAudio();
}

var getHiddenProperty = function() {
    var prefixes = ['webkit','moz','ms','o'];

    // if 'hidden' is natively supported just return it
    if ('hidden' in document) return 'hidden';

    // otherwise loop over all the known prefixes until we find one
    for (var i = 0; i < prefixes.length; i++){
        if ((prefixes[i] + 'Hidden') in document)
            return prefixes[i] + 'Hidden';
    }

    // otherwise it's not supported
    return null;
}

var isHidden = function() {
    var prop = getHiddenProperty();
    if (!prop) return false;

    return document[prop];
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
    $narrativePlayer = $('#narrative-player');
    $ambientPlayer = $('#ambient-player');

    $startCardButton.on('click', onStartCardButtonClick);
    $slides.on('click', onSlideClick);
    $upNext.on('click', onNextPostClick);
    $arrows.on('click', onArrowsClick);
    hammer = new Hammer(document.body);
    hammer.on('swipeleft', onSwipeLeft);
    hammer.on('swiperight', onSwipeRight);
    $controlBtn.on('click', onControlBtnClick);
    $arrows.on('touchstart', fakeMobileHover);
    $arrows.on('touchend', rmFakeMobileHover);
    $(document).keydown(onDocumentKeyDown);

    ZeroClipboard.config({ swfPath: 'js/lib/ZeroClipboard.swf' });
    var clippy = new ZeroClipboard($(".clippy"));
    clippy.on('ready', function(readyEvent) {
        clippy.on('aftercopy', onClippyCopy);
    });

    AUDIO.setUpNarrativePlayer();
    AUDIO.setUpAmbientPlayer();
    setUpFullPage();
    resize();

    // Redraw slides if the window resizes
    window.addEventListener("deviceorientation", resize, true);
    $(window).resize(resize);

    // listen for page visibility changes
    visibilityProperty = getHiddenProperty();
    if (visibilityProperty) {
        var evtname = visibilityProperty.replace(/[H|h]idden/,'') + 'visibilitychange';
        document.addEventListener(evtname, onVisibilityChange);
    }
});