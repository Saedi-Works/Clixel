<?php
$wp_customize->add_setting('logo_image');

$wp_customize->add_control(new WP_Customize_Upload_Control($wp_customize,'logo_image',array(
 'label'      => __('logo', 'clixel'),
 'section'    => 'logo',
 'settings'   => 'logo_image',
 )));