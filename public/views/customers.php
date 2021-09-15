
<style>
#gof-customers-list_headers,
#gofc-customers-list,
#gof-customer-list_skeleton {
  margin-bottom: 1rem;
}
#gof-customer-list_skeleton .v-skeleton-block,
#gof-customer-list_skeleton .v-skeleton-block .v-line {
  height: 24px;
}
</style>
<section id="gofc_customer_section" style="display: <?php echo (!isset($_COOKIE[$this->cookie_name]) ? 'block' : 'none'); ?>;">
  <div id="gofc-customer-search" class="v-card gofc-customer-search">
    <div class="v-card-body">
      <div class="v-row mb-3">
        <div class="v-col-md-6 mb-3 mb-md-0">
          <div class="form-group md-form mt-2 mb-0">
            <label for="search_customer">Filter by Customer Name</label>
            <input type="text" name="search_customer" id="search_customer" class="form-control">
          </div>
        </div>
        <div class="v-col-md-6 gwp-text-right">
          <button type="button" class="v-btn v-btn-outline-primary mt-2" data-toggle="modal" data-target="#addNewCustomerModal">
            <i class="fa fa-plus mr-1" aria-hidden="true"></i>Add New Customer
          </button>
        </div>
      </div>
      <div>
        <?php
        if (!empty($this->my_customers)) { ?>
          <div id="gof-customers-list_headers">
            <div class="v-row">
              <div class="v-col-lg-2">
                Name
              </div>
              <div class="v-col-lg-2 gwp-text-center">
                Last Order Date
              </div>
              <div class="v-col-lg-2 gwp-text-center">
                Orders Count
              </div>
              <div class="v-col-lg-2 gwp-text-center">
                Total Spend
              </div>
              <div class="v-col-lg-2 gwp-text-center">
                Average Order Value<!--(AOV)-->
              </div>
              <!-- <div class="v-col-lg-2">
                Sort
              </div> -->
            </div>
          </div>
          <div id="gofc-customers-list" offset="<?php echo $this->my_customers['orders_found']; ?>" affiliate-user-id="<?php echo $this->current_user_id; ?>">
            <?php foreach ($this->my_customers['customers'] as $key => $customer) { ?>
              <div class="gofc-customer" customer_email="<?php echo $customer['email']; ?>" customer_full-name="<?php echo $customer['full_name']; ?>">
                <div class="v-row">
                  <div class="v-col-lg-2">
                    <strong class="gofc-customer_full-name">
                      <?php echo $customer['full_name']; ?>
                    </strong>
                    <br>
                    <span><?php echo $customer['email']; ?></span>
                  </div>
                  <div class="gofc-customer_last-order-date v-col-lg-2 gwp-text-center">
                    <?php echo $customer['last_order_date']; ?>
                  </div>
                  <div class="gofc-customer_orders-count v-col-lg-2 gwp-text-center">
                    <?php echo $customer['orders_count']; ?>
                  </div>
                  <div class="gofc-customer_total-spend v-col-lg-2 gwp-text-center">
                    $<?php echo $customer['total_spend']; ?>
                  </div>
                  <div class="gofc-customer_aov v-col-lg-2 gwp-text-center">
                    $<?php echo $customer['aov']; ?>
                  </div>
                  <div class="v-col-lg-2 gwp-text-lg-right d-flex justify-content-end align-items-center">
                    <button type="button" class="gofc-btn-place-order v-btn v-btn-primary" customer-email="<?php echo $customer['email']; ?>">Place Order</button>
                  </div>
                </div>
              </div>
            <?php } ?>
          </div>
          <div id="gof-customer-list_skeleton">
            <div class="v-skeleton-block">
              <div class="v-line"></div>
            </div>
            <div class="v-skeleton-block" style="width: 75%;">
              <div class="v-line"></div>
            </div>
            <div class="v-skeleton-block" style="width: 25%;">
              <div class="v-line"></div>
            </div>
          </div>
        <?php } else { ?>
          <p>You do not have any <?php $this->core_settings->affiliate_term; ?> referred customers, yet.</p>
        <?php } ?>
      </div>
      <div id="gofc-no-results-found" style="display: none;">
        <p>No customers found.</p>
      </div>
    </div>
  </div>
</section>

<div class="modal fade" id="addNewCustomerModal" tabindex="-1" role="dialog" aria-labelledby="addNewCustomerModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="addNewCustomerModalLabel">Add New Customer</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <form id="gofc-add-customer-form" action="POST">
          <div class="v-skeleton-block" style="display: none; height: 40px; margin-bottom: 1rem;">
            <div class="v-line" style="height: 40px; margin: 0;"></div>
          </div>
          <div class="form-group md-form mt-2">
            <label for="new-gofc-customer">New Email Address</label>
            <input type="email" id="new-gofc-customer" name="new_gofc_customer" class="form-control" aria-describedby="emailHelp" required/>
            <div class="invalid-feedback">Please enter a valid email.</div>
          </div>
          <input name="action" type="hidden" value="customer_order_form_submit"/>
          <button type="submit" class="v-btn v-btn-primary"><i class="fa fa-plus mr-1" aria-hidden="true"></i>Add New Customer</button>
        </form>
      </div>
    </div>
  </div>
</div>

<div id="gofc_products_section" style="display: <?php echo (isset($_COOKIE[$this->cookie_name]) ? 'block' : 'none'); ?> ;">
  <div class="alert alert-info" role="alert" id="alert-placing-for-customer">
    <i class="fa fa-info-circle mr-1" aria-hidden="true"></i>
    You're placing an order for <span id="alert_customer_email"><?php echo isset($_COOKIE[$this->cookie_name]) ? $_COOKIE[$this->cookie_name] : ''; ?></span>. You can use your <?php echo $this->core_settings->affiliate_term; ?> customer coupon: <strong><?php echo $this->primary_affiliate_coupon_code; ?></strong>, but not your personal <?php echo $this->core_settings->affiliate_term; ?> coupon.
  </div>
  <div id="gofc-customer-search" class="card gofc-customer-search">
    <div class="card-body">
      <div class="row mb-3">
        <div class="col-sm-6">
          <div class="form-group md-form mt-2 mb-0">
            <label for="search_product">Filter by Product Name</label>
            <input type="text" name="search_product" id="search_product" class="form-control"/>
          </div>
        </div>
        <div class="col-sm-6 d-flex align-items-center justify-content-sm-end">
          <button class="v-btn v-btn-outline-primary gofc_exit_place_order_for_customer">Exit 'Place Order For Customer' Mode</button>
        </div>
      </div>
      <div class="gofc-products-list">
        <!-- Products listed here via js -->
      </div>
    </div>
  </div>
</div>

<div class="modal" tabindex="-1" role="dialog" id="gofc-model">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Are You Sure?</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn gofc-secondary" data-dismiss="modal">No</button>
        <button type="button" class="btn gofc-primary confirm-btn">Yes</button>
      </div>
    </div>
  </div>
</div>