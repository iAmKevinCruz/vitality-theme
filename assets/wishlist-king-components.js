import { html } from "https://cdn.jsdelivr.net/npm/lit@2.3.0/+esm";
import { WishlistElement } from "https://cdn.jsdelivr.net/npm/@appmate/wishlist@4.10.3";
import { LiquidElement } from "https://cdn.jsdelivr.net/npm/@appmate/wishlist@4.10.3/liquid.js";
import { ProductFormController, setIcons } from "https://cdn.jsdelivr.net/npm/@appmate/wishlist@4.10.3/components/all.js";

export class WishlistPage extends LiquidElement {
  getStateConfig() {
    return {
      wishlist: "all",
    };
  }

  getLiquidTemplate() {
    return `
      <section class="wk-page">
        <div class="wk-header">
          <h1 class="wk-title">{{ 'general.wishlist' | t }}</h1>
          {%- if wishlist.id -%}
            {%- unless wishlist.num_items == 0 -%}
              <div class="wk-controls">
                <wishlist-share 
                  data-wishlist-id="{{ wishlist.id }}"
                  data-icon="share"
                ></wishlist-share>
            </div>
            {%- endunless -%}
          {%- endif -%}
        </div>
        <div class="wk-body">
          {%- if wishlist.num_items == 0 -%}
            <div class="wk-wishlist-empty-note">
              <p>{{ 'general.wishlist_empty_note' | t }}</p>
            </div>
          {%- else -%}
            {%- unless customer or wishlist.is_mine == false or shop.customer_accounts_enabled == false -%}
              <div class="wk-login-note">
                <p>{{ 'general.login_or_signup_note_html' | t: login_url: routes.account_login_url, register_url: routes.account_register_url }}</p>
              </div>
            {%- endunless -%}
            <wk-grid>
              {%- assign wishlist_items = wishlist.items | reverse -%}
              {%- for wishlist_item in wishlist_items -%}
                <wishlist-product-card 
                  part="product"
                  data-wishlist-id="{{ wishlist.id }}"
                  data-wishlist-item-id="{{ wishlist_item.id }}"
                ></wishlist-product-card>
              {%- endfor -%}
            </wk-grid>
          </div>
        {% endif %}
      </section>
    `;
  }
}

customElements.define("wishlist-page", WishlistPage);

export class WishlistProductCard extends LiquidElement {
  constructor() {
    super();
    this.form = new ProductFormController(this, {
      app: this.app,
    });
  }

  beforeNextState(state) {
    if (state.wishlistItem) {
      this.form.setProduct({
        product: state.wishlistItem.product,
        selectedVariantId: state.wishlistItem.selectedVariantId,
        autoSelect: this.app.settings.autoSelectVariantOnInit,
      });
    }
  }

  getStateConfig() {
    return {
      loading: "lazy",
      wishlist: "minimal",
      wishlistItem: true,
      form: this.form.state,
    };
  }

  getEventConfig() {
    return {
      "change .wk-form": async (event) => {
        this.form.changeOption({
          input: event.target,
          autoSelect: this.app.settings.autoSelectVariantOnChange,
        });

        if (this.form.selectedVariant) {
          await this.app.updateWishlistItem({
            wishlistItemId: this.state.wishlistItem.id,
            changes: {
              variantId: this.form.selectedVariant.id,
            },
          });
        }
      },
      "submit .wk-form": async (event) => {
        event.preventDefault();

        await this.form.addToCart({
          wishlistId: this.state.wishlist.id,
          wishlistItemId: this.state.wishlistItem.id,
        });

        window.location.href = this.app.routes.cartUrl;
      },
    };
  }

