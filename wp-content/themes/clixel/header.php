<?php
/**
 * The header for our theme
 *
 * This is the template that displays all of the <head> section and everything up until <div id="content">
 *
 * @link https://developer.wordpress.org/themes/basics/template-files/#template-partials
 *
 * @package Clixel
 */

?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="profile" href="http://gmpg.org/xfn/11">

<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>

<div class="menu-bar active">

	<div class="ham-menu">
		<a href="#">
			<svg width="32px" height="16px" viewBox="0 0 32 16" version="1.1" xmlns="http://www.w3.org/2000/svg" ;="" xmlns:xlink="http://www.w3.org/1999/xlink">
	        	<g id="mobile" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" sketch:type="MSPage">
		            <g id="aticle" sketch:type="MSArtboardGroup" transform="translate(-11.000000, -12.000000)" stroke-linecap="round" stroke="#6B6B6B  " stroke-width="2">
		              <g id="top_bar" sketch:type="MSLayerGroup">
		                <g id="ham" transform="translate(12.000000, 12.000000)" sketch:type="MSShapeGroup">
		                  <path d="M0,1 L30,1" id="Line-Copy" transform="translate(15.000000, 1.000000) scale(-1, 1) translate(-15.000000, -1.000000) "></path>
		                  <path d="M22.5,8 L0,8" id="Line-Copy-2"></path>
		                  <path d="M15,15 L0,15" id="Line-Copy-3"></path>
		                </g>
		              </g>
		            </g>
	        	</g>
	        </svg>
		</a>
		<nav id="site-navigation" class="site-navigation invisible" role="navigation">
			<?php wp_nav_menu( array( 'theme_location' => 'menu-1', 'menu_id' => 'primary-menu' ) ); ?>
		</nav> <!--#site-navigation -->
	</div>
		
	<div class="logo">
		<a href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home">
			<img src="http://localhost/jasper/techniproedu/wp-content/themes/techniproedu/assets/images/logo.png" />
		</a>
	</div>

	<div class="social">
		<a href="#" target="_blank">
			<i class="fa fa-facebook"></i>
		</a>
		<a href="#" target="_blank">
			<i class="fa fa-twitter"></i>
		</a>
		<a href="#" target="_blank">
			<i class="fa fa-google-plus"></i>
		</a>
	</div>

</div>

<div id="page" class="site">

	<a class="skip-link screen-reader-text" href="#content"><?php esc_html_e( 'Skip to content', 'clixel' ); ?></a>

	<header id="masthead" class="site-header" role="banner">

		<nav id="cat-nav" class="main-navigation" role="navigation">
			
			<div class="site-branding">
				<a href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home">
					<img src="http://localhost/jasper/techniproedu/wp-content/themes/techniproedu/assets/images/logo.png" />
				</a>
			</div>

			<ul>
				<li><a href="#"><i class="fa fa-arrow-down"></i></a></li>
				<li><a href="#"><i class="fa fa-search"></i></a></li>
			</ul>
			<!-- TODO : Add active class in the list -->
		    <ul>
		    	<?php wp_list_categories( array(
			        'orderby'    => 'name',
			        'show_count' => false,
			        'current_category' => 1,
			        'depth' => 1,
			        'show_option_all' => 'All',
			        'title_li' => '',
			        'number' => 5,
			        'current_category' => 1,
			        
			       
			    ) ); ?></a>
		    </ul>

		</nav>

	</header><!-- #masthead -->

	<div id="content" class="site-content">
