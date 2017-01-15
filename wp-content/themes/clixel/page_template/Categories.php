<?php /*Template Name: Categories-Page*/?>
get_header(); ?>

	<div id="primary" class="content-area">
		<main id="main" class="site-main" role="main">
		
			
			<!-- Documentation about data-image, data-description http://unitegallery.net/index.php?page=documentation#gallery_structure -->
			<!-- Documentation about grid http://unitegallery.net/index.php?page=tiles-columns-options -->
			<!-- Documentation about slider, data-description http://unitegallery.net/index.php?page=slider-options -->
			<div id="gallery" style="display:none;">
				
				

			
			<?php
 $menu = wp_get_nav_menu_items($menu_id,array(
   'posts_per_page' => -1,
   'meta_key' => '_menu_item_object_id',
   'meta_value' => $post->ID // the currently displayed post
));

$catvalue=($menu[0]->ID);
$key_args=array(
              'post_type' => 'post',
              
              'posts_per_page' => 30,
              
              'cat' => $catvalue)
$query1 = new WP_Query( $key_args );
 

while ( $query1->have_posts() ) {
    $query1->the_post();
$cats = get_the_category( get_the_ID() );
$cat_name = $cats[0]->name;
$attr=array('alt'=>$cat_name);

the_post_thumbnail($size,$attr );
 }

wp_reset_postdata();?>
		
	
			
			
get_sidebar();
get_footer();