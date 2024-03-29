(function($) {
'use strict';

const OrderForCustomer = {
  init: function() {
    if ($('.template-my-account .brand-partner-customers').length) {
      this.continuouslyLoadCustomers()
      this.onSearchCustomers()
      this.onSearchProducts()
      this.onGetProducts()
      this.onAddNewCustomer()
      this.onBtnClickPlaceOrder()
      this.onExitPlaceOrderForCustomer()
      this.onChangeCustomerSort();
      this.onChangeProductSort();
    }
    this.setupCustomerBilling()
    this.setupCustomerShipping()
    // this.giveWarningWhenLeavingTheCheckout()
    this.exitFromOrderForCustomerIfNotOnValidPage()
    this.changeReturnToCart();
  },
  onChangeCustomerSort: function() {
    $('#customer-sort').on('change', function() {
      const $customers_list = $('#gofc-customers-list')
      $customers_list.html('').attr('offset', 0);
      $('#gof-customer-list_skeleton').show()
      OrderForCustomer.onLoadCustomersBatch()
    })
  },
  continuouslyLoadCustomers: function() {
    this.onLoadCustomersBatch()
  },
  onLoadCustomersBatch: function() {
    const $customers_list = $('#gofc-customers-list')
    const affiliate_user_id = parseInt($customers_list.attr('affiliate-user-id'))
    const offset = parseInt($customers_list.attr('offset'))
    const sort_type = $('#customer-sort').find(":selected").val()
    this.loadCustomersBatch(affiliate_user_id, offset, sort_type).then( function(res) {
      res = JSON.parse(res)
      if (res.success) {
        // console.log(res, res.customers_data.customers.length)
        const customers_obj = res.customers_data.customers
        if (Object.keys(customers_obj).length) {
          let new_customers = ''
          Object.keys(customers_obj).forEach( (key) => {
            const customer = customers_obj[key]
            const $existing_customers = $('.gofc-customer')
            let match = false
            $existing_customers.each(function() {
              const this_customer_email = $(this).attr('customer_email')
              if (this_customer_email === customer.email) {
                const $this_orders_count = $(this).find('.gofc-customer_orders-count')
                const new_orders_count = parseInt($this_orders_count.text()) + customer.orders_count
                // console.log(parseInt($this_orders_count.text()), customer.orders_count, new_orders_count)
                $this_orders_count.text( new_orders_count )
                const $this_total_spend = $(this).find('.gofc-customer_total-spend .total-spend_value')
                const new_total_spend = parseInt($this_total_spend.text().replace('$', '')) + customer.total_spend
                // console.log(parseInt($this_total_spend.text().replace('$', '')), customer.total_spend, new_total_spend)
                $this_total_spend.text( '$' + Utilities.formatCurrency(new_total_spend) )
                const $this_aov = $(this).find('.gofc-customer_aov')
                const new_aov = parseFloat(new_total_spend / new_orders_count)
                $this_aov.text( '$' + Utilities.formatCurrency(new_aov) )
                match = true
              }
            })
            if (!match) {
              new_customers += OrderForCustomer.newCustomerHTML(customer)
            }
          })
          $('#gofc-customers-list').append(new_customers)
          $customers_list.attr('offset', (offset + res.customers_data.orders_found))
          OrderForCustomer.continuouslyLoadCustomers()
        } else {
          // No more customers, finished loading!
          $('#gof-customer-list_skeleton, .gofc-customer .v-skeleton-block').hide()
          $('#gofc-customer-sort-col').show()
        }
        OrderForCustomer.onBtnClickPlaceOrder()
      } else {
        console.error(res)
      }
    }).catch(function(err) {
      console.error(err)
    })
  },
  loadCustomersBatch: function(affiliate_user_id, offset, order_by = 'za') {
    return new Promise( (resolve, reject) => {
      $.ajax({
        url: Gigfilliate_WP.admin_ajax,
        data: {
          action: 'gofc_get_customers',
          affiliate_user_id: affiliate_user_id,
          // limit: 20,
          offset: offset,
          order_by: order_by
        },
        type: 'POST',
        config: { headers: {'Content-Type': 'multipart/form-data' }},
      }).done(function(res) {
        // const json_res = JSON.parse(res)
        resolve(res)
      }).fail(function(err) {
        reject(err)
      })
    })
  },
  newCustomerHTML: function(customer) {
    const new_customer_html = '<div class="gofc-customer" customer_email="' + customer.email + '" customer_full-name="' + customer.full_name + '">\
      <div class="v-row">\
        <div class="v-col-lg-3 text-center text-lg-left mb-3 mb-lg-0">\
          <div>\
            <strong class="gofc-customer_full-name">' + customer.full_name + '</strong>\
            <br>\
            <span class="gofc-customer_email">' + customer.email + '</span><br>\
            <span class="text-black-50">'+customer.city+', '+customer.state+'</span>\
          </div>\
        </div>\
        <div class="v-col-lg-2 gwp-text-center">\
          <span class="d-lg-none mr-1">Last Order Date:</span>' + customer.last_order_date + '\
        </div>\
        <div class="v-col-lg-1 gwp-text-center">\
          <span class="d-lg-none mr-1">Total Orders:</span>' + customer.orders_count + '\
        </div>\
        <div class="v-col-lg-2 gwp-text-center">\
          <div>\
            <span class="d-lg-none mr-1">Average Order Value:</span>$' + Utilities.formatCurrency(customer.aov) + '\
          </div>\
        </div>\
        <div class="gofc-customer_total-spend v-col-lg-2 gwp-text-center mb-3 mb-lg-0">$' + Utilities.formatCurrency(customer.total_spend) + '</div>\
        <div class="v-col-lg-2 gwp-text-lg-right d-flex justify-content-center justify-content-lg-end align-items-center">\
          <button type="button" class="gofc-btn-place-order v-btn v-btn-primary" customer-email="' + customer.email + '">Place Order</button>\
        </div>\
      </div>\
    </div>'
    return new_customer_html
  },
  onSearchCustomers: function() {
    $('#search_customer').on('keyup', function() {
      const to_search_val = $(this).val()
      const $customers = $('.gofc-customer')
      $customers.each(function() {
        const customer_email = $(this).attr('customer_email')
        const customer_email_match = customer_email !== '' ? new RegExp(to_search_val, 'i').test(customer_email) : false
        const full_name = $(this).attr('customer_full-name')
        const full_name_match = full_name !== '' ? new RegExp(to_search_val, 'i').test(full_name) : false
        if (customer_email_match || full_name_match) {
          $(this).removeClass('v-d-none').addClass('v-d-block')
        } else {
          $(this).removeClass('v-d-block').addClass('v-d-none')
        }
      })
      if (!$('.gofc-customer.v-d-block').length) {
        $('#gofc-no-results-found').show()
      } else {
        $('#gofc-no-results-found').hide()
      }
    })
  },
  onSearchProducts: function() {
    let timeout = null
    const self = this
    $('#search_product').on('keyup', function() {
      clearTimeout(timeout)
      timeout = setTimeout(function() {
        self.onGetProducts()
      }, 750)
    });
  },
  onGetProducts: function() {
    const self = this;
    let $products_list = $('.gofc-products-list');
    $products_list.html('<div class="loading-spinner"><div class="loading-animation"><div></div></div></div>');
    this.getProducts().then( function(res) {
      $products_list.html('')
      if (!res || res === 0) {
        alert('Network Error. Try Again.')
        console.error('Network Error. Try Again.')
        return
      }
      res = JSON.parse(res);
      if (res.success) {
        if (res.products.length) {
          res.products.forEach( (element) => {
            let new_product = `
              <div class="gofc-products-list-item">
                <div class="v-row">
                  <div class="v-col-md-3 col-md-3 v-col-lg-2 col-lg-2 mb-3 mb-md-0">
                    <div class="gofc-products-list-item_thumbnail-wrap">
                      <img class="gofc-products-list-item_thumbnail" src="${element['thumbnail_url']}" alt="${element['name']}"/>
                    </div>
                  </div>
                  <div class="v-col-6 v-col-md-5 v-col-lg-6 d-flex flex-column justify-content-center">
                    <div class="gofc-products-list-item-name">
                      ${element['name']}`
                      new_product += `<span class="gofc-products-list-item-price">$${self.getProductPrice(element)}</span>
                    </div>
                    ${self.variaitonsProductOptions(element)}
                  </div>
                  <div class="v-col-6 v-col-md-4 d-flex align-items-center justify-content-end">`
                    if (element['wcsatt_schemes']) {
                      new_product += `
                        <div class="dropdown single-add-to-cart-button-dropdown">
                          <button class="add_to_cart_button v-btn v-btn-primary dropdown-toggle" type="button" id="single_add_to_cart_button_dropdown_${element['id']}" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" type="button" data-product_id="${element['id']}" data-product_sku="${element['sku']}" aria-label="Add ${element['title']} to your cart" ${!element['is_in_stock'] ? 'disabled' : ''}>
                            ${element['is_in_stock'] ? '<span class="add_to_cart_label">Add to Cart</span>' : 'Out Of Stock'}
                          </button>
                        <div class="dropdown-menu" aria-labelledby="single_add_to_cart_button_dropdown_${element['id']}" 
                          style="margin-top: -16px; margin-left: 4px;">
                          <a class="dropdown-item one-time-purchase-action" href="javascript:void(0);">One Time Purchase</a>
                          <a class="dropdown-item refill-action" href="javascript:void(0);">Refill 10% Off</a>
                          <a class="dropdown-item back-action d-none" href="javascript:void(0);">
                            <i class="fa fa-angle-left" aria-hidden="true"></i> Back
                          </a>`
                          element['wcsatt_schemes'].forEach((wcsatt_scheme) => {
                            new_product += `<a class="dropdown-item refill-action-option d-none" href="javascript:void(0)" data-product_id="${element['id']}" subscription_period_interval="${wcsatt_scheme['subscription_period_interval']}" subscription_period="${wcsatt_scheme['subscription_period']}">Every ${wcsatt_scheme['subscription_period_interval']} ${wcsatt_scheme['subscription_period_interval'] === '1' ? wcsatt_scheme['subscription_period'] : wcsatt_scheme['subscription_period'] + 's'}</a>`
                          });
                        new_product += `
                        </div>
                      </div>`
                    } else {
                      new_product += `
                        <a href="${element['is_in_stock'] ? element['add_to_cart_url'] : 'javascript:void(0)'}" value="${element['id']}" data-product_id="${element['id']}" data-product_sku="${element['sku']}" aria-label="Add ${element['name']} to your cart" class="${element['is_in_stock'] ? 'ajax_add_to_cart add_to_cart_button' : ''} v-btn v-btn-primary gofc-products-list-item-add-to-cart-btn" ${!element['is_in_stock'] ? 'disabled' : ''}>
                          ${element['is_in_stock'] ? '<span class="added_to_cart_label">Added to Cart</span><span class="adding_to_cart_label">Adding to Cart</span><span class="add_to_cart_label">Add to Cart</span>' : 'Out Of Stock'}
                        </a>`
                    }
                  new_product += `
                  </div>
                </div>
              </div>`
            $products_list.append(new_product)
          })
          OrderForCustomer.setSubscribtionButtons()
          OrderForCustomer.setVariationsButtons()
        } else {
          $products_list.html('<p>No products found.</p>')
        }
      } else {
        console.error(res)
      }
    }).catch(function(err) {
      console.error(err)
    })
  },
  setVariationsButtons: function() {
    const $variationSelects = $('.variation_select')
    if (!$variationSelects.length) {
      return
    }
    $variationSelects.map((i, e) => {
      const product_id = $(e).attr('data-product_id')
      if ($('option:selected', e).length != 0) {
        $('.add_to_cart_button[data-product_id="'+product_id+'"]').addClass('disabled')
      }
    });
    $variationSelects.on('change', function(){
      const product_id = $(this).attr('data-product_id')
      OrderForCustomer.checkAndSelectVariation(product_id)
    });
  },
  checkAndSelectVariation: function(product_id) {
    const $variationSelects = $(`.variation_select[data-product_id="${product_id}"]`)
    const $addToCartButton = $(`.add_to_cart_button[data-product_id="${product_id}"]`)
    $addToCartButton.addClass('disabled')
    const selectedAttributes = {}
    $variationSelects.map((i, e)=>{
      const variationSelect = $(e);
      const selectedOption = variationSelect.find('option:selected')
      if (!selectedOption) return
      const selectedOptionVal = selectedOption.val()
      if (!selectedOptionVal) return
      selectedAttributes[variationSelect.attr('name')] = selectedOptionVal;
    });
    if ($variationSelects.length != Object.keys(selectedAttributes).length) return
    const $productVariations = $(`#product-${product_id}-variations`)
    const variations = JSON.parse($productVariations.attr('data-variations'))
    const selectedVariant = variations.filter(v=>{
      return JSON.stringify(v.attributes) === JSON.stringify(selectedAttributes)
    })
    $addToCartButton.attr('data-variant', JSON.stringify(selectedVariant));
    $addToCartButton.removeClass('disabled')
    $addToCartButton.off('click')
    $addToCartButton.removeClass("ajax_add_to_cart")
    $addToCartButton.on('click', function (e) {
      e.preventDefault()
      const $this = $(this)
      const productId = $this.attr('data-product_id')
      const sku = $this.attr('data-product_sku')
      OrderForCustomer.ajaxAddToCart(
        productId,
        sku,
        '',
        $this
      )
    })
  },
  getProductPrice: function(product_object) {
    if (!product_object.variations) {
      return product_object.price
    }
    let min_price = 99999
    let max_price = -1
    product_object.variations.forEach((variation) => {
      if (min_price > variation.display_price) {
        min_price = variation.display_price
      }
      if (min_price < variation.display_price) {
        max_price = variation.display_price
      }
    })
    return min_price + " - $" + max_price
  },
  variaitonsProductOptions: function(product_object) {
    if (!product_object.variations) {
      return ""
    }
    let filtered_attributes = []
    product_object.variations.forEach(variation => {
      for (const key in variation.attributes) {
        if (filtered_attributes[key]) {
          filtered_attributes[key].push(variation.attributes[key])
        } else {
          filtered_attributes[key] = []
          filtered_attributes[key].push(variation.attributes[key])
        }
      }
    });
    let unique_attributes = []
    for (const key in filtered_attributes) {
      let uniqueChars = []
      filtered_attributes[key].forEach((c) => {
        if (!uniqueChars.includes(c)) {
          uniqueChars.push(c)
        }
      });
      unique_attributes[key] = uniqueChars
    }
    
    let select_html = `<div class="gofc-product-variations d-flex flex-column" id="product-${product_object.id}-variations" data-variations='${JSON.stringify(product_object.variations)}'>`
    for (const key in unique_attributes) {
      select_html += `
        <div class="form-group">
          <label for="${key}">${(key.replace('attribute_', '').replace('-', ' ').toUpperCase())}</label>
          <select class="v-form-control form-control variation_select variation_select_${product_object.id}" data-product_id="${product_object.id}" name="${key}" id="${key}">`
            if (unique_attributes[key].length > 1) {
              select_html += `<option value="">Choose An Option</option>`
            }
            select_html += unique_attributes[key].map((ua) => {
              return `<option value="${ua}" ${(unique_attributes[key].length <= 1) ? 'selected' : ''}>${ua}</option>`
            })
          select_html += `</select>
        </div>`
    }
    select_html += `</div>`
    return select_html;
  },
  onChangeProductSort: function(product) {
    const $this = this;
    $('#products-sorting-order').on('change', function() {
      $this.onGetProducts()
    })
  },
  getProducts: function() {
    return new Promise( (resolve, reject) => {
      $.ajax({
        url: GOFC.ajax_url,
        data: {
          action: 'gofc_get_products',
          search: $('#search_product').val(),
          order_by: $('#products-sorting-order').find(':selected').val()
        },
        type: 'POST',
        config: { headers: {'Content-Type': 'multipart/form-data' }},
      }).done(function(res) {
        // const json_res = JSON.parse(res)
        resolve(res)
      }).fail(function(err) {
        reject(err)
      })
    })
  },
  setupCustomerBilling: function() {
    if (!$('#gofc_customer_billing').length) {
      return
    }
    const $gofc_customer_billing = $('#gofc_customer_billing')
    const fields_to_update = ['billing_email', 'billing_first_name', 'billing_last_name', 'billing_address_1', 'billing_address_2', 'billing_company', 'billing_country', 'billing_postcode', 'billing_state', 'billing_city', 'billing_phone']
    this.updateCheckoutFields(fields_to_update, $gofc_customer_billing)
  },
  setupCustomerShipping: function() {
    if (!$('#gofc_customer_shipping').length) {
      return;
    }
    const $gofc_customer_shipping = $('#gofc_customer_shipping')
    const fields_to_update = ['shipping_email', 'shipping_first_name', 'shipping_last_name', 'shipping_address_1', 'shipping_address_2', 'shipping_company', 'shipping_country', 'shipping_postcode', 'shipping_state', 'shipping_city', 'shipping_phone']
    this.updateCheckoutFields(fields_to_update, $gofc_customer_shipping)
  },
  updateCheckoutFields: function(fields, data_element) {
    for (let i = 0; i < fields.length; i++) {
      let field = fields[i]
      const $element = $('[name="'+field+'"]')
      field = field.replace('billing_','')
      field = field.replace('shipping_','')
      field = field.replace('_','')
      if ($element.length) {
        $element.removeClass('garlic-auto-save')
        if($element.find('option').length){
          $element.find('option:selected').first().removeAttr('selected')
          $element.find('option[value="'+this.clearInputField(data_element.data(field))+'"]').attr('selected','')
        }
        $element.attr('value', this.clearInputField(data_element.data(field)))
        $element.val(this.clearInputField(data_element.data(field)))
        $element.change()
      }
    }
  },
  clearInputField: function(data) {
    return data ? data : ''
  },
  changeReturnToCart: function() {
    if (!this.isCurrentURLValid() || Cookie.read(GOFC.cookie_name) === null) {
      return
    }
    $('.previous-button a[href="' + GOFC.cart_url + '"]').attr('href', GOFC.customers_url).html('« Return to ' + Gigfilliate_WP.affiliate_term + ' customers')
  },
  onAddNewCustomer: function() {
    const self = this
    $('#addNewCustomerModal').on('shown.bs.modal', function (e) {
      setTimeout(function() {  
        $('#new-gofc-customer').focus()
      }, 500)
    })
    $('label[for="new-gofc-customer"]').on('click', function() {
      $(this).addClass('active')
      $('#new-gofc-customer').focus()
    })
    $('#gofc-add-customer-form').on('submit', function(e) {
      e.preventDefault()
      const $input = $('#new-gofc-customer')
      let email = null;
      email = $input.val()
      let is_invalid = false
      let invalid_feedback = ''
      if (email.trim() === '') {
        is_invalid = true
        invalid_feedback = 'An email address is required.'
      } else if (!Utilities.isEmailValid(email.trim())) {
        is_invalid = true
        invalid_feedback = 'Please enter a valid email.'
      }
      if (is_invalid) {
        $input.parent().addClass('is-invalid')    
        $input.next().text(invalid_feedback).show()      
        $input.focus()
        return
      } else {
        $('#gofc-add-customer-form').find('[type="submit"]').prop('disabled', true)
        $('#gofc-add-customer-form').find('.v-skeleton-block').show()
        $('#gofc-add-customer-form').find('.form-group').hide()
        self.checkEmailExist(email).then( function(res) {
          res = JSON.parse(res)
          if (res.exists) {
            is_invalid = true
            $input.parent().addClass('is-invalid')    
            $input.next().text('This customer email already exists.').show()      
            $input.focus()
          } else {
            // else email doesnt exist can create new customer
            $('#addNewCustomerModal').modal('hide')
            // can create new customer enter 'Place Order for Customer' mode
            self.startPlaceOrderForCustomer(email)
          }
          $('#gofc-add-customer-form').find('[type="submit"]').prop('disabled', false).removeAttr('disabled')
          $('#gofc-add-customer-form').find('.v-skeleton-block').hide()
          $('#gofc-add-customer-form').find('.form-group').show()
        }).catch(function(err) {
          console.error(err)
        })
      }
    });
  },
  onBtnClickPlaceOrder: function() {
    $('.gofc-btn-place-order').off()
    $('.gofc-btn-place-order').on('click', function() {
      const email = $(this).attr('customer-email')
      OrderForCustomer.startPlaceOrderForCustomer(email)
    })
  },
  checkEmailExist: function(email) {
    return new Promise( (resolve, reject) => {
      $.ajax({
        url: GOFC.ajax_url,
        data: {
          action: 'gofc_check_email_exists',
          email: email
        },
        type: 'POST',
        config: { headers: {'Content-Type': 'multipart/form-data' }},
      }).done(function(res) {
        resolve(res)
      }).fail(function(err) {
        reject(err)
      })
    })
  },
  startPlaceOrderForCustomer: function( email ) {
    $('#gofc-model').modal('show')
    $('#gofc-model .modal-body').html('<p>You\'re entering \'Place Order for Customers\' Mode, your cart items will be removed.</p>')
    $('#gofc-model .confirm-btn').unbind('click')
    $('#gofc-model .confirm-btn').on('click', function() {
      $('#gofc-model .confirm-btn').html('Loading...')
      $('#gofc-model .confirm-btn').attr('disabled','disabled')
      OrderForCustomer.resetUserCart().done(function (res) {
        $('#gofc-model .confirm-btn').html('Yes')
        $('#gofc-model .confirm-btn').removeAttr('disabled')
        $('#gofc-model').modal('hide')
        Cookie.create(GOFC.cookie_name, email, 1)
        $('#gofc_customer_section').slideUp()
        $('#gofc_products_section').slideDown()
        $('#alert-placing-for-customer #alert_customer_email').html(email)
        $('body').addClass('page-place-order-for-customer-mode')
      })
    })
  },
  onExitPlaceOrderForCustomer: function() {
    $('.gofc_exit_place_order_for_customer').on('click', function(e) {
      $('#gofc-model').modal('show')
      $('#gofc-model .modal-body').html("<p>When you leave \'Place Order for Customers\' Mode the items are removed from your cart</p>")
      $('#gofc-model .confirm-btn').unbind('click')
      $('#gofc-model .confirm-btn').on('click', function() {
        $('#gofc-model .confirm-btn').html('Loading...')
        $('#gofc-model .confirm-btn').attr('disabled','disabled')
        OrderForCustomer.resetUserCart().done(function (res) {
          $('#gofc-model .confirm-btn').html('Yes')
          $('#gofc-model .confirm-btn').removeAttr('disabled')
          $('#gofc-model').modal('hide')
          Cookie.erase(GOFC.cookie_name)
          $('#gofc_customer_section').slideDown()
          $('#gofc_products_section').slideUp()
          $('#gofc_products_section .ajax_add_to_cart.added').html('Add to Cart')
          $('#gofc_products_section .ajax_add_to_cart').removeClass('added')
          $('body').removeClass('page-place-order-for-customer-mode')
        })
      })
    })
  },
  resetUserCart: function() {
    return $.get(GOFC.ajax_url, {
      action: 'gofc_reset_cart',
    }).done(function (res) {
      $(document.body).trigger('wc_reload_fragments')
    })
  },
  exitFromOrderForCustomerIfNotOnValidPage: function() {
    if (!this.isCurrentURLValid() && Cookie.read(GOFC.cookie_name) !== null) {
      const GIGFILLIATE_PLACING_ORDER_FOR_CUSTOMER_DELETE = $('.GIGFILLIATE_PLACING_ORDER_FOR_CUSTOMER_DELETE')
      GIGFILLIATE_PLACING_ORDER_FOR_CUSTOMER_DELETE.modal('show')
      GIGFILLIATE_PLACING_ORDER_FOR_CUSTOMER_DELETE.find('.btn-primary').on('click', function () {
        window.location.href = GOFC.customers_url
      })
      GIGFILLIATE_PLACING_ORDER_FOR_CUSTOMER_DELETE.find('.btn-outline-secondary').on('click', function () {
        $(this).html('Exiting...').attr('disabled','disabled')
        Cookie.erase(GOFC.cookie_name)
        $.get(GOFC.ajax_url, {
          action: 'gofc_reset_cart'
        }).then(function() {
          GIGFILLIATE_PLACING_ORDER_FOR_CUSTOMER_DELETE.modal('hide')
          $('body').removeClass('page-place-order-for-customer-mode')
        })
      })
    }
  },
  isCurrentURLValid: function() {
    const location_href = window.location.href
    // TODO: Checkout /{affiliate-term}-customers
    const valid_pages = ['/account/brand-partner-customers/', '/my-account/brand-partner-customers/', '/checkout/', '/cart/']
    let is_valid = false
    valid_pages.forEach(function(valid_page) {
      if (location_href.includes(valid_page)) {
        is_valid = true
      }
    })
    return is_valid
  },
  giveWarningWhenLeavingTheCheckout: function() {
    if (window.location.pathname == '/checkout/' && Cookie.read(GOFC.cookie_name)) {
      window.onbeforeunload = function() {
        return "You are attempting to leave this page. When you leave you exit 'Place Order for Customer' mode. Are you sure you want to exit this page?"
      }
      $('[name="woocommerce_checkout_place_order"]').click(function(_) {
        window.onbeforeunload = ""
      })
      $('#cfw-customer-info-action [data-tab="#cfw-payment-method').click(function(_) {
        window.onbeforeunload = ""
      })
    }
  },
  setSubscribtionButtons: function() {
    $('.single-add-to-cart-button-dropdown .one-time-purchase-action').on('click', function () {
      const $add_to_cart_button = $(this).parent().parent().find('.add_to_cart_button').first()
      const productId = $add_to_cart_button.attr('data-product_id')
      const sku = $add_to_cart_button.attr('data-product_sku')
      OrderForCustomer.ajaxAddToCart(
          productId,
          sku,
          0,
          $add_to_cart_button
        )
    })
    $('.single-add-to-cart-button-dropdown .refill-action').on('click', function (e) {
      e.stopPropagation()
      $('.single-add-to-cart-button-dropdown .one-time-purchase-action, .single-add-to-cart-button-dropdown .refill-action'
      ).addClass('d-none')
      $('.single-add-to-cart-button-dropdown .refill-action-option, .single-add-to-cart-button-dropdown .back-action'
      ).removeClass('d-none')
    })
    $('.single-add-to-cart-button-dropdown .back-action').on('click', function (e) {
      e.stopPropagation()
      $('.single-add-to-cart-button-dropdown .one-time-purchase-action, .single-add-to-cart-button-dropdown .refill-action'
      ).removeClass('d-none')
      $('.single-add-to-cart-button-dropdown .refill-action-option, .single-add-to-cart-button-dropdown .back-action'
      ).addClass('d-none')
    })
    $('.single-add-to-cart-button-dropdown .refill-action-option').on('click', function () {
      const $this = $(this)
      const productId = $this.attr('data-product_id');
      const sku = $this.attr('data-product_sku')
      const subscription_period = $this.attr('subscription_period');
      const subscription_period_interval = $this.attr('subscription_period_interval')
      OrderForCustomer.ajaxAddToCart(
        productId,
        sku,
        `${subscription_period_interval}_${subscription_period}`,
        $this
      )
    })
  },
  ajaxAddToCart: function (productId, sku, refill = '', closest) {
    let variant = closest.attr('data-variant')
    const formData = {
      'product_id': productId,
      'product_sku': sku,
      'quantity': 1,
      'add-to-cart': productId,
      'action': 'xoo_wsc_add_to_cart',
    };
    if (variant) {
      variant = JSON.parse(variant)[0];
      formData['alg_variations'] = 'on'
      formData['variation_id'] = variant.variation_id
      for (const key in variant.attributes) {
        formData[key] = variant.attributes[key]
      }
    }
    if (refill) {
      const refilId = `convert_to_sub_${productId}`
      formData[refilId] = refill
      formData['refill_frequencies'] = refill
    }
    $.ajax({
      url: `${document.URL}?wc-ajax=xoo_wsc_add_to_cart`, // eslint-disable-line
      type: 'POST',
      data: formData,
      dataType: 'json',
      encode: true,
    }).done(function (response) {
      $(document.body).trigger('added_to_cart', [response.fragments, response.cart_hash, $(closest)])
      $(closest).parent().addClass('added')
    })
  },
}

const Cookie = {
  read: function(name) {
    var nameEQ = name + '='
    var ca = document.cookie.split(';')
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length)
    }
    return null;
  },
  create: function(name, value, days) {
    let expires = ''
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
      expires = '; expires=' + date.toGMTString()
    } else {
      expires = ''
    }
    document.cookie = name + '=' + value + expires + '; path=/'
  },
  erase: function(name) {
    Cookie.create(name, '', -1)
  },
}

const Utilities = {
  isEmailValid: function(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(String(email).toLowerCase())
  },
	formatCurrency: function( amount ) {
		return amount.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
	},  
}

$(document).ready(function() {
  OrderForCustomer.init()
})
})(jQuery)