  getLiquidTemplate() {
    return `
      {%- assign container_id = "product-card-" | append: wishlist_item.id -%}
      {%- if wishlist_item.loading -%}
        <div id="{{ container_id }}" class="wk-product-card">
          <div class="wk-image">
            <wk-icon icon="spinner" class="wk-loading-spinner"></wk-icon>
          </div>  
        </div>
      {%- elsif wishlist_item.hidden -%}
        <div id="{{ container_id }}" class="wk-product-card">
          <div class="wk-image-link">
            <img class="wk-image" src="{{ product | image_url: width: 1000, height: 1000 }}">
          </div>
          <div class="wk-meta">
            <span class="wk-vendor">&nbsp;</span>
            <span class="wk-product-title">{{ 'general.product_removed' | t }}</span>
          </div>
          {%- if wishlist.is_mine -%}
            <remove-button
              data-wishlist-item-id="{{ wishlist_item.id }}"
              data-layout="icon-only"
              data-floating-reference="#{{ container_id }} .wk-image"
              data-floating-position-placement="top-end"
              data-icon="remove"
            ></remove-button>
          {%- endif -%}
        </div>
      {%- else -%}
        {%- assign product = wishlist_item.product -%}
        {%- assign variant = form.selected_variant -%}
        {%- if product.has_only_default_variant -%}
          {%- assign variant = product.variants | first -%}
        {%- endif -%}

        {%- if variant.price < variant.compare_at_price -%}
          {%- assign container_class = "wk-product-card wk-sale" -%}
        {%- else %}
          {%- assign container_class = "wk-product-card" -%}
        {%- endif -%}

        <div id="{{ container_id }}" class="{{ container_class }}">
          <a href="{{ product | variant_url }}" class="wk-image-link" aria-label="{{ 'general.view_product' | t }}">
            <img class="wk-image" src="{{ product | image_url: width: 1000, height: 1000 }}">
          </a>
          <div class="wk-meta">
            <span class="wk-vendor">{{ product.vendor }}</span>
            <a class="wk-product-title" href="{{ product | variant_url }}">{{ product.title }}</a>
            <div class="wk-price">
              {%- if variant -%}
              <span class="wk-current-price">{{ variant.price | money }}</span>
              <span class="wk-compare-price">{{ variant.compare_at_price | money }}</span>
              {%- endif -%}
            </div>
          </div>
          {%- if wishlist.is_mine -%}
          <form 
            class="wk-form"
            method="post" 
            action="{{ routes.cart_add_url }}" 
            data-wishlist-id="{{ wishlist.id }}"
            data-wishlist-item-id="{{ wishlist_item.id }}"
          >
            <input name="id" value="{{ variant.id }}" type="hidden">
            {%- unless product.has_only_default_variant -%}
              <div class="wk-variants">
                {%- for option in form.options_with_values -%}
                  <wk-select 
                    name="options[{{ option.name | escape }}]"
                    label="{{ option.name }}"
                    text="{{ option.selected_value | default: option.name }}"
                  >
                    {%- if option.selected_value == null or option.unavailable_values contains option.selected_value -%}
                      <option value>- {{ 'general.select_option' | t: name: option.name }} -</option>
                    {%- endif -%}
                    {%- for value in option.values -%}
                      {%- assign soldout = option.soldout_values contains value -%}
                      {%- assign unavailable = option.unavailable_values contains value and option.name == "Size" -%}
                      {%- assign selected = option.selected_value == value -%}
                      {%- unless unavailable -%}
                        <option 
                          value="{{ value | escape }}"
                          {%- if selected %} selected{%- endif -%}
                        >
                          {{ value }}{%- if soldout %} ({{ 'general.sold_out' | t }}){%- endif -%}
                        </option>
                      {%- endunless -%}
                    {%- endfor -%}
                  </wk-select>
                {%- endfor -%}
              </div>
            {%- endunless -%}
            <div class="wk-quantity">
              <label class="wk-quantity-label">{{ 'general.quantity' | t }}</label>
              <input class="wk-quantity-input" type="number" name="quantity" value="1" min="1">
            </div>
            <button 
              type="submit" 
              class="wk-submit-button"
              data-wishlist-item-id="{{ product.wishlist_item_id }}"
              {%- unless variant.available -%}disabled{%- endunless -%}
            >
              <span class="wk-submit-label">
                {%- if variant.available -%}
                  {{ 'general.add_to_cart' | t }}
                {%- elsif variant == null and form.has_selection -%}
                  {{ 'general.unavailable' | t }}
                {%- elsif variant == null -%}
                  {{ 'general.select_variant' | t }}
                {%- else -%}
                  {{ 'general.sold_out' | t }}
                {%- endif -%}
              </span>
              <wk-icon icon="spinner" class="wk-submit-spinner"></wk-icon>
            </button>
          </form>
          {%- endif -%}

          {%- if wishlist.is_mine -%}
            <remove-button
              data-wishlist-item-id="{{ wishlist_item.id }}"
              data-layout="icon-only"
              data-floating-reference="#{{ container_id }} .wk-image"
              data-floating-position-placement="top-end"
              data-icon="remove"
            ></remove-button>
          {%- else -%}
            <wishlist-button 
              data-product-id="{{ product.id }}"
              data-wishlist-item-id="{{ wishlist_item.id }}"
              data-layout="icon-only"
              data-floating-reference="#{{ container_id }} .wk-image"
              data-floating-position-placement="top-end"
              data-icon="wishlist"
            ></wishlist-button>
          {%- endif -%}

        </div>
      {%- endif -%}
    `;
  }
}

