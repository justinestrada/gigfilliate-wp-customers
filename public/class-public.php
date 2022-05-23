<?php

/**
 * The public-facing functionality of the plugin.
 *
 * @link       https://partners.vitalibis.com/login
 * @since      0.0.1
 *
 * @package    Gigfilliate_Order_For_Customer
 * @subpackage Gigfilliate_Order_For_Customer/public
 */

/**
 * The public-facing functionality of the plugin.
 *
 * Defines the plugin name, version, and two examples hooks for how to
 * enqueue the public-facing stylesheet and JavaScript.
 *
 * @package    Gigfilliate_Order_For_Customer
 * @subpackage Gigfilliate_Order_For_Customer/public
 * @author     Gigfilliate <justin@justinestrada.com>
 */
class Gigfilliate_Order_For_Customer_Public
{

  private $plugin_name;
  private $version;
  public $helpers;
  public $cookie_name;
  public $is_user_logged_in;
  public $current_user_id;
  public $primary_affiliate_coupon_code;
  public $my_customers;

  /**
   * Initialize the class and set its properties.
   *
   * @since    0.0.1
   * @param      string    $plugin_name       The name of the plugin.
   * @param      string    $version    The version of this plugin.
   */
  public function __construct($plugin_name, $version, $helpers)
  {
    $this->plugin_name = $plugin_name;
    $this->version = $version;
    $this->helpers = $helpers;
    $this->cookie_name = 'GIGFILLIATE_PLACING_ORDER_FOR_CUSTOMER';
    $this->core_settings = json_decode(get_option('vitalibis_settings'));
    $this->new_account_page();
    add_action('wp_ajax_gofc_check_email_exists', [$this, 'ajax_check_email_exists']);
    add_action('wp_ajax_gofc_get_products', [$this, 'ajax_get_products']);
    add_action('wp_ajax_gofc_reset_cart', [$this, 'ajax_reset_cart']);
    add_action('woocommerce_before_cart_contents', [$this, 'customer_notice']);
    add_action('cfw_after_customer_info_tab_login', [$this, 'customer_notice'], 10, 3);
    add_action('cfw_checkout_after_login', [$this, 'customer_notice'], 10, 3);
    add_action('xoo_wsc_cart_after_head', [$this, 'customer_notice'], 10, 3);
    add_filter('body_class', [$this, 'body_classes']);
    add_action('woocommerce_checkout_update_order_meta', [$this, 'woocommerce_checkout_update_order_meta']);
    add_action('woocommerce_admin_order_data_after_billing_address', [$this, 'woocommerce_admin_order_data_after_billing_address'], 10, 1);
    add_action('woocommerce_checkout_process', [$this, 'woocommerce_checkout_process']);
    add_action('wp_footer', [$this, 'toast']);
    add_filter('gigfilliatewp_order_volume_type', [$this, 'gigfilliatewp_order_volume_type'], 20, 3);
  }

  /**
   * Register the stylesheets for the public-facing side of the site.
   *
   * @since    0.0.1
   */
  public function enqueue_styles()
  {
    wp_enqueue_style($this->plugin_name, plugin_dir_url(__FILE__) . 'css/public.css', [], $this->version, 'all');
  }

  /**
   * Register the JavaScript for the public-facing side of the site.
   *
   * @since    0.0.1
   */
  public function enqueue_scripts()
  {
    wp_enqueue_script($this->plugin_name, plugin_dir_url(__FILE__) . 'js/public.js', ['jquery'], $this->version, false);
    wp_localize_script(
      $this->plugin_name,
      'GOFC',
      [
        'ajax_url' => admin_url('admin-ajax.php'),
        'cookie_name' => $this->cookie_name,
        'cart_url' => wc_get_cart_url(),
        'customers_url' => get_site_url() . '/account/brand-partner-customers/',
      ]
    );
  }

