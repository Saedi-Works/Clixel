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
	$wp_customize->add_panel( 'basic_panel', array(
		'priority' => 1,
	    'capability' => 'edit_theme_options',
	    'theme_supports' => '',
	    'title' => __( 'Basic', 'optimizer' ),
	) );
	
	$wp_customize->add_panel( 'header_panel', array(
		'priority' => 1,
	    'capability' => 'edit_theme_options',
	    'theme_supports' => '',
	    'title' => __( 'Header', 'optimizer' ),
	) );

	
	$wp_customize->add_panel( 'front_panel', array(
		'priority' => 1,
	    'capability' => 'edit_theme_options',
	    'theme_supports' => '',
	    'title' => __( 'Front Page', 'optimizer' ),
	) );
	
	
	$wp_customize->add_panel( 'footer_panel', array(
		'priority' => 1,
	    'capability' => 'edit_theme_options',
	    'theme_supports' => '',
	    'title' => __( 'Footer', 'optimizer' ),
	) );
	
	
	$wp_customize->add_panel( 'singlepages_panel', array(
		'priority' => 1,
	    'capability' => 'edit_theme_options',
	    'theme_supports' => '',
	    'title' => __( 'Post & Page', 'optimizer' ),
	) );


			
	$wp_customize->add_panel( 'misc_panel', array(
		'priority' => 1,
	    'capability' => 'edit_theme_options',
	    'theme_supports' => '',
	    'title' => __( 'Miscellaneous', 'optimizer' ),
	) );
	
	
	$wp_customize->add_panel( 'help_panel', array(
		'priority' => 2,
	    'capability' => 'edit_theme_options',
	    'theme_supports' => '',
	    'title' => __( 'Help', 'optimizer' ),
	) );
	 $wp_customize->add_section(
            'social_section',
            array(
                'title'    => __( 'Social Options','clixel' ),
                'panel' => 'theme_options',
                'priority' => 8,
                )
            );
  $wp_customize->add_section(
            'default_screen_section',
            array(
                'title'    => __( 'Default Page','clixel' ),
      
                'priority' => 8,
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
   $wp_customize->add_setting( 'Download');

   $wp_customize->add_control(
    'Download',
    array(
        'type' => 'checkbox',
        'label' => 'Download',
        'section' => 'theme_options',
    )
); 
		
        
				
        
		

        
		
		
        $wp_customize->add_section( 'socialshare_section', array(
            'title'       => __( 'Social Share Buttons', 'optimizer' ),
            'priority'    => 10,
            'panel'       => 'singlepages_panel',
			'description' => __( 'To view the live changes you make in this section, select a post or a page from the Top bar dropdown list located at the top right corner of the screen.', 'optimizer' ),
        ) );
		
      
		
        $wp_customize->add_section( 'socialinks_section', array(
            'title'       => __( 'Social Links', 'optimizer' ),
            'priority'    => 10,
            'panel'       => 'misc_panel',
			'description' => __( 'Social Bookmark Links Settings', 'optimizer' ),
        ) );
       
        ) );
		
		

      






$wp_customize->remove_section( 'custom_css' );
  
require(get_template_directory() . '/inc/customizer/controls/settings-misc.php');

}
add_action( 'customize_register', 'clixel_customize_register' );

/**
 * Binds JS handlers to make Theme Customizer preview reload changes asynchronously.
 */f




include_once(get_template_directory() . 'inc/customizer/extra.php');
 

function clixel_customize_preview_js() {
	wp_enqueue_script( 'clixel_customizer', get_template_directory_uri() . 'inc/customizer/assets/customizer.js', array( 'customize-preview' ), '20151215', true );
}
add_action( 'customize_preview_init', 'clixel_customize_preview_js' );
