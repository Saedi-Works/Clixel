<?php

$wp_customize->add_setting('facebook_url');
$wp_customize->add_control( new WP_Customize_Control( $wp_customize, 'facebook_url',
    array(
        'label' => 'Facebook Url',
        'section' => 'social_section',
        'settings' => 'facebook_url',
        ) 
    ) 
);

$wp_customize->add_setting('twitter_url');
$wp_customize->add_control( new WP_Customize_Control( $wp_customize, 'twitter_url',
    array(
        'label' => 'Twitter Url',
        'section' => 'social_section',
        'settings' => 'twitter_url',
        ) 
    ) 
);

$wp_customize->add_setting('googleplus_url');
$wp_customize->add_control( new WP_Customize_Control( $wp_customize, 'googleplus_url',
    array(
        'label' => 'Google Plus Url',
        'section' => 'social_section',
        'settings' => 'googleplus_url',
        ) 
    ) 
);

$wp_customize->add_setting('pinterest_url');
$wp_customize->add_control( new WP_Customize_Control( $wp_customize, 'pinterest_url',
    array(
        'label' => 'Pinterest Url',
        'section' => 'social_section',
        'settings' => 'pinterest_url',
        ) 
    ) 
);

$wp_customize->add_setting('instagram_url');
$wp_customize->add_control( new WP_Customize_Control( $wp_customize, 'instagram_url',
    array(
        'label' => 'Instagram Url',
        'section' => 'social_section',
        'settings' => 'instagram_url',
        ) 
    ) 
);

$wp_customize->add_setting('youtube_url');
$wp_customize->add_control( new WP_Customize_Control( $wp_customize, 'youtube_url',
    array(
        'label' => 'Youtube Url',
        'section' => 'social_section',
        'settings' => 'youtube_url',
        ) 
    ) 
);

$wp_customize->add_setting('linkedin_url');
$wp_customize->add_control( new WP_Customize_Control( $wp_customize, 'linkedin_url',
    array(
        'label' => 'Linkedin Url',
        'section' => 'social_section',
        'settings' => 'linkedin_url',
        ) 
    ) 
);

$wp_customize->add_setting('dribble_url');
$wp_customize->add_control( new WP_Customize_Control( $wp_customize, 'dribble_url',
    array(
        'label' => 'Dribble Url',
        'section' => 'social_section',
        'settings' => 'dribble_url',
        ) 
    ) 
);

$wp_customize->add_setting('behance_url');
$wp_customize->add_control( new WP_Customize_Control( $wp_customize, 'behance_url',
    array(
        'label' => 'Behance Url',
        'section' => 'social_section',
        'settings' => 'behance_url',
        ) 
    ) 
);