<?php
/* Template Name: Ajax Example */

get_header();
?>

<?php
get_footer();
?>
<script type="text/javascript">
	jQuery(document).ready(function($) {
 	var p = prompt("Please enter your name", "");
 	alert(p);
    // We'll pass this variable to the PHP function example_ajax_request
    // var fruit = 'Banana';
     
    // // This does the ajax request
    // $.ajax({
    //     url: ajaxurl,
    //     data: {
    //         'action':'showdata',
    //         'fruit' : fruit
    //     },
    //     success:function(data) {
    //         // This outputs the result of the ajax request
    //         console.log(data);
    //     },
    //     error: function(errorThrown){
    //         console.log(errorThrown);
    //     }
    // });  
              
});

</script>