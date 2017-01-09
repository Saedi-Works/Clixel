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
		
		<button id="switch" style="position: fixed;z-index: 999999">Switch</button>
	<!-- Documentation about data-image, data-description http://unitegallery.net/index.php?page=documentation#gallery_structure -->
	<!-- Documentation about grid http://unitegallery.net/index.php?page=tiles-columns-options -->
	<!-- Documentation about slider, data-description http://unitegallery.net/index.php?page=slider-options -->
	<div id="gallery" style="display:none;">
		
		<a href="#!">
			<img alt="Lemon Slice"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile12.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile12.jpg"
			data-description="This is a Lemon Slice"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Lemon Slice"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile11.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile11.jpg"
			data-description="This is a Lemon Slice"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Lemon Slice"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile1.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile1.jpg"
			data-description="This is a Lemon Slice"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Peppers"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile2.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile2.jpg"
			data-description="Those are peppers"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Keys"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile3.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile3.jpg"
			data-description="Those are keys"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Friuts in cup"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile4.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile4.jpg"
			data-description="Those are friuts in a cup"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Yellow Flowers"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile5.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile5.jpg"
			data-description="Those are yellow flowers"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Butterfly"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile6.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile6.jpg"
			data-description="This is butterfly"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Boat"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile7.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile7.jpg"
			data-description="This is a boat"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Woman"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile8.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile8.jpg"
			data-description="This is a woman"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Cup Of Coffee"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile9.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile9.jpg"
			data-description="This is cup of coffee"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Iphone Back"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile10.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile10.jpg"
			data-description="This is iphone back"
			style="display:none">
		</a>
		<a href="#!">
			<img alt="Lemon Slice"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile1.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile1.jpg"
			data-description="This is a Lemon Slice"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Peppers"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile2.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile2.jpg"
			data-description="Those are peppers"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Keys"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile3.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile3.jpg"
			data-description="Those are keys"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Friuts in cup"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile4.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile4.jpg"
			data-description="Those are friuts in a cup"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Yellow Flowers"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile5.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile5.jpg"
			data-description="Those are yellow flowers"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Butterfly"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile6.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile6.jpg"
			data-description="This is butterfly"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Boat"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile7.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile7.jpg"
			data-description="This is a boat"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Woman"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile8.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile8.jpg"
			data-description="This is a woman"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Cup Of Coffee"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile9.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile9.jpg"
			data-description="This is cup of coffee"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Iphone Back"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile10.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile10.jpg"
			data-description="This is iphone back"
			style="display:none">
		</a>
		<a href="#!">
			<img alt="Lemon Slice"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile1.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile1.jpg"
			data-description="This is a Lemon Slice"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Peppers"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile2.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile2.jpg"
			data-description="Those are peppers"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Keys"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile3.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile3.jpg"
			data-description="Those are keys"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Friuts in cup"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile4.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile4.jpg"
			data-description="Those are friuts in a cup"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Yellow Flowers"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile5.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile5.jpg"
			data-description="Those are yellow flowers"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Butterfly"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile6.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile6.jpg"
			data-description="This is butterfly"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Boat"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile7.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile7.jpg"
			data-description="This is a boat"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Woman"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile8.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile8.jpg"
			data-description="This is a woman"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Cup Of Coffee"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile9.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile9.jpg"
			data-description="This is cup of coffee"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Iphone Back"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile10.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile10.jpg"
			data-description="This is iphone back"
			style="display:none">
		</a>
		<a href="#!">
			<img alt="Lemon Slice"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile1.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile1.jpg"
			data-description="This is a Lemon Slice"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Peppers"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile2.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile2.jpg"
			data-description="Those are peppers"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Keys"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile3.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile3.jpg"
			data-description="Those are keys"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Friuts in cup"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile4.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile4.jpg"
			data-description="Those are friuts in a cup"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Yellow Flowers"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile5.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile5.jpg"
			data-description="Those are yellow flowers"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Butterfly"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile6.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile6.jpg"
			data-description="This is butterfly"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Boat"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile7.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile7.jpg"
			data-description="This is a boat"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Woman"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile8.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile8.jpg"
			data-description="This is a woman"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Cup Of Coffee"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile9.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile9.jpg"
			data-description="This is cup of coffee"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Iphone Back"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile10.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile10.jpg"
			data-description="This is iphone back"
			style="display:none">
		</a>
		<a href="#!">
			<img alt="Lemon Slice"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile1.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile1.jpg"
			data-description="This is a Lemon Slice"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Peppers"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile2.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile2.jpg"
			data-description="Those are peppers"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Keys"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile3.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile3.jpg"
			data-description="Those are keys"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Friuts in cup"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile4.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile4.jpg"
			data-description="Those are friuts in a cup"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Yellow Flowers"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile5.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile5.jpg"
			data-description="Those are yellow flowers"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Butterfly"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile6.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile6.jpg"
			data-description="This is butterfly"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Boat"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile7.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile7.jpg"
			data-description="This is a boat"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Woman"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile8.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile8.jpg"
			data-description="This is a woman"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Cup Of Coffee"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile9.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile9.jpg"
			data-description="This is cup of coffee"
			style="display:none">
		</a>

		<a href="#!">
			<img alt="Iphone Back"
			src="<?php echo get_template_directory_uri();?>/assets/gridslider/images/thumbs/tile10.jpg"
			data-image="<?php echo get_template_directory_uri();?>/assets/gridslider/images/big/tile10.jpg"
			data-description="This is iphone back"
			style="display:none">
		</a>

	</div>
	<div class="controls"></div>	

		<?php
		if ( have_posts() ) :

			if ( is_home() && ! is_front_page() ) : ?>
				<header>
					<h1 class="page-title screen-reader-text"><?php single_post_title(); ?></h1>
				</header>

			<?php
			endif;

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
get_footer();