  public function gigfilliatewp_order_volume_type($volume_type)
  {
    $volume_type = (isset($_COOKIE[$this->cookie_name]) ? 'CUSTOMER' : 'PERSONAL');
    return $volume_type;
  }

  public function new_account_page()
  {
    // Register new endpoint to use for My Account page
    // Any change here resave Permalinks or it will give 404 error
    add_action('init', function () {
      if (!$this->is_it_valid_to_show_customer()) return;
      add_rewrite_endpoint('brand-partner-customers', EP_ROOT | EP_PAGES);
    });
    // Add new query var
    add_filter('query_vars', function ($vars) {
      if (!$this->is_it_valid_to_show_customer()) return $vars;
      $vars[] = 'brand-partner-customers';
      return $vars;
    }, 0);
    // Insert the new endpoint into the My Account menu
    add_filter('woocommerce_account_menu_items', function ($menu_links) {
      if (!$this->is_it_valid_to_show_customer()) return $menu_links;
      $new_menu_links = [
        'brand-partner-customers' => $this->core_settings->affiliate_term . ' Customers'
      ];
      $menu_links = array_slice($menu_links, 0, 1, true)
        + $new_menu_links
        + array_slice($menu_links, 1, NULL, true);
      return $menu_links;
    });
    // Add content to the new endpoint
    add_action('woocommerce_account_brand-partner-customers_endpoint', function () {
      if (!$this->is_it_valid_to_show_customer()) return;
      $this->new_account_page_content();
    });
  }

  public function is_it_valid_to_show_customer() {
    if (!is_user_logged_in()){
      return false;
    }
    $v_affiliate_status = get_user_meta(get_current_user_id(), 'v_affiliate_status', true);
    if (!$v_affiliate_status || $v_affiliate_status != 'active'){
      return false;
    }
    return true;
  }

  public function new_account_page_content()
  {
    $this->is_user_logged_in = is_user_logged_in();
    ob_start();
    ?>
    <div style="margin-bottom: 1rem;">
      <h1><?php echo $this->core_settings->affiliate_term ?> Customers</h1>
      <?php
      if (!$this->is_user_logged_in) {
      ?>
        <p>Not logged in, you must be logged in and an active <?php echo $this->core_settings->affiliate_term ?> to see your customers.</p>
      <?php
      } else {
        $this->current_user_id = get_current_user_id();
        $this->current_user = wp_get_current_user();
        $this->primary_affiliate_coupon_code = get_user_meta($this->current_user_id, 'primary_affiliate_coupon_code', true);
        $this->my_customers = $this->helpers->get_customers($this->current_user_id, $this->current_user, 20, false, 'za');
        require_once plugin_dir_path(dirname(__FILE__)) . 'public/views/customers.php';
        require_once plugin_dir_path(dirname(__FILE__)) . 'public/views/modal/add-new-customer.php';
        require_once plugin_dir_path(dirname(__FILE__)) . 'public/views/products.php';
        require_once plugin_dir_path(dirname(__FILE__)) . 'public/views/modal/are-you-sure.php';
      }
      ?>
    </div>
    <?php
    echo ob_get_clean();
  }

  public function ajax_check_email_exists()
  {
    $res = array('success' => false);
    if (!isset($_POST['action']) || $_POST['action'] !== 'gofc_check_email_exists') {
      exit(json_encode($res));
    }
    if (!isset($_POST['email'])) {
      $res['msg'] = 'Email is required.';
      exit(json_encode($res));
    }
    $res['exists'] = email_exists($_POST['email']);
    $res['success'] = $res['exists'] = ($res['exists']) ? true : false;
    exit(json_encode($res));
  }