customElements.define("wishlist-product-card", WishlistProductCard);

export class WishlistButton extends WishlistElement {
  getStateConfig() {
    return {
      productInfo: true,
    };
  }

  getEventConfig() {
    return {
      "click wk-button": this.handleClick,
    };
  }

  appReadyCallback() {
    this.app.events.subscribe("wk:product:change-variant:success", (event) => {
      if (this.dataset.productHandle === event.data.productHandle) {
        const wishlistItemId = this.state.productInfo
          ? this.state.productInfo.wishlistItemId
          : undefined;

        const currentVariantId = this.state.productInfo
          ? this.state.productInfo.variantId
          : undefined;

        if (wishlistItemId && !currentVariantId) {
          this.app.updateWishlistItem({
            wishlistItemId,
            changes: {
              variantId: event.data.variantId,
            },
          });
        }

        this.dataset.variantId = event.data.variantId;
      }
    });
  }

  handleClick() {
    if (this.state.productInfo.inWishlist) {
      return this.app.removeWishlistItem(this.state.productInfo);
    } else {
      return this.app.addWishlistItem(this.state.productInfo);
    }
  }

  render() {
    const inWishlist =
      this.state.productInfo && this.state.productInfo.inWishlist;

    const text = this.getTranslation(
      inWishlist ? "general.in_wishlist" : "general.add_to_wishlist"
    );

    const hint = this.getTranslation(
      inWishlist ? "general.remove_from_wishlist" : "general.add_to_wishlist"
    );

    return html`
      <wk-button
        .text=${text}
        .hint=${hint}
        .selected=${inWishlist}
        .settings=${this.dataset}
      ></wk-button>
    `;
  }
}

customElements.define("wishlist-button", WishlistButton);

export class RemoveButton extends WishlistElement {
  getEventConfig() {
    return {
      "click .wk-button": this.handleClick,
    };
  }

  handleClick() {
    return this.app.removeWishlistItem({
      wishlistItemId: this.dataset.wishlistItemId,
    });
  }

  render() {
    const text = this.getTranslation("general.remove_from_wishlist");
    const hint = this.getTranslation("general.remove_from_wishlist");

    return html`
      <wk-button
        .text=${text}
        .hint=${hint}
        .settings=${this.dataset}
      ></wk-button>
    `;
  }
}

customElements.define("remove-button", RemoveButton);

export class WishlistLink extends WishlistElement {
  getStateConfig() {
    return {
      wishlist: "minimal",
    };
  }

  getWishlistUrl() {
    if (this.app.settings.loginRequired && !this.app.customer) {
      return this.app.routes.accountLoginUrl;
    }
    return this.app.routes.wishlistUrl;
  }

  render() {
    const wishlistUrl = this.getWishlistUrl();
    const text = this.getTranslation("general.wishlist");
    const hint = this.getTranslation("general.view_wishlist");

    return html`
      <wk-button
        .href=${wishlistUrl}
        .text=${text}
        .hint=${hint}
        .selected=${this.state.wishlist.numItems > 0}
        .badge=${this.state.wishlist.numItems}
        .settings=${this.dataset}
      ></wk-button>
    `;
  }
}

customElements.define("wishlist-link", WishlistLink);

export class WishlistShare extends WishlistElement {
  getStateConfig() {
    return {
      wishlist: "minimal",
    };
  }

