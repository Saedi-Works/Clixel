/**
 * Project theme functions file.
 */
$=jQuery.noConflict();

/********************************
Window Ready Functions
*********************************/
var nav = jQuery('#navigation');

( function( $ ) {

  console.log('hello');
  windowWidthFunction();


  //. Resize Function
  $( window ).resize(function() {
    console.log('resized');
    windowWidthFunction();
  });

} )( jQuery );


/********************************
Window Load Functions
*********************************/
$(window).load(function(){
    console.log('loaded.');
});

/********************************
Function Declarations
*********************************/
function toTop(){
  var scroll_top_duration = 1400,
  //grab the "back to top" link
  $back_to_top = $('#totop');
  //smooth scroll to top
  $back_to_top.on('click', function(event){
      event.preventDefault();
      $('body,html').animate({
          scrollTop: 0 ,
          }, scroll_top_duration
      );
  });
}

function windowWidthFunction() {
  if (jQuery(window).width() > 480) { 
    console.log('HI me greater than 480');
  }
}