  public function customer_notice()
  {
    if (isset($_COOKIE[$this->cookie_name])) {
      $customer = get_user_by('email', $_COOKIE[$this->cookie_name]);
      $primary_coupon_code = get_user_meta(get_current_user_id(), 'primary_affiliate_coupon_code', true);
      $this->apply_default_coupon($primary_coupon_code);
    ?>
      <div class="alert alert-info" role="alert">
        <i class="fa fa-info-circle mr-1" aria-hidden="true"></i>
        You're placing an order for <?php echo $_COOKIE[$this->cookie_name]; ?>.
      </div>
      <input type="hidden" name="new_billing_email" value="<?php echo ($customer != null ? $customer->user_email : $_COOKIE[$this->cookie_name]); ?>">
      <?php
    }
  }

  public function body_classes($classes)
  {
    if (isset($_COOKIE[$this->cookie_name])) {
      $classes[] = 'page-place-order-for-customer-mode';
    }
    return $classes;
  }

  public function apply_default_coupon($coupon_code)
  {
    if (!$coupon_code || WC()->cart->has_discount($coupon_code)) return;
    WC()->cart->remove_coupons();
    WC()->cart->apply_coupon($coupon_code);
  }

  public function ajax_reset_cart()
  {
    WC()->cart->remove_coupons();
    WC()->cart->empty_cart();
    wp_die(true);
  }

  public function ajax_get_products()
  {
    $res = ['success' => false, 'products' => []];
    if (!isset($_POST['action']) || $_POST['action'] !== 'gofc_get_products') {
      exit(json_encode($res));
    }
    $args = [
      'post_type' => 'product',
      'posts_per_page' => -1,
      'orderby' => 'title',
      'order' => 'ASC',
      'post_status' => ['publish'],
      'tax_query'   => [[
        'taxonomy'  => 'product_visibility',
        'terms'     => ['exclude-from-catalog'],
        'field'     => 'name',
        'operator'  => 'NOT IN',
      ]]
    ];
    $order_by = $_POST['order_by'];
    if ($order_by == 'title_z_a') {
      $args['order'] = 'DESC';
    }
    if ($order_by == 'latest') {
      $args['order'] = 'ASC';
      $args['orderby'] = 'publish_date';
    }
    if ($order_by == 'price_low_high') {
      $args['order'] = 'ASC';
      $args['orderby'] = 'meta_value_num';
      $args['meta_key'] = '_price';
    }
    if ($order_by == 'price_high_low') {
      $args['order'] = 'DESC';
      $args['orderby'] = 'meta_value_num';
      $args['meta_key'] = '_price';
    }
    if (isset($_POST['search'])) {
      $args['s'] = $_POST['search'];
    }
    if (isset($this->core_settings->dashboard->excluded_product_ids_from_order_for_customer) && $this->core_settings->dashboard->excluded_product_ids_from_order_for_customer != null) {
      $args['post__not_in'] = explode(',', $this->core_settings->dashboard->excluded_product_ids_from_order_for_customer);
    }
    $products = (new WP_Query($args))->posts;
    $res['success'] = true;
    if (empty($products)) {
      exit(json_encode($res));
    }
    foreach ($products as $post) {
      $product = wc_get_product($post->ID);
      $res['products'][] = [
        "id" => $post->ID,
        "thumbnail_url" => wp_get_attachment_url($product->get_image_id()),
        "name" => $product->get_name(),
        "price" => $product->get_regular_price(),
        "sku" => $product->get_sku(),
        "add_to_cart_url" => $product->add_to_cart_url(),
        "is_in_stock" => $product->is_in_stock(),
        "wcsatt_schemes" => get_post_meta($post->ID, '_wcsatt_schemes', true),
        "variations" => ($product->is_type( 'variable' )?$product->get_available_variations():''),
      ];
    }
    exit(json_encode($res));
  }

  public function toast()
  {
    if (!isset($_COOKIE[$this->cookie_name])) {
      return;
    }
    $cokkie_email = $_COOKIE[$this->cookie_name];
    $orders = wc_get_orders(array(
      'limit'        => 1,
      'post_status' => array('wc-completed', 'wc-processing'),
      'orderby' => 'date',
      'order' => 'DESC',
      'customer' => $cokkie_email
    ));
    if ($orders != null) {
      $customer = $orders[0];
      ?>
      <span id="gofc_customer_billing" data-email="<?php echo $cokkie_email; ?>" data-firstName="<?php echo $customer->get_billing_first_name(); ?>" data-lastName="<?php echo $customer->get_billing_last_name(); ?>" data-company="<?php echo $customer->get_billing_company(); ?>" data-address1="<?php echo $customer->get_billing_address_1(); ?>" data-address2="<?php echo $customer->get_billing_address_2(); ?>" data-city="<?php echo $customer->get_billing_city(); ?>" data-state="<?php echo $customer->get_billing_state(); ?>" data-postcode="<?php echo $customer->get_billing_postcode(); ?>" data-country="<?php echo $customer->get_billing_country(); ?>" data-phone="<?php echo $customer->get_billing_phone(); ?>"></span>
      <span id="gofc_customer_shipping" data-email="<?php echo $cokkie_email; ?>" data-firstName="<?php echo $customer->get_shipping_first_name(); ?>" data-lastName="<?php echo $customer->get_shipping_last_name(); ?>" data-company="<?php echo $customer->get_shipping_company(); ?>" data-address1="<?php echo $customer->get_shipping_address_1(); ?>" data-address2="<?php echo $customer->get_shipping_address_2(); ?>" data-city="<?php echo $customer->get_shipping_city(); ?>" data-state="<?php echo $customer->get_shipping_state(); ?>" data-postcode="<?php echo $customer->get_shipping_postcode(); ?>" data-country="<?php echo $customer->get_shipping_country(); ?>"></span>
    <?php
    } else {
    ?>
      <span id="gofc_customer_billing" data-email="<?php echo $cokkie_email; ?>"></span>
      <span id="gofc_customer_shipping" data-email="<?php echo $cokkie_email; ?>"></span>
    <?php
    }
    ?>
    <div class="toast ml-auto GIGFILLIATE_PLACING_ORDER_FOR_CUSTOMER_DELETE bg-info text-white" data-autohide="false">
      <div class="toast-header bg-info">
        <i class="fa fa-info-circle text-white h6 mb-0 mr-1"></i>
        <strong class="mr-auto text-white">Exited</strong>
        <button type="button" class="ml-2 mb-1 text-white close" data-dismiss="toast">&times;</button>
      </div>
      <div class="toast-body">
        <p class="mb-0">You exited from 'Place Order for Customer Mode'.</p>
      </div>
    </div>
    <style>
      #cfw-coupons {
        display: none;
      }
    </style>
    <?php
  }

  public function woocommerce_checkout_process()
  {
    if (isset($_POST['new_billing_email']) && $_POST['new_billing_email'] != null) {
      if (!email_exists($_POST['new_billing_email'])) {
        $arr = explode("/", $_POST['new_billing_email'], 2);
        $login_name = $arr[0];
        wp_create_user($login_name, md5(time() . "_temp"), $_POST['new_billing_email']);
        $this->send_new_customer_from_bp_email($_POST['new_billing_email']);
      }
    }
  }

  public function send_new_customer_from_bp_email($email)
  {
    if (!function_exists('vitalibis_send_email') || !function_exists('vitalibis_get_notification_by_slug')) {
      return;
    }
    $notification = vitalibis_get_notification_by_slug('new-customer-by-bp');
    if (!$notification->enabled) {
      return;
    }
    $current_user = wp_get_current_user();
    $template_tags = [];
    $template_tags['{site_name}'] = get_bloginfo('name');
    $template_tags['{site_url}'] = get_site_url();
    $template_tags['{affiliate_first_name}'] = $current_user->user_firstname;
    $template_tags['{affiliate_last_name}'] = $current_user->user_firstname;
    $template_tags['{affiliate_email}'] = $current_user->user_email;
    $template_tags['{new_user_email}'] = $email;
    $template_tags['{password_change_url}'] = get_site_url() . '/wp-login.php?action=lostpassword'; // default value
    vitalibis_send_email($email, $notification, $template_tags);
  }

  public function woocommerce_checkout_update_order_meta($order_id)
  {
    if (isset($_POST['new_billing_email'])) {
      $current_user_id = get_current_user_id();
      update_post_meta($order_id, 'customer_user', "");
      update_post_meta($order_id, 'v_order_affiliate_id', (int)get_user_meta($current_user_id, 'v_affiliate_id', true));
      update_post_meta($order_id, 'ordered_by', wp_get_current_user()->user_email);
      update_post_meta($order_id, '_customer_user', esc_attr($current_user_id));
      $this->reset_current_user_address();
    } else {
      
    }
  }

  public function reset_current_user_address() {
    $current_user = wp_get_current_user();
    $current_user_id = $current_user->ID;
    $orders = get_posts(array(
      'post_type' => 'shop_order',
      'limit'        => 1,
      'post_status' => array('wc-completed', 'wc-processing'),
      'orderby' => 'date',
      'order' => 'DESC',
      'customer' => $current_user_id,
      'meta_query' => [
        'relation' => 'AND',
        [
          'key' => 'v_order_affiliate_volume_type',
          'value' => 'PERSONAL',
          'compare' => '=='
        ],
        [
          'key'=>'ordered_by',
          'compare' => 'NOT EXISTS'
        ]
      ]
    ));
    if ($orders != null && isset($orders[0])) {
      $current_user = $orders[0];
      $current_user = new WC_Order($current_user->ID);
      update_user_meta($current_user_id, 'billing_email', $current_user->user_email);
      update_user_meta($current_user_id, 'billing_first_name', $current_user->get_billing_first_name());
      update_user_meta($current_user_id, 'billing_last_name', $current_user->get_billing_last_name());
      update_user_meta($current_user_id, 'billing_company', $current_user->get_billing_company());
      update_user_meta($current_user_id, 'billing_address_1', $current_user->get_billing_address_1());
      update_user_meta($current_user_id, 'billing_address_2', $current_user->get_billing_address_2());;
      update_user_meta($current_user_id, 'billing_city', $current_user->get_billing_city());
      update_user_meta($current_user_id, 'billing_state', $current_user->get_billing_state());
      update_user_meta($current_user_id, 'billing_postcode', $current_user->get_billing_postcode());
      update_user_meta($current_user_id, 'billing_country', $current_user->get_billing_country());
      update_user_meta($current_user_id, 'billing_phone', $current_user->get_billing_phone());

      update_user_meta($current_user_id, 'shipping_first_name', $current_user->get_shipping_first_name());
      update_user_meta($current_user_id, 'shipping_last_name', $current_user->get_shipping_last_name());
      update_user_meta($current_user_id, 'shipping_company', $current_user->get_shipping_company());
      update_user_meta($current_user_id, 'shipping_address_1', $current_user->get_shipping_address_1());
      update_user_meta($current_user_id, 'shipping_address_2', $current_user->get_shipping_address_2());
      update_user_meta($current_user_id, 'shipping_city', $current_user->get_shipping_city());
      update_user_meta($current_user_id, 'shipping_state', $current_user->get_shipping_state());
      update_user_meta($current_user_id, 'shipping_postcode', $current_user->get_shipping_postcode());
      update_user_meta($current_user_id, 'shipping_country', $current_user->get_shipping_country());
      update_user_meta($current_user_id, 'shipping_phone', $current_user->get_shipping_phone());
    }
  }

  public function woocommerce_admin_order_data_after_billing_address($order)
  {
    $ordered_by = get_post_meta($order->get_id(), 'ordered_by', true);
    if ($ordered_by) { ?>
      <p>
        <strong>Ordered By</strong><br>
        <?php echo $ordered_by; ?>
      </p>
<?php
    }
  }
}