  getEventConfig() {
    return {
      "click wk-button": this.handleClick,
    };
  }

  async handleClick() {
    const { clipboard } = await this.app.shareWishlist({
      wishlistId: this.state.wishlist.publicId,
      title: this.getTranslation("general.share_list_title"),
      text: this.getTranslation("general.share_list_description"),
    });

    if (clipboard) {
      this.updateState({ linkCopied: true });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this.updateState({ linkCopied: false });
    }
  }

  render() {
    const text = this.getTranslation(
      this.state.linkCopied
        ? "general.share_link_copied"
        : "general.share_wishlist"
    );

    return html`
      <wk-button
        .text=${text}
        .hint=${text}
        .settings=${this.dataset}
      ></wk-button>
    `;
  }
}

customElements.define("wishlist-share", WishlistShare);

setIcons({
  wishlist: `
    <svg aria-hidden="true" focusable="false" role="presentation" viewBox="0 0 64 64">
      <path d="M32.012,59.616c-1.119-.521-2.365-1.141-3.707-1.859a79.264,79.264,0,0,1-11.694-7.614C6.316,42,.266,32.6.254,22.076,0.244,12.358,7.871,4.506,17.232,4.5a16.661,16.661,0,0,1,11.891,4.99l2.837,2.889,2.827-2.9a16.639,16.639,0,0,1,11.874-5.02h0c9.368-.01,17.008,7.815,17.021,17.539,0.015,10.533-6.022,19.96-16.312,28.128a79.314,79.314,0,0,1-11.661,7.63C34.369,58.472,33.127,59.094,32.012,59.616Z"/>
    </svg>
  `,
  remove: `
    <svg aria-hidden="true" focusable="false" role="presentation" viewBox="0 0 64 64">
      <path d="M0.309,0.309a0.9,0.9,0,0,1,1.268,0L63.691,62.423a0.9,0.9,0,0,1-1.268,1.268L0.309,1.577A0.9,0.9,0,0,1,.309.309Z"/>
      <path d="M63.691,0.309a0.9,0.9,0,0,1,0,1.268L1.577,63.691A0.9,0.9,0,0,1,.309,62.423L62.423,0.309A0.9,0.9,0,0,1,63.691.309Z"/>
    </svg>
  `,
  share: `
    <svg aria-hidden="true" focusable="false" role="presentation" viewBox="0 0 122.88 122.88">
      <path d="M60.54,34.07A7.65,7.65,0,0,1,49.72,23.25l13-12.95a35.38,35.38,0,0,1,49.91,0l.07.08a35.37,35.37,0,0,1-.07,49.83l-13,12.95A7.65,7.65,0,0,1,88.81,62.34l13-13a20.08,20.08,0,0,0,0-28.23l-.11-.11a20.08,20.08,0,0,0-28.2.07l-12.95,13Zm14,3.16A7.65,7.65,0,0,1,85.31,48.05L48.05,85.31A7.65,7.65,0,0,1,37.23,74.5L74.5,37.23ZM62.1,89.05A7.65,7.65,0,0,1,72.91,99.87l-12.7,12.71a35.37,35.37,0,0,1-49.76.14l-.28-.27a35.38,35.38,0,0,1,.13-49.78L23,50A7.65,7.65,0,1,1,33.83,60.78L21.12,73.49a20.09,20.09,0,0,0,0,28.25l0,0a20.07,20.07,0,0,0,28.27,0L62.1,89.05Z"/>
    </svg>
  `,
  caret: `
  <svg aria-hidden="true" focusable="false" role="presentation" viewBox="0 0 24 24">
    <path d="M6.1018 8C5.02785 8 4.45387 9.2649 5.16108 10.0731L10.6829 16.3838C11.3801 17.1806 12.6197 17.1806 13.3169 16.3838L18.8388 10.0731C19.5459 9.2649 18.972 8 17.898 8H6.1018Z"/>
  </svg>  
  `,
  spinner: `
    <svg class="wk-spinner-svg" aria-hidden="true" focusable="false" role="presentation" viewBox="0 0 66 66">
      <circle class="wk-spinner-circle" fill="none" stroke-width="6" cx="33" cy="33" r="30"></circle>
    </svg>
  `,
});
