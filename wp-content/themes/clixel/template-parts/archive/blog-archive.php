<?php /*Template Name: Archive*/?>
<?php get_header(); ?>

	<div id="primary" class="content-area">
		<main id="main" class="site-main" role="main">

		<?php
		if ( have_posts() ) : ?>

			<header class="page-header">
				<?php
					the_archive_title( '<h1 class="page-title">', '</h1>' );
					the_archive_description( '<div class="archive-description">', '</div>' );
				?>
			</header><!-- .page-header -->
<?php
 
$key_args=array(
              'post_type' => 'blog',
              
              'posts_per_page' => 30,
              
              'category_name' => 'fashion')
$query1 = new WP_Query( $key_args );
 

while ( $query1->have_posts() ) {
    $query1->the_post();
  echo '<li>' . get_the_title() . '</li>';
  echo '<li>' . get_the_image() . '</li>';
  echo '<li>' . get_the_category() . '</li>';
}
 

wp_reset_postdata();?>
		
	
			
			
get_sidebar();
get_footer();