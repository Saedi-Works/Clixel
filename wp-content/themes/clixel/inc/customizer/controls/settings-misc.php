<?php


//======================MISC SECTION===============================

//------SOCIAL LINKS SETTINGS

//Social links Icons Style
$wp_customize->add_setting('social_button', array(
		'type' => 'option',
        'default' => 'simple',
		'sanitize_callback' => 'optimizer_sanitize_choices',
		'transport' => 'postMessage',
) );
 
			$wp_customize->add_control(  'social_button_style', array(
					'type' => 'radio-image',
					'label' => __('Social links Icons Style','clixel'),
					'section' => 'socialinks_section',
					'settings' => 'social_button',
					//'choices' => array(
						//'simple' => array( 'url' => get_template_directory_uri().'/assets/images/social/social_simple.png', 'label' => 'Round' ),
					),
			) ));


//Social Icons Position




//-------------------SOCIAL LINKS----------------------

//Facebook URL
$wp_customize->add_setting('facebook', array(
	'type' => 'option',
	'default' => '',
	'sanitize_callback' => 'esc_url_raw',
	'transport' => 'postMessage',
) );
			$wp_customize->add_control('facebook', array(
				'type' => 'text',
				'label' => __('LINK 1','clixel'),
				'section' => 'socialinks_section',
				'settings' => 'facebook',
			) );


//Twitter URL
$wp_customize->add_setting('twitter', array(
	'type' => 'option',
	'default' => '',
	'sanitize_callback' => 'esc_url_raw',
	'transport' => 'postMessage',
) );
			$wp_customize->add_control('twitter', array(
				'type' => 'text',
				'label' => __('LINK 2','clixel'),
				'section' => 'socialinks_section',
				'settings' => 'twitter',
			) );

//Google Plus URL
