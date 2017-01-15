<?php /*Template Name: Portfolio-Archive*/?>
get_header(); ?>

	<div id="primary" class="content-area">
		<main id="main" class="site-main" role="main">
		
			
			<!-- Documentation about data-image, data-description http://unitegallery.net/index.php?page=documentation#gallery_structure -->
			<!-- Documentation about grid http://unitegallery.net/index.php?page=tiles-columns-options -->
			<!-- Documentation about slider, data-description http://unitegallery.net/index.php?page=slider-options -->
			<div id="gallery" style="display:none;">
				
				

			
			
<?php
  $idObj = get_category_by_slug('fashion'); 
  $id = $idObj->term_id;
$key_args=array(
              'post_type' => 'blog',
              
              'posts_per_page' => 30,
              
              'cat_not_in'=> $id)
$query1 = new WP_Query( $key_args );
 

while ( $query1->have_posts() ) {
    $query1->the_post();
$cats = get_the_category( get_the_ID() );
$cat_name = $cats[0]->name;
$attr=array('alt'=>$cat_name);

the_post_thumbnail($size,$attr );


}

wp_reset_postdata();?>
		
			<?php
			/* Start the Loop */
			while ( have_posts() ) : the_post();

				/*
				 * Include the Post-Format-specific template for the content.
				 * If you want to override this in a child theme, then include a file
				 * called content-___.php (where ___ is the Post Format name) and that will be used instead.
				 */
				get_template_part( 'template-parts/content', get_post_format() );

			endwhile;

			the_posts_navigation();

		else :

			get_template_part( 'template-parts/content', 'none' );

		endif; ?>

		</main><!-- #main -->
	</div><!-- #primary -->

<?php
get_sidebar();
get_footer();