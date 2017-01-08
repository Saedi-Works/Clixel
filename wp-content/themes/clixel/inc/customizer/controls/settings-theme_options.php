<?php

$wp_customize->add_setting('default_home_layout', array('default' => 'grid'));
$wp_customize->add_control( new WP_Customize_Control( $wp_customize, 'default_home_layout',
    array(
        'label' => 'Default Home Layout',
        'section' => 'theme_options',
        'type' => 'radio',
        'settings' => 'default_home_layout',
        'choices' => array('grid' => 'Grid','slider' => 'Slider'),
        ) 
    ) 
);

$wp_customize->add_setting('add_download_button', array('default' => 'checked'));
$wp_customize->add_control( new WP_Customize_Control( $wp_customize, 'add_download_button',
    array(
        'label' => 'Enable Download Image Button',
        'section' => 'theme_options',
        'type' => 'checkbox',
        'settings' => 'add_download_button',
        ) 
    ) 
);

$wp_customize->add_setting('copyrite_text', array('default' => 'Copyright (c) Clixel ' . date('Y')));
$wp_customize->add_control( new WP_Customize_Control( $wp_customize, 'copyrite_text',
    array(
        'label' => 'Footer Copyright Text',
        'section' => 'theme_options',
        'settings' => 'copyrite_text',
        ) 
    ) 
);