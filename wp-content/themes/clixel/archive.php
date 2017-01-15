<?php
/**
 * The template for displaying archive pages
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package Clixel
 */

get_header(); 
?>

	<div id="primary" class="content-area">
		<main id="main" class="site-main" role="main">
		
			
			<!-- Documentation about data-image, data-description http://unitegallery.net/index.php?page=documentation#gallery_structure -->
			<!-- Documentation about grid http://unitegallery.net/index.php?page=tiles-columns-options -->
			<!-- Documentation about slider, data-description http://unitegallery.net/index.php?page=slider-options -->
			<div id="gallery" >
				

			<?php
	//$menu = wp_get_nav_menu_items($menu_id,array(
   //'posts_per_page' => -1,
   //'meta_key' => '_menu_item_object_id',
  // 'meta_value' => $post->ID // the currently displayed post
//));

//$catvalue=($menu[0]->ID);
	

$key_args=array(
              'post_type' => 'post',
              
              'posts_per_page' => 30,
              
            'category_name'=> (single_cat_title(  '', false )) );

$query1 = new WP_Query( $key_args );
 

while ( $query1->have_posts() ) {
    $query1->the_post();
//$cat_name = $cats[0]->name;
//$attr=array('alt'=>$cat_name);

the_post_thumbnail();


}
 

wp_reset_postdata();?></div>	
		<?	

	


get_footer();
	
		
