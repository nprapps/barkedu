document.addEventListener('DOMContentLoaded',function(e){
var pop = Popcorn( '#moodmusic');

/////////////// !CHAPTER 1
//start
pop.code({
	start: 1,
	end: 1.5,
	onStart: function( options ) {
    	$('.kante').addClass('size-up');
	}
});

/////////////// end     
},false);

