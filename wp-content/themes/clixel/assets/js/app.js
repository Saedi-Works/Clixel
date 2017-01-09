/**
 * Project theme functions file.
 */
 $=jQuery.noConflict();

/********************************
Window Ready Functions
*********************************/
// var nav = jQuery('#navigation');

( function( $ ) {

  console.log('hello');

  //. Resize Function
  $( window ).resize(function() {
    console.log('resized');
    windowWidthFunction();
  });


  $(document).ready(function() {
    var view_type = getUrlParameter('type');
    if(view_type == undefined || view_type == 'grid') {
      jQuery("#gallery").unitegallery({
        tile_enable_textpanel:true,
        tile_textpanel_bg_color: "#000",
        tile_textpanel_bg_opacity:0.8,
        tile_textpanel_title_color: "#FFF",
        tile_textpanel_title_text_align: "left",
        tiles_col_width: 450,
        gallery_theme: "tiles"

      });
    }
    else {
      var api;
      var start_id = getUrlParameter('start_id');
      console.log(start_id);
      api = jQuery("#gallery").unitegallery({
        gallery_theme: "slider",
        slider_controls_always_on: true,
        gallery_autoplay:true,
        gallery_control_keyboard: true, 
        slider_enable_bullets: false,
        slider_control_zoom:false,
        gallery_carousel:true,            
        gallery_play_interval: 3000,  
        slider_enable_play_button: true,      
        gallery_pause_on_mouseover: true,
      });
      api.selectItem(parseInt(start_id));
      jQuery('.controls').html('<button id="prev">Prev</button><button id="play">Play</button><button id="next">Next<button>');
      jQuery('#play').click(function() {
        api.togglePlay()
      });
      jQuery('#prev').click(function() {
        api.prevItem()
      });
      jQuery('#next').click(function() {
        api.nextItem()
      });
    }

    jQuery('#switch').click(function() {
      var view_type = getUrlParameter('type');
      var cur_url = window.location.pathname;
      if(view_type == undefined || view_type == 'grid') {
        console.log(jQuery('.visible').index());
        if(jQuery('.visible').index() != -1 ) {
          var start_id = jQuery('.visible').index();
        } 
        else {
          start_id = 0;
        }
        window.location = window.location.pathname + '?type=slider&start_id=' + start_id;
      }
      else {
        window.location = window.location.pathname + '?type=grid';
      }
    });

  });


} )( jQuery );

(function($) {
  $.expr[":"].onScreen = function(elem) {
    var $window = $(window)
    var viewport_top = $window.scrollTop()
    var viewport_height = $window.height()
    var viewport_bottom = viewport_top + viewport_height
    var $elem = $(elem)
    var top = $elem.offset().top
    var height = $elem.height()
    var bottom = top + height

    return (top >= viewport_top && top < viewport_bottom) ||
    (bottom > viewport_top && bottom <= viewport_bottom) ||
    (height > viewport_height && top <= viewport_top && bottom >= viewport_bottom)
  }
})(jQuery);

function getUrlParameter(sParam) {
  var sPageURL = decodeURIComponent(window.location.search.substring(1)),
  sURLVariables = sPageURL.split('&'),
  sParameterName,
  i;

  for (i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split('=');

    if (sParameterName[0] === sParam) {
      return sParameterName[1] === undefined ? true : sParameterName[1];
    }
  }
};

$(window).scroll(function() {
  var view_type = getUrlParameter('type');
  if(view_type == undefined || view_type == 'grid') {
    jQuery('#gallery .ug-thumb-wrapper').removeClass('visible');
    jQuery('#gallery .ug-thumb-wrapper').filter(":onScreen").addClass('visible');
  }
});

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
