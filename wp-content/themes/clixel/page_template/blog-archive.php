<?php /*Template Name: Blog-Archive*/?>
get_header(); ?>

	<div id="primary" class="content-area">
		<main id="main" class="site-main" role="main">
		
			
			<!-- Documentation about data-image, data-description http://unitegallery.net/index.php?page=documentation#gallery_structure -->
			<!-- Documentation about grid http://unitegallery.net/index.php?page=tiles-columns-options -->
			<!-- Documentation about slider, data-description http://unitegallery.net/index.php?page=slider-options -->
			<div id="gallery" style="display:none;">
				
				

			
			<?php
 
$key_args=array(
              'post_type' => 'post',
              
              'posts_per_page' => 30,
              
              'category_name' => 'fashion')
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