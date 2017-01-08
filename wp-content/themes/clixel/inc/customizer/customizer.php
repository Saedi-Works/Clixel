<?php
/**
 * Clixel Theme Customizer
 *
 * @package Clixel
 */

/**
 * Add postMessage support for site title and description for the Theme Customizer.
 *
 * @param WP_Customize_Manager $wp_customize Theme Customizer object.
 */
function clixel_customize_register( $wp_customize ) {
	$wp_customize->get_setting( 'blogname' )->transport         = 'postMessage';
	$wp_customize->get_setting( 'blogdescription' )->transport  = 'postMessage';
	$wp_customize->get_setting( 'header_textcolor' )->transport = 'postMessage';

    $wp_customize->add_setting('your_theme_logo');
    $wp_customize->add_control( new WP_Customize_Image_Control( $wp_customize, 'your_theme_logo',
        array(
            'label' => 'Upload Logo',
            'section' => 'title_tagline',
            'settings' => 'your_theme_logo',
            ) 
        ) 
    );

    $wp_customize->add_section(
        'social_section',
        array(
            'title'    => __( 'Social Options','clixel' ),
            'priority' => 18,
            )
        );
    $wp_customize->add_section(
        'default_screen_section',
        array(
            'title'    => __( 'Default Page','clixel' ),

            'priority' => 18,
            )
        );
    $wp_customize->add_section(
        'theme_options',
        array(
            'title' => __( 'Theme Options','clixel' ),
            'priority' => 2,
            )
        );
    $wp_customize->add_section(
        'widgets',
        array(
            'title' => __( 'Widgets','clixel' ),
            'priority' => 2,
            )
        );
    $wp_customize->add_section(
        'Colors',
        array(
            'title' => __( 'Colors','clixel' ),
            'priority' => 2,
            'default' => '#008080',
            )
        ); 
    $wp_customize->add_section(
        'logo',
        array(
            'title' => __( 'logo','clixel' ),
            'priority' => 2,

            ));
    require_once(get_template_directory() . '/inc/customizer/controls/settings-theme_options.php');
require_once(get_template_directory() . '/inc/customizer/controls/settings-social.php');
require_once(get_template_directory() . '/inc/customizer/controls/settings-logo.php');
require_once(get_template_directory() . '/inc/customizer/controls/settings-color.php');
}
add_action( 'customize_register', 'clixel_customize_register' );

/**
 * Binds JS handlers to make Theme Customizer preview reload changes asynchronously.
 */


function clixel_customize_preview_js() {
	wp_enqueue_script( 'clixel_customizer', get_template_directory_uri() . '/js/customizer.js', array( 'customize-preview' ), '20151215', true );
}
add_action( 'customize_preview_init', 'clixel_customize_preview_js' );


