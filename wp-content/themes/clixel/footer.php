<?php
/**
 * The template for displaying the footer
 *
 * Contains the closing of the #content div and all content after.
 *
 * @link https://developer.wordpress.org/themes/basics/template-files/#template-partials
 *
 * @package Clixel
 */

?>

	</div><!-- #content -->

	<footer id="colophon" class="site-footer" role="contentinfo">
		<div class="site-info pull-left">
			<a href="<?php echo esc_url( __( 'https://wordpress.org/', 'clixel' ) ); ?>"><?php printf( esc_html__( 'Proudly powered by %s', 'clixel' ), 'WordPress' ); ?></a>
			<span class="sep"> | </span>
			<?php printf( esc_html__( 'Theme: %1$s by %2$s.', 'clixel' ), 'clixel', '<a href="https://automattic.com/" rel="designer">saediwork</a>' ); ?>
		</div>
		<!-- .site-info -->
		<div class="controls-wrap pull-right">
			<button id="switch">Switch</button>
			<div class="controls"></div>
		</div>
	</footer><!-- #colophon -->

</div><!-- #page -->

<?php wp_footer(); ?>
</body>
</html>
