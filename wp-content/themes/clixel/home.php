<?php
/**
 * The main template file
 *
 * This is the most generic template file in a WordPress theme
 * and one of the two required files for a theme (the other being style.css).
 * It is used to display a page when nothing more specific matches a query.
 * E.g., it puts together the home page when no home.php file exists.
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package Clixel
 */

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
              
              );
$query1 = new WP_Query( $key_args );
 

while ( $query1->have_posts() ) {
    $query1->the_post();

the_post_thumbnail( 'fashion' );
}
 

wp_reset_postdata();?></div>	

	
		
<?php
get_footer();
