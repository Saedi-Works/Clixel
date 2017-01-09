<?php
$wp_customize->add_setting('color');
$wp_customize->add_control( 
	new WP_Customize_Color_Control( 
	$wp_customize, 
	'text_color', 
	array(
		'label'      => __( 'Text Color', 'Clixel' ),
		'section'    => 'Colors',
		'settings'   => 'color',
	) ) 
);