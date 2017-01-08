<?php
/**
 * The CSS/JS ENQUEUE functions for Clixel
 *
 * Stores all the ENQUEUE Functions of the template.
 *
 * @package Clixel
 * 
 * @since Clixel 1.0
 */
 
/**
 * Enqueue scripts and styles.
 */
function clixel_scripts() {
	wp_enqueue_style( 'clixel-style', get_stylesheet_uri() );

	wp_enqueue_style( 'clixel_theme', get_template_directory_uri() . '/assets/css/clixel.css' );

	wp_enqueue_script( 'jquery');

	wp_enqueue_script( 'clixel-js', get_template_directory_uri() . '/assets/js/clixel.js', array('jquery'), '20151215', true );

	if(is_home() || is_front_page()){

		// Testing the switch gallery
		wp_enqueue_script( 'clixel-unitegallery-js', get_template_directory_uri() . '/assets/gridslider/js/unitegallery.min.js', array(), '20151215', true );
		wp_enqueue_style( 'clixel-unitegallery-css', get_template_directory_uri() . '/assets/gridslider/css/unite-gallery.css');
		wp_enqueue_script( 'clixel-unitegallery-tiles-js', get_template_directory_uri() . '/assets/gridslider/themes/tiles/ug-theme-tiles.js', array(), '20151215', true );
		wp_enqueue_script( 'clixel-unitegallery-slider-js', get_template_directory_uri() . '/assets/gridslider/themes/slider/ug-theme-slider.js', array(), '20151215', true );

	}

	wp_enqueue_script( 'clixel-app-js', get_template_directory_uri() . '/assets/js/app.js', array(), '20151215', true );

	if ( is_rtl() ) { 
		wp_enqueue_style('clixel-rtl_css',get_template_directory_uri().'/assets/css/rtl.css'); 
	}

	// If single page
	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}

	// If is page and is single
	if ( is_page() || is_single() ) {

	}

	if ( !is_admin() ) {

	}
}
add_action( 'wp_enqueue_scripts', 'clixel_scripts' );


/****************** ADMIN CSS & JS ******************/
//Load ADMIN CSS & JS SCRIPTS
function clixel_admin_cssjs() {
	wp_enqueue_style( 'clixel_backend', get_template_directory_uri() . '/assets/css/backend.css' );
}
add_action( 'admin_enqueue_scripts', 'clixel_admin_cssjs' );

?>