<?php
$wp_customize->add_setting('color');
$wp_customize->add_control( 
	new WP_Customize_Color_Control( 
	$wp_customize, 
	'color', 
	array(
		'label'      => "Text Color",
		'section'    => 'header_textcolor',
		'settings'   => 'color',
	) ) 
);