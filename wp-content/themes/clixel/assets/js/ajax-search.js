	jQuery(document).ready(function($) {
		var data_val = prompt("Please Enter A number", "");
        ajax_call(data_val);
    });

    jQuery('#testbtn').click(function() {
        ajax_call(jQuery('#test').val());
    });

    function ajax_call(data_val) {
     $.ajax({
        url: myAjax.ajaxurl,
        data: {
            'action':'ajaxdata',
            'data' : data_val
        },
        success:function(data) {
            jQuery('.res').append(data + "<br/>");
            console.log(data);
        },
        error: function(errorThrown){
            console.log(errorThrown);
        }
    });  
 }