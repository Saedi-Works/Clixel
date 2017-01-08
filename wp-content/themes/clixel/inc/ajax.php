<?php
function ajaxdata() {

    // The $_REQUEST contains all the data sent via ajax
    if ( isset($_REQUEST) ) {

        $data = $_REQUEST['data'];
        // Let's take the data that was sent and do something with it
        echo $data * $data;


    }

    // Always die in functions echoing ajax content
    die();
}
add_action('wp_ajax_ajaxdata', 'ajaxdata');
add_action( 'wp_ajax_nopriv_ajaxdata', 'ajaxdata' );

function ajax_filters() {
    wp_enqueue_script( 'ajax-search', get_stylesheet_directory_uri() . '/assets/js/ajax-search.js', array( 'jquery' ), '1.0.0', true );
    wp_localize_script( 'ajax-search', 'myAjax', array( 'ajaxurl' => admin_url( 'admin-ajax.php' ) ) );
}
add_action( 'wp_enqueue_scripts', 'ajax_filters' );
?>