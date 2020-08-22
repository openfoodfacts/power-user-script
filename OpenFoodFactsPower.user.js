// ==UserScript==
// @name        Open Food Facts power user script
// @description Helps power users in their day to day work. Key "?" shows help. This extension is a kind of sandbox to experiment features that could be added to Open Food Facts website.
// @namespace   openfoodfacts.org
// @version     2020-07-01T11:58
// @include     https://*.openfoodfacts.org/*
// @include     https://*.openproductsfacts.org/*
// @include     https://*.openbeautyfacts.org/*
// @include     https://*.openpetfoodfacts.org/*
// @include     https://*.pro.openfoodfacts.org/*
// @include     https://*.openfoodfacts.dev/*
// @exclude     https://*.wiki.openfoodfacts.org/*
// @exclude     https://wiki.openfoodfacts.org/*
// @exclude     https://translate.openfoodfacts.org/*
// @exclude     https://donate.openfoodfacts.org/*
// @exclude     https://monitoring.openfoodfacts.org/*
// @icon        http://world.openfoodfacts.org/favicon.ico
// @updateURL   https://github.com/openfoodfacts/power-user-script/raw/master/OpenFoodFactsPower.user.js
// @grant       GM_getResourceText
// @require     http://code.jquery.com/jquery-latest.min.js
// @require     http://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @require     https://cdn.jsdelivr.net/jsbarcode/3.6.0/JsBarcode.all.min.js
// @author      charles@openfoodfacts.org
// ==/UserScript==

// Product Opener (Open Food Facts web app) uses:
// * jQuery 2.1.4:
//   view-source:https://static.openfoodfacts.org/js/dist/jquery.js
//   http://code.jquery.com/jquery-2.1.4.min.js
// * jQuery-UI 1.12.1:
//   view-source:https://static.openfoodfacts.org/js/dist/jquery-ui.js
//   http://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// * Tagify 3.6.3, in replacement of jQuery-Tags-Input 1.3.6 (no more maintained)
//   https://github.com/yairEO/tagify

(function() {
    'use strict';

    var version_user;
    var version_date;
    var proPlatform = false; // TODO: to be included in isPageType()
    const pageType = isPageType(); // test page type
    console.log("2020-07-01T11:58 - mode: " + pageType);

    // Disable extension if the page is an API result; https://world.openfoodfacts.org/api/v0/product/3222471092705.json
    if (pageType === "api") {
        // TODO: allow keyboard shortcut to get back to product view?
        var _code = window.location.href.match(/\/product\/(.*)\.json$/)[1];
        var viewURL = document.location.protocol + "//" + document.location.host + "/product/" + _code;
        console.log('press v to get back to product view: ' + viewURL);
        $(document).on('keydown', function(event) {
             if (event.key === 'v') {
                 window.open(viewURL, "_blank"); // open a new window
                 return;
             };
        });
        return;
    }

    // Setup options
    var zoomOption        = false; // "true" allows zooming images with mouse wheel, while "false" disallow it
    var listByRowsOption  = false; // "true" automatically lists products by rows, while "false" not

    //Hidden form for ingredients analysis used both in list mode and single products.
    //Ingredients analysis takes its input from 'ingredients_text' for single products or from textarea with the id=i[product_id] when in a list
    //but the language pages have the text in 'ingredients_text_xx'
    //so we have to copy the text (in Copytext) before submitting the form
    var analyse_form = document.createElement("form");
    analyse_form.setAttribute("method", "get");
    analyse_form.setAttribute("enctype", "multipart/form-data");
    var txt = document.createElement('textarea');
    txt.setAttribute('id', 'ingredients_text');
    txt.setAttribute('name', 'ingredients_text');
    txt.setAttribute('style', 'display:none;');
    var sub = document.createElement('input');
    sub.setAttribute('type', 'hidden');
    sub.setAttribute('name', 'action');
    sub.setAttribute('value', 'process');
    analyse_form.appendChild(txt);
    analyse_form.appendChild(sub);
    document.body.appendChild(analyse_form);

    // Open Food Facts power user
    // * Main code by Charles Nepote (@CharlesNepote)
    // * Barcode code by @harragastudios

    // Firefox: add it via Greamonkey or Tampermonkey extension: https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/
    // Chrome (not tested): add it with Tampermonkey: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo

    // Main features
    // * DESIGN (custom CSS with small improvements)
    //   * barcode highlighted with a sweet color
    //   * better distinguished sections
    //   * fields highlighted, current field highlighted
    //   * less margins for some elements
    // * UI
    //   * help screen called with button [?] or keyboard shortcut (?) or (h)
    //   * zoom every images with mouse wheel; see http://www.jacklmoore.com/zoom/
    //   * show/hide barcode; keyboard shortcut (shift+B)
    //     * see https://github.com/openfoodfacts/openfoodfacts-server/issues/1728
    //   * Edit mode: show hide help comments for each field (see help screen)
    //   * Ingredient lists: external link for each ingredient (appear when hovering rows)
    //   * keyboard shortcut to API product page (a)
    //   * keyboard shortcut to get back to view mode (v)
    //   * keyboard shortcut to enter edit mode: (e) in the current window, (E) in a new window
    //     * see Add "Edit" keyboard shortcut for logged users: https://github.com/openfoodfacts/openfoodfacts-server/issues/1852
    //   * keyboard shortcuts to help modify data without a mouse: P(roduct), Q(uality), B(rands), C(ategories), L(abels), I(ngredients), (e)N(ergy), F(ibers)
    //   * Quick links in the sidebar: page translation, category translation, Recent Changes, Hunger Game...
    //   * dedicated to list screens (facets, search results...):
    //     * [alpha] keyboard shortcut to list products as a table containing ingredients and options to edit or delete ingredients
    //               (shift+L) ["L" for "list"]
    //               The LanguageTool Firefox extension is recommanded because it detects automatically the language of each field.
    //               https://addons.mozilla.org/en-US/firefox/addon/languagetool/
    //     * Inline edit of ingredients in list mode
    //   * Firefox: Nutrition facts picture takes all the place available
    // * FEATURES
    //   * [beta] transfer data from a language to another (use *very* carefully); keyboard shortcut (shift+T)
    //   * [beta] easily delete ingredients, by entering the list by rows mode (shift+L)
    //   * [alpha] allow flagging products for later review (shift+S)
    //     * https://github.com/openfoodfacts/openfoodfacts-server/issues/1408
    //     * Ask charles@openfoodfacts.org
    //   * launch Google OCR if "Edit ingredients" is clicked in view mode
    //   * "[Products without brand that might be from this brand]" link, following product code
    //   * Links beside barcode number: Google link for product barcode + Open Beauty Facts + Open Pet Food Facts + pro.openfoodfacts.dev
    //   * Product view: button to open an ingredient analysis popup
    //   * help screen: add "Similarly named products without a category" link
    //   * help screen: add "Product code search on Google" link
    //   * help screen: add links to Google/Yandex Reverse Image search (thanks Tacite for suggestion)
    //   * Add fiew informations on the confirmation page:
    //     * Products issues:
    //       * To be completed (from "states_tags")
    //       * Quality errors tags (green message if none)
    //       * Quality warings tags (green message if none)
    //       * and a link to product edit
    //     * Going further
    //       * "XX products without brand that might be from this brand" link
    //   * Add a field to filter Recent Changes results (filter as you type)

    // * DEPLOYMENT
    //   * Tampermonkey suggests to update the extension when one click to updateURL:
    //     https://gist.github.com/CharlesNepote/f6c675dce53830757854141c7ba769fc/raw/OpenFoodFactsPowerUser.user.js


    // TODO
    // * FEATURES
    //   * Easily delete nutrition facts (Tacite, Teolemon, Sebleouf)
    //   * identify problematic fields based on quality feedbacks; https://world.openfoodfacts.org/api/v0/product/7502271153193.json
    //     * see "data_quality_errors_tags" array
    //   * Add automatic detection of nutriments, see: https://robotoff.openfoodfacts.org/api/v1/predict/nutrient?ocr_url=https://static.openfoodfacts.org/images/products/841/037/511/0228/nutrition_pt.12.json
    //   * Easily delete ingredients when too buggy
    //   * Add a shortcut to move a product to OBF, OPF
    //   * Add few informations on the confirmation page:
    //     * Nutri-Score and NOVA if just calculated?
    //     * unknown ingredients
    //   * Product of a brand from a particular country, that are not present in this country (see @teolemon)
    //   * Keyboard shortcut to get back to view mode (v) => target=_self + prevent leaving page if changes are not saved
    //   * On the fly quality checks in the product edit form (javascript): https://github.com/openfoodfacts/openfoodfacts-server/issues/1905
    //   * Mass edit (?) -- see https://github.com/roiKosmic/OFFMassUpdate/blob/master/js/content_script.js
    //   * Mass edit with regexp (with preview)
    //   * Mass deletion of a tag?
    //   * Mini Hunger Game (dedicated to categories?)
    //   * Revert from an old version
    // * UI & DESIGN
    //   * Picture dates
    //     => in the list: change background color depending on the year?
    //     => in the product page: highlight in red when date is old?
    //   * Highlight products with old pictures (?)
    //   * Add a fixed menu button as in mass-updater
    //   * Highlight empty fields?
    //   * Select high resolution images on demand
    //   * Show special prompt when the nutrition photo has changed, but not the nutrition data itself: https://github.com/openfoodfacts/openfoodfacts-server/issues/1910
    //   * Show a special prompt when the ingredient list photo has changed, but not the ingredient list itself: https://github.com/openfoodfacts/openfoodfacts-server/issues/1909
    // * BUGS
    //   * deal with products without official barcodes: https://fr.openfoodfacts.org/produit/2000050217197/mondose-exquisite-belgian-chocolates
    //   * wheelzoom transform image links to: data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaH..................
    //   * Some access keys dont seem to work, due to javascript library
    //     * See Support hitting the TAB key only once to quickly move to the next text field and then make entering text possible:
    //       https://github.com/openfoodfacts/openfoodfacts-server/issues/1245
    //   * focus on .tagsinput fields is not highlighted


    // css
    // See https://stackoverflow.com/questions/4376431/javascript-heredoc
    var css = `
/*
 * OFF web app already load jquery-ui.css but it doesn't work properly with "dialog" function.
 * We add the CSS this way so that the embedded, relatively linked images load correctly.
 * (Use //ajax... so that https or http is selected as appropriate to avoid "mixed content".)
 */

.ui-dialog {
	position: absolute;
	top: 0;
	left: 0;
	padding: .2em;
	outline: 0;
}
.ui-dialog .ui-dialog-titlebar {
	padding: .4em 1em;
	position: relative;
}
.ui-dialog .ui-dialog-title {
	float: left;
	margin: .1em 0;
	white-space: nowrap;
	width: 90%;
	overflow: hidden;
	text-overflow: ellipsis;
}
.ui-dialog .ui-dialog-titlebar-close {
	position: absolute;
	right: .3em;
	top: 50%;
	width: 20px;
	margin: -10px 0 0 0;
	padding: 1px;
	height: 20px;
}
.ui-dialog .ui-dialog-content {
	position: relative;
	border: 0;
	padding: .5em 1em;
	background: none;
	overflow: auto;
}
.ui-dialog .ui-dialog-buttonpane {
	text-align: left;
	border-width: 1px 0 0 0;
	background-image: none;
	margin-top: .5em;
	padding: .3em 1em .5em .4em;
}
.ui-dialog .ui-dialog-buttonpane .ui-dialog-buttonset {
	float: right;
}
.ui-dialog .ui-dialog-buttonpane button {
	margin: .5em .4em .5em 0;
	cursor: pointer;
}

.ui-dialog .ui-resizable-n {
	height: 2px;
	top: 0;
}
.ui-dialog .ui-resizable-e {
	width: 2px;
	right: 0;
}
.ui-dialog .ui-resizable-s {
	height: 2px;
	bottom: 0;
}
.ui-dialog .ui-resizable-w {
	width: 2px;
	left: 0;
}
.ui-dialog .ui-resizable-se,
.ui-dialog .ui-resizable-sw,
.ui-dialog .ui-resizable-ne,
.ui-dialog .ui-resizable-nw {
	width: 7px;
	height: 7px;
}
.ui-dialog .ui-resizable-se {
	right: 0;
	bottom: 0;
}
.ui-dialog .ui-resizable-sw {
	left: 0;
	bottom: 0;
}
.ui-dialog .ui-resizable-ne {
	right: 0;
	top: 0;
}
.ui-dialog .ui-resizable-nw {
	left: 0;
	top: 0;
}
.ui-draggable .ui-dialog-titlebar {
	cursor: move;
}
/** End of jquery-ui requirements **/



/* .row { width: 80% !important; margin: 0 0 !important; } */

/* Special color for barcode */
span[property="food:code"] { color: Olive; }

/* Enhancements to better distinguish sections: Product information, Ingredients and Nutriments facts */
#main_column > div > h2 { margin-top: 1.6rem !important;
margin-bottom: 0.2rem !important;
border-bottom: 1px solid lightgrey; }

/* Special background color for all input fieds */
textarea, .tagify, input[type=text], input.nutriment_value { background-color: LightYellow !important; }
textarea:focus, .tagify__input:focus, .tagify:focus, input[type=text]:focus, input.nutriment_value:focus { background-color: lightblue !important; }

/* Small enhancements */
p { margin-bottom: 0.6rem !important; }

#image_box_front { margin-bottom: 1rem !important; }

.unselectbuttondiv_front_fr {
text-align: center !important; }

.unselectbutton_front_fr {
margin:0 0 0 0 !important;
}

/* Buttons Rotate left - Rotate right: 0.25rem vs 1.25 */
.cropbox > div > a { margin: 0 0 0.25rem; }

/* checkbox: Normalize colors and Photo on white background: try to remove the background */
.cropbox > label { margin-top: 3px; }
.cropbox > input { margin: 0 0 0.5rem 0; }

/* Reset margins of nutriments form */
input.nutriment_value { margin: 0 0 0 0; }

input.show_comparison {
margin: 0 0 0.2rem 0 !important;
}

.pus_menu {
font-size: 0.9rem;
}

.ui-widget-content a {
color: #00f;
}

#pwe_help {
position:fixed;
left:0%;
top:3rem;
padding:0 0.7rem 0 0.7rem;
font-size:1.5rem;
background-color:red;
border-radius: 0 10px 10px 0;
}

#ing_analysis {
position:fixed;
left:0%;
top:5rem;
padding:0 0.7rem 0 0.7rem;
font-size:1.5rem;
background-color:red;
border-radius: 0 10px 10px 0;
}

/* Let nutrition image as tall as Nutrition facts table */
#nutrition_image_copy {
width: 80%;
width: -moz-available;
height: 92%;
}

#nutrition_image_copy > img {
/* Vertical image:    https://world.openfoodfacts.org/cgi/product.pl?type=edit&code=8002063211913 */
/* Horizontal image:  https://world.openfoodfacts.org/cgi/product.pl?type=edit&code=0490711801117 */
height: 100%;/**/
width: 100%;/**/
/* https://hacks.mozilla.org/2015/02/exploring-object-fit/ */
object-fit:contain;
object-position: left;
}

.productLink::before {
content: " — ";
}

.hidden {
 display: none;
}

.ingredient_td:hover .hidden {
 display: inline;
}

.pus_edit_link {
 display: inline !important; /**/
 z-index: -2;/**/
 position: relative;
 bottom: 7rem;
 border: 3px solid;
 right: 0rem;
}

.product_link {
 z-index: 2;
 background-color: white;
}

.pus_edit_link:hover {
 z-index: 5;
}

.product_link:hover + .pus_edit_link {
 z-index: 5;
}

`;

    // apply custom CSS
    var s = document.createElement('style');
    s.type = 'text/css';
    s.innerHTML = css;
    document.documentElement.appendChild(s);



    // ***
    // * Image zoom
    // *
    // Test image zoom with mouse wheel
    // Don't forget to add: // @require     https://cdn.jsdelivr.net/npm/wheelzoom
    if(zoomOption) { wheelzoom(document.querySelectorAll('img')); } // doesn't work in edit mode

    // Test image zoom with jquery-zoom
    // Don't forget to add: // @require     https://cdn.jsdelivr.net/npm/jquery-zoom
    // $('img').zoom({ on:'grab' }); // add zoom // doesn't work
    // $('img').trigger('zoom.destroy'); // remove zoom



    // ***
    // * Every modes, except "list"
    // *
    // Build variables
    if(pageType !== "list") {
        var code, barcode;
        code = getURLParam("code")||$('span[property="food:code"]').html();
        console.log("code: "+ code);
        // build API product link; example: https://world.openfoodfacts.org/api/v0/product/737628064502.json
        var apiProductURL = "/api/v0/product/" + code + ".json";
        console.log("API: " + apiProductURL);
        // build edit url
        var editURL = document.location.protocol + "//" + document.location.host + "/cgi/product.pl?type=edit&code=" + code;
    }



    // ***
    // * Every mode, except "api"
    // *
    // Add quick links in the sidebar: page translation, category translation, Recent Changes...
    if (pageType !== "api") {
        var pageLanguage = $("html").attr('lang');      // Get page language
        console.log("Page language: " + pageLanguage);
        if(pageLanguage === "en") {                     // Delete page language if "en" because we can't make the difference bewteen "en-GB" and "en-US"
            pageLanguage = "";
        }
        // Non contextual links
        $(".sidebar p:first").after(
            '<p>'+
            '> <a href="https://crowdin.com/project/openfoodfacts/'+pageLanguage+'">' +
            'Help page translation</a></p>'+
            '<p>'+
            '> <a href="/categories?translate=1">' +
            'Help category translations</a></p>'+
            '<p>'+
            '> <a href="/cgi/recent_changes.pl?&page=1&page_size=900">' +
            'Recent Changes</a>' +
            '</p>' +
            '<p id="hungerGameLink">'+
            '> <a href="https://hunger.openfoodfacts.org">' +
            'Hunger Game</a>' +
            '</p>'
        );
        // Hunger Game contextual link
        var tagName;
        var hungerGameDeepLink =
            ($("div[itemtype='https://schema.org/Brand']").length) ? "questions?type=brand&value_tag=" + normalizeTagName($("h1[itemprop='name']").text())
            : (/label\/(.*)$/.test(document.URL) === true) ? "questions?type=label&value_tag=en:" +  normalizeTagName(RegExp.$1)
            : (($("div[itemtype='https://schema.org/Thing']").length) ? "questions?type=category&value_tag=en:" +  normalizeTagName($("h1[itemprop='name']").text())
            : "");
        $("#hungerGameLink").after(
            ((hungerGameDeepLink) ? '<p>'+
            '> <a href="https://hunger.openfoodfacts.org/' + hungerGameDeepLink + '">' +
            'Hunger Game (deep)</a>' +
            '</p>' : "")
        );
    }


    // Add external link to ingredient so it opens in a new window
    if (pageType === "ingredients"){
        $('#tagstable').find('tr').each(function(){
            var tds = $(this).find('td');
            var urlToIngredient;
            $(this).children().addClass("ingredient_td");
            if(tds.length != 0) {
                urlToIngredient = tds.children().attr("href"); // /category/gouda/ingredient/dairy
            }
            $(this).find('td').children().after(' <a href="'+ urlToIngredient +'" target="_blank"><span class="hidden"> ↗ ↗ ↗ </span></a>');
        });
    }


    // Add a button to go straight to edit rather than the product page then edit
	if (pageType === "list") {
        $( "ul.products > li a" ).each(function() {
            $(this).addClass("product_link");
            var href = $(this).attr("href");
            //console.log("href:" + href);
            var productCode = href.split("/")[2];
            //console.log("productCode:" + productCode);
            $(this).after('<a class="pus_edit_link" href="'+
                          "/cgi/product.pl?type=edit&code=" + productCode + '" target="_blank">🖉</a>');

        });
    }


    // ***
    // * Every mode, except "api", "list", "search-form"
    // *
    if (pageType === "edit" ||
        pageType === "product view"||
        pageType === "saved-product page") {


        if(proPlatform) {
            var publicURL = document.URL.replace(/\.pro\./gi, ".");
            console.log("publicURL: "+publicURL);
            $(".sidebar p:first").after('<p>> <a href="'+publicURL+'">Product public URL</a></p>');
        }

        // Add informations right after the barcode
        if ($("#barcode_paragraph")) {
            // Find products from the same brand
            var sameBrandProducts = code.replace(/[0-9][0-9][0-9][0-9]$/gi, "xxxx");
            var sameBrandProductsURL = document.location.protocol +
                "//" + document.location.host +
                '/state/brands-to-be-completed/code/' +
                sameBrandProducts;
            $("#barcode_paragraph")
                .append(' <span id="sameBrandProductLink" class="productLink">[<a href="' +
                        sameBrandProductsURL +
                        '" title="Products without brand that might be from this brand">'+
                        'Non-branded ϵ same brand?</a>]</span>');
            // Google Link
            var googleLink = 'https://www.google.com/search?q=' + code;
            $("#barcode_paragraph")
                .append(' <span id="googleLink" class="productLink">[<a href="' + googleLink +
                        '">G</a>]');
            // DuckDuckGo Link
            var duckLink = 'https://duckduckgo.com/?q=' + code;
            $("#barcode_paragraph")
                .append(' <span id="duckLink" class="productLink">[<a href="' + duckLink +
                        '">DDG</a>]');
            // Link to Open Beauty Facts
            var obfLink = 'https://world.openbeautyfacts.org/product/' + code;
            productExists("https://cors-anywhere.herokuapp.com/"+obfLink,"#obfLinkStatus","","");
            $("#barcode_paragraph")
                .append(' <span id="obfLink" class="productLink">[<a href="' + obfLink +
                        '">obf.org</a>] (<span id="obfLinkStatus"></span>)');
            // Link to Open Pet Food Facts
            var opffLink = 'https://world.openpetfoodfacts.org/product/' + code;
            productExists("https://cors-anywhere.herokuapp.com/"+opffLink,"#opffLinkStatus","","");
            $("#barcode_paragraph")
                .append(' <span id="opffLink" class="productLink">[<a href="' + opffLink +
                        '">opff.org</a>] (<span id="opffLinkStatus"></span>)');
            // Link to .pro.openfoodfacts.dev
            //var proDevLink = 'https://off:off@world.pro.openfoodfacts.dev/product/' + code;
            var proDevLink = 'https://world.pro.openfoodfacts.dev/product/' + code;
            productExists("https://cors-anywhere.herokuapp.com/"+proDevLink,"#proDevLinkStatus","off","off");
            $("#barcode_paragraph")
                .append(' <span id="devProPlatform" class="productLink">[<a href="' + proDevLink +
                        '">.pro.off.dev</a>] (<span id="proDevLinkStatus"></span>)');

            // https://fr.openfoodfacts.org/etat/marques-a-completer/code/506036745xxxx&json=1
            var sameBrandProductsJSON = sameBrandProductsURL + "&json=1";
            $.getJSON(sameBrandProductsJSON, function(data) {
                var nbOfSameBrandProducts = data.count;
                console.log("nbOfSameBrandProducts: " + nbOfSameBrandProducts);
                if($("#going-further")) $("#going-further").append('<li><span><a href="' +
                                     sameBrandProductsURL +
                                     '">' + nbOfSameBrandProducts +
                                     ' products without brand that might be from this brand</a></span>' +
                                     '</li>');
                if($("#barcode_paragraph")) $("#sameBrandProductLink").html(
                    '[<a href="' +
                        sameBrandProductsURL +
                        '" title="Products without brand that might be from this brand">'+
                        nbOfSameBrandProducts + ' non-branded ϵ same brand</a>]');
            });

        }

        // Compute Google and Yandex reverse image search
        var gReverseImageURL = "https://images.google.com/searchbyimage?image_url=";
        var yReverseImageURL = "https://yandex.com/images/search?source=collections&url=";
        var frontImgURL = $('meta[name="twitter:image"]').attr("content");
        var ingredientsImgURL = ($('#image_box_ingredients a img').attr('srcset') ? $('#image_box_ingredients a img').attr('srcset').match(/(.*) (.*)/)[1] : "");
        var nutritionImgURL = ($('#image_box_nutrition a img').attr('srcset') ? $('#image_box_nutrition a img').attr('srcset').match(/(.*) (.*)/)[1] : "");

        // Help box based on page type: api|saved-product page|edit|list|search form|product view
        var help = "<ul class='pus_menu'>" +
            "<li>(?) or (h): this present help</li>" +
            "<hr id='nav_keys'>" +
            ((pageType === "edit") ?
               '<li><input class="pus-checkbox" type="checkbox" id="pus-helpers" checked><label>Field helpers</label></li>':
               "") +
            ((pageType === "product view"|pageType === "edit") ?
               "<li>(Shift+b): show/hide <strong>barcode</strong></li>" +
               "<li>(Alt+shift+key): direct access to (P)roduct name, (Q)uality, (B)rands, (C)ategories, (L)abels, (I)ngredients, e(N)ergy, (F)ibers</li>" +
               "<hr>":
               "") +
            ((pageType === "product view"|pageType === "api") ?
              "<li>(e): edit current product in current window</li>" +
              "<li>(E): edit product in a new window</li>":
              "") +
            ((pageType === "product view"|pageType === "edit") ?
              "<li id='api_product_page'>(a): <a href='" + apiProductURL + "'>API product page</a> (json)</li>":
              "") +
            "<li><a href='https://google.com/search?&q="+ code + "'>Product code search on Google</a></li>" +
            "<li>Google Reverse Image search"+
               (pageType !== "product view" ? " (view mode only)</li>" :
                  ": " +
                  (frontImgURL ? "<a href='"+ gReverseImageURL + frontImgURL + "'>front</a>" : "")+
                  (ingredientsImgURL ? ", <a href='"+ gReverseImageURL + ingredientsImgURL + "'>ingredients</a>" : "") +
                  (nutritionImgURL ? ", <a href='"+ gReverseImageURL + nutritionImgURL + "'>nutrition</a>" : "")) +
            "</li>" +
            "<li>Yandex Reverse Image search"+
               (pageType !== "product view" ? " (view mode only)</li>" :
                  ": " +
                  (frontImgURL ? "<a href='"+ yReverseImageURL + frontImgURL + "'>front</a>" : "")+
                  (ingredientsImgURL ? ", <a href='"+ yReverseImageURL + ingredientsImgURL + "'>ingredients</a>" : "") +
                  (nutritionImgURL ? ", <a href='"+ yReverseImageURL + nutritionImgURL + "'>nutrition</a>" : "")) +
            "</li>" +
            "<li>(shift+T): <strong>transfer</strong> a product from a language to another, in edition mode only (use <strong>very</strong> carefully)</li>" +
            "<li>(shift+S): <strong>flag</strong> product for later review (ask <a href='mailto:charles@openfoodfacts.org'>charles@openfoodfacts.org</a> for log access)</li>" +
            "<hr>" +
            (pageType === "product view" ?
               "<li><a href='"+ sameBrandProductsURL + "'>" + sameBrandProducts + " products without a brand</a></li>" +
               "<li><a href=\""+ getSimilarlyNamedProductsWithoutCategorySearchURL() + "\">Similarly named products without a category</a></li>":
               "<li title='(view mode only)'>" + sameBrandProducts + " products without a brand</li>" +
               "<li title='(view mode only)'>Similarly named products without a category</li>") +
            "</ul>";

        // Help icon fixed
        $('body').append('<button id="pwe_help">?</button>');
        //$('#select_country_li').insertAfter('<li id="pwe_help" style="font-size:2rem;background-color:red;">?</li>'); // issue: menu desappear when scrolling

        // User help dialog
        $("#pwe_help").click(function(){
            showPowerUserInfo(help);
            toggleHelpers();
        });

        if (pageType === "edit"){

            //Ingredients analysis check - opens in new window
            $('body').append('<button id="ing_analysis">Ingredients analysis</button>');
            $("#ing_analysis").click(function(){
                //console.log("analyse");
                Copydata();
				submitToPopup(analyse_form);
            });
        }



        // Keyboard actions
        $(document).on('keydown', function(event) {
            // console.log(event);
            // If the key is not pressed inside a input field (ex. search product field)
            if (!$(event.target).is(':input') && !$(event.target).is('span.tagify__input')) {
                // (Shift + B): toggle show/hide barcode
                if (event.key === 'B') {
                    if (barcode === true) {
                        $("#barcode_draw").remove();
                        barcode = false;
                        return;
                    }
                    if (barcode === false || barcode === undefined) {
                        $('<canvas id="barcode_draw"></svg>').insertAfter('#barcode');
                        barcode = true;
                        JsBarcode("#barcode_draw", code, {
                            lineColor: "black",
                            width: 3,
                            height: 100,
                            displayValue: true});
                        return;
                    }
                }
                // (a): api page in a new window
                if ((pageType === "product view" || pageType == "edit") && event.key === 'a') {
                    window.open(apiProductURL, "_blank"); // edit in current window
                    return;
                }
                // (e): edit current product in current window
                if (pageType === "product view" && event.key === 'e') {
                    window.open(editURL, "_self"); // edit in current window
                    return;
                }
                // (E): edit current product in a new window
                if (pageType === "product view" && event.key === 'E') {
                    window.open(editURL); // open a new window
                    return;
                }
                // (v): if in "edit" mode, switch to view mode
                if (pageType !== "product view" && event.key === 'v') {
                    var viewURL = document.location.protocol + "//" + document.location.host + "/product/" + code;
                    window.open(viewURL, "_blank"); // open a new window
                    return;
                }
                // (I): ingredients
                if (pageType === "edit" && event.key === 'i') {
                    toggleIngredientsMode();
                    return;
                }                // (?): open help box
                if (event.key === '?' || event.key === 'h') {
                    showPowerUserInfo(help); // open a new window
                    toggleHelpers();
                    return;
                }
                // (S): Flag a product
                // See "Add a flag button/API to put up a product for review when you're in a hurry": https://github.com/openfoodfacts/openfoodfacts-server/issues/1408
                if (event.key === 'S') {
                    flagThisRevision();
                    return;
                }
                // (T): transfer a product from a language to another
                if (event.key === 'T') {
                    if (pageType !== "edit") {
                        showPowerUserInfo('<p>Transfer only work in "edit" mode.</p>');
                        return;
                    }
                    // products to test: https://es-en.openfoodfacts.org/language/en:1/language/french
                    // https://europe-west1-openfoodfacts-1148.cloudfunctions.net/openfoodfacts-language-change?ol=fr&fl=es&code=7622210829580
                    // TODO: use detectLanguages() function
                    var array_langs = $("#sorted_langs").val().split(",");
                    var options_langs;
                    var transferServiceURL = "https://europe-west1-openfoodfacts-1148.cloudfunctions.net/openfoodfacts-language-change";
                    $.each(array_langs,function(i){
                        options_langs += '<option value="'+(array_langs[i])+'">'+(array_langs[i])+'</option>';
                    });
                    console.log("options_langs: "+options_langs);
                    var transfer = "<div id=\"dialog\" title=\"Dialog Form\">" +
                        '<form action="' + transferServiceURL + '" method="get">' +
                        "<label>Source language:</label>" +
                        "<select id=\"transfer_ol\" name=\"ol\">" +
                        options_langs +
                        "</select>" +
                        "<label>Target language:</label>" +
                        "<input id=\"transfer_fl\" name=\"fl\" type=\"text\">" +
                        "<input type=\"hidden\" name=\"code\" value=\""+ code + "\">" +
                        "<input id=\"transfer_submit\" type=\"button\" value=\"=> Transfer\">" +
                        "</form>" +
                        '<div id="transfer_result"></div>' +
                        "</div>";
                    showPowerUserInfo(transfer); // open a new window
                    $("#transfer_submit").click(function(){
                        var url = transferServiceURL +
                            "?ol=" + $("#transfer_ol").val() +
                            "&fl=" + $("#transfer_fl").val() +
                            "&code=" + code;
                        console.log("transfert url: "+url);
                        $.ajax({url: url, success: function(result){
                            $("#transfer_result").html(result);
                        }});
                        $("#transfer_result").html("<p>Page is going to reload in 5s...</p>");
                        setTimeout(function() {
                            location.reload(); // reload the page
                        }, 8000);
                    });
                    return;
                }
            }

        });
    }




    // ***
    // * View mode
    // *
    // Test if we are in a product view.
    if (pageType === "product view") {

        // If ingredients are already entered, show results of the OCR
        if($("#editingredients")[0]) {
            // Looking for ingredients language
            var regex1 = new RegExp(/\((..)\)/);
            var ingredientsButton = $("#editingredients").html();
            //console.log($("#editingredients").html());
            var lc = regex1.exec(ingredientsButton)[1];
            console.log("Ingredients language: "+lc);

            // Show results of the OCR
            $('body').on('DOMNodeInserted', '#ingredients_list', function(e) {
                $(e.target).before( "<p>OCR results (not saved):</p>" );
                $(e.target).before( "<textarea id=\"ingredientFromGCV\"></textarea>" );
                getIngredientsFromGCV(code,lc);
                $(e.target).before( "<p>Text to be saved:</p>" );
            });
        }

    }



    // ***
    // * Edit mode
    // *
    // Accesskeys ; see https://stackoverflow.com/questions/5061353/how-to-create-a-keyboard-shortcut-for-an-input-button
    //    "P" could be for "Product characteristic" section (view mode: <h2>Product characteristics</h2> => <h2 id="product_characteristic">Product characteristics</h2> (not very useful) ; edit mode: <legend>Product characteristics</legend> => add the id)
    //    "P" could also be for the "product name" field (edit mode: id="product_name_fr" when fr)
    //    "Q" for "quantity"
    //    "B" for "brands"
    //    "C" for "categories" (very important field)
    //    "L" for "labels"
    //    "I" could be for "Ingredients" section (view mode: <h2>Ingredients</h2> => <h2 id="ingredients_section">Ingredients</h2> ; edit mode: <legend>Ingredients</legend> => add the id)
    //    "I" could also be for the "Ingredients" field (edit mode: id="ingredients_text_fr" when fr)
    //    "N" could be for "Nutrition facts" section (view mode: <h2>Nutrition facts</h2> => <h2 id="nutrition_facts_section">Nutrition facts</h2> ; edit mode: <legend>Nutrition facts</legend> => add the id)
    //    "N" could also be for the "Energy" field in edit mode (id="nutriment_energy")
    //    "F" for "Dietary fiber" (often not completed for historical reasons)
    if (pageType === "edit") {
        $("#product_name_fr").attr("accesskey","P");
        $("#quantity").attr("accesskey","Q");
        $("#brands_tagsinput").attr("accesskey","B");
        $("#categories_tagsinput").attr("accesskey","C");
        $("#labels_tagsinput").attr("accesskey","L");
        $("#ingredients_text_fr").attr("accesskey","I");
        $("#nutriment_energy").attr("accesskey","N");
        $("#nutriment_fiber").attr("accesskey","F");

        // Toggle helpers based on previous selection if any
        toggleHelpers();

        // TODO: add ingredients picture aside ingredients text area
        var ingredientsImage = $("#display_ingredients_es img");
        console.log("ingredientsImage: "+ ingredientsImage);
        $("#ingredients_text_es").after(ingredientsImage);
        $("#ingredients_text_es").css({
            "width": "50%",
            "float": "left",
        });
        // //$("#display_ingredients_es img").clone().after("#ingredients_text_es");

    }



    // ***
    // * Saved product page
    // *
    var nbOfSameBrandProducts;
    if(pageType === "saved-product page") {
        $("#main_column").append('<p id="furthermore"><strong>Going further:</strong></p>' +
                                 '<ul id="going-further">' +
                                 '</ul>');
        $("#furthermore").before('<p id="product_issues"><strong>Product issues:</strong></p>' +
                                 '<ul id="issues" style="margin-bottom: 0.2rem">' +
                                 '</ul>');
        $("#issues").after('<p>→ <a href="'+editURL+'">Re-edit current product</a></p>');
        isNbOfSimilarNamedProductsWithoutACategory();
        addQualityTags();
        addStateTags();
    }



    // ***
    // * Recent Changes page
    // *
    if (pageType === "recent changes") {
        $("#main_column h1").after('<input id="filter" type="text" placeholder="Filter...">');
        $("#filter").on("keyup", function() {
            var value = $(this).val().toLowerCase();
            $("#main_column li").filter(function() {
                $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
            });
            value == "" ? $("#main_column details").show() : $("#main_column details").hide();
        });
    }



    // ***
    // * "list" mode (when a page contains a list of products (home page, facets, search results...)
    // *
    if (pageType === "list") {
        var css_4_list =`
/*  */
#main_column              { height:auto !important; } /* Because main_column has an inline style with "height: 1220px" */
.products                 { /*display: table; /**/ border-collapse: collapse; /*float:none;/**/ }
.products li              { display: table-row;  width: auto;    text-align: left; border: 1px solid black; float:none;  }

 .products > li > a,
 .products > li > a > div,
 .products > li > a > span,
 .ingr,
 .p_actions { display: table-cell; }

 .products > li > a { border: 1px solid black; }
 .ingr, .p_actions { border: 0px solid black;/**/ }
 .ingr { border-right: 0px; } .p_actions {border-left: 0px; }

 .products > li > a        { display: table-cell; width:   30%;  vertical-align: middle; height: 6rem !important; }
 .products > li > a > div  { display: table-cell; max-width:   35% !important; } /* */
 .products > li > a > span { display: table-cell; width:   70%;  vertical-align: middle; padding-left: 1rem;} /* */

 .wrap_ingr                { width: 70% !important; position: relative; }
 .ingr                     { display: table-cell; /*width: 800px;/**/ height:8rem; margin: 0; vertical-align: middle; padding: 0 0.6rem 0 0.6rem;}
 .p_actions                 { display: table-cell; width: 100px;  vertical-align: middle; padding: 0.5rem; line-height: 2.6rem !important; width: 4rem !important; }
 .ingr, .p_actions > button { font-size: 0.9rem; vertical-align: middle; }
 .p_actions > button { margin: 0 0 0 0; padding: 0.3rem 0.1rem 0.3rem 0.1rem; width: 6rem; }
 .ingr_del { background-color: #ff2c2c; }
._lang { position: absolute; top:3rem; right:16px; font-size:3rem; opacity:0.4; }

#timed_alert { position:fixed; top:0; right:0; font-size: 8rem }

`;
        // Show an easier to read number of products
        /*
        var xxxProducts = $(".button-group li div").text(); console.log(xxxProducts); // 1009326 products
        var nbOfProducts = parseInt(xxxProducts.match(/(\d+)/g)[0]); //console.log(nbOfProducts); // 1009326
        nbOfProducts = nbOfProducts.toLocaleString(); //console.log(nbOfProducts); // 1 009 326
        $(".button-group li div").text(xxxProducts.replace(/(\d+)(.*)/, nbOfProducts+"$2")); // 1 009 326 products /**/


        var listByRowsMode = false; // We are not yet in "list by rows" mode
        // Keyboard actions
        if (listByRowsOption === true) { listByRows(); }
        $(document).on('keydown', function(event) {
            // If the key is not pressed inside a input field (ex. search product field)
            if (!$(event.target).is(':input')) {
                // (Shift + L)
                if (event.key === 'L' && listByRowsMode === false) {
                    listByRows();

                }
            }

        });

    }

    //Copy data from the list textarea to the ingredients_text in the hidden form so it can be passed to the analyser
    //As the list can contain different languages we take the language from the textarea
	function CopyListData(_code, lang){
		console.log("Lang:" + lang);
		var cd = $("#i" + _code).val()
		console.log("Language Text:"+cd);

        //Here we have to manipulate the language for regional languages
        if(lang === 'ca'){lang = 'es-ca';} //Catalan
        if(lang === 'en'){
            if(pageLanguage === 'en'){
                lang = 'uk';//English
            }
            else
            {
                lang = pageLanguage + '-en'; //English from source language page
            }
        }

		//As target language can be different from the page language we have to create the full URL
		var URL = "//" + lang + ".openfoodfacts.org/cgi/test_ingredients_analysis.pl";
       console.log("analyse url="+URL);
       analyse_form.action = URL;
		//analyse_form.setAttribute("action", URL);
	  $("#ingredients_text").val(cd);
	}

	//Copy data from the language specific ingredients_text to the ingredients_text in the hidden form so it can be passed to the analyser
    //This is for single product page, list is handled differently
	function Copydata(){
		var lang = $('ul#tabs_ingredients_image > li.active').attr("data-language");
        var pageLanguage = $("html").attr('lang');      // Get page language

		//console.log("Lang:" + lang);
		var cd = $("#ingredients_text_"+lang).val();
		//console.log("Language Text:"+cd);

        //Here we have to manipulate the language for regional languages
        if(lang === 'ca'){lang = 'es-ca';} //Catalan
        if(lang === 'en'){
            if(pageLanguage === 'en'){
                lang = 'uk';//English
            }
            else
            {
                lang = pageLanguage + '-en'; //English from source language page
            }
        }

		//As target language can be different from the page language we have to create the full URL
		var URL = "//" + lang + ".openfoodfacts.org/cgi/test_ingredients_analysis.pl";
		//analyse_form.setAttribute("action", "/cgi/test_ingredients_analysis.pl");
        //console.log("analyse url="+URL);
		analyse_form.setAttribute("action", URL);
	  $("#ingredients_text").val(cd);
	}

	function submitToPopup(f) {
		console.log("submitToPopup");
		var w = window.open('', 'form-target', 'width=800','height=800');
		f.target = 'form-target';
		f.submit();
	}

    /***
     * listByRows
     *
     * @param   : none
     * @return  : none
     */
    function listByRows() {
        console.log("listByRows() > List by rows -------------");
        listByRowsMode = true;
        console.log("listByRows() > listByRowsMode: " + listByRowsMode);
        var s = document.createElement('style');
        s.type = 'text/css';
        s.innerHTML = css_4_list;
        document.documentElement.appendChild(s);

        var urlList = document.URL;
        var prods = getJSONList(urlList);
        //console.log(prods);

        $(".pus_edit_link").remove();
        $(".off").hide();
        $(".app").hide();
        $(".project").hide();
        $(".community").hide();
    }



    /***
     *
     * @param   : var, url of the list; example: https://world.openfoodfacts.org/cgi/search.pl?search_terms=banania&search_simple=1
     * @return  : object, JSON list of products
     */
    function getJSONList(urlList) {
        // Test URLs:
        // https://world.dev.openfoodfacts.org/quality/ingredients-100-percent-unknown
        // https://fr.openfoodfacts.org/quality/ingredients-100-percent-unknown/quality/ingredients-ingredient-tag-length-greater-than-50/200 (
        var ingr = "";
        $.getJSON( urlList + "&json=1", function(data) {
            console.log("getJSONList(urlList) > Data from products' page: " + urlList);
            console.log(data);
            var local_code, editIngUrl;
            $( ".products > li" ).each(function( index ) {
                //console.log( index + ": " + $( this ).text() );
                //$( this ).find(">:first-child").append('<span class="ingr">'+data["products"][index]["ingredients_text"]+'</span>');
                local_code = data["products"][index]["code"];
                var _lang = data["products"][index]["lang"];
                editIngUrl = document.location.protocol + "//" + document.location.host +
                             '/cgi/product.pl?type=edit&code=' + local_code + '#tabs_ingredients_image';
                // Add ingredients form
                // Note: we added lang="xx" to let browsers spellcheck contents of each form depending
                //       on the language. But it seems complicated, see:
                //       TODO: https://stackoverflow.com/questions/41252737/over-ride-chrome-browser-spell-check-language-using-jquery-or-javascript
                //       https://bugs.chromium.org/p/chromium/issues/detail?id=389498 (It's a "won't fix" in Chrome)
                //       https://bugzilla.mozilla.org/show_bug.cgi?id=1073827#c33
                //       about:config in Firefox
                $("html").removeAttr("lang");
                $( this ).append('<div class="wrap_ingr">'+
                                 '<textarea class="ingr" id="i'+local_code+'" lang="'+_lang+'">'+
                                 data["products"][index]["ingredients_text"]+
                                 '</textarea>'+
                                 '<span class="_lang">'+ _lang +'</span>'+
                                 '</div>'
                                  );
                $( this ).append('<div  class="p_actions">'+
                                 '<button class="ingr_del" title="Immediate deletion, be careful." '+
                                 ' id="p_actions_del_'+local_code+'" value="'+local_code+'">'+
                                 'Delete'+
                                 '</button>'+
                                 '<button class="ingr_sav" title="Save this field." '+
                                 ' id="p_actions_sav_'+local_code+'" value="'+local_code+'">'+
                                 'Save'+
                                 '</button>'+
                                 "<button title=\"Edit in a new window\" "+
                                 "onclick=\"window.open('"+editIngUrl+"','_blank');\">"+
                                 'Edit [🡕]'+
                                 '</button>'+
                                 
								 "<button title=\"Ingredients analysis\" "+
                                 ' id="p_actions_analysis_'+local_code+'" value="'+local_code+'">'+
                                 'Analysis'+
                                 '</button>'+

                                 "<button title=\"Move to open beauty\" "+
                                 ' id="p_actions_obf_'+local_code+'" value="'+local_code+'">'+
                                 '->OBF'+
                                 '</button>'+
								 '</div>');
								 
                $("#i"+local_code).attr('lang', _lang);
                // Edit ingredient field inline
                //$("#i"+local_code).dblclick(function() {
                //    console.log("dblclick on: "+$(this).attr("id"));
                //});

                //Ingredients analysis check - opens in new window
                $("#p_actions_analysis_"+local_code).click(function(){
                    //console.log("analyse");
                    var _code = $(this).attr("value");

                    CopyListData(_code, _lang);
                    submitToPopup(analyse_form);
                });

                //Move product to OBF
                $("#p_actions_obf_"+local_code).click(function(){
                    var _code = $(this).attr("value");
                    var _url = encodeURI(document.location.protocol + "//" + document.location.host +
                                         "/cgi/product_jqm.pl?type=edit&code=" + _code + "&new_code=obf");
                    console.log("api call-> "+_url);
                    var _d = $.getJSON(_url, function() {
                        console.log("getJSONList(urlList) > Move to OBF");
                    })
                        .done(function(jqm2) {
                            console.log(jqm2["status_verbose"]);
                            console.log(jqm2);
                        })
                        .fail(function() {
                            console.log("getJSONList(urlList) > fail");
                        });
                            $("body").append('<div id="timed_alert">Moved!</div>');
                            $("#timed_alert").fadeOut(3000, function () { $(this).remove(); });
                });

                $("#p_actions_sav_"+local_code).click(function(){
                    //saveProductField(productCode, field);
                    var _code = $(this).attr("value");
                    var _url = encodeURI(document.location.protocol + "//" + document.location.host +
                                         "/cgi/product_jqm2.pl?code=" + _code +
                                         "&ingredients_text_"+_lang+
                                         "=" + $("#i" + _code).val());
                    console.log("getJSONList(urlList) > "+_url);
                    var _d = $.getJSON(_url, function() {
                        console.log("getJSONList(urlList) > Save product ingredients");
                    })
                        .done(function(jqm2) {
                            console.log(jqm2["status_verbose"]);
                            console.log(jqm2);
                        })
                        .fail(function() {
                            console.log("getJSONList(urlList) > fail");
                        });
                            $("body").append('<div id="timed_alert">Saved!</div>');
                            $("#timed_alert").fadeOut(3000, function () { $(this).remove(); });
                });
                // Delete ingredients field: https://world.openfoodfacts.net/cgi/product_jqm2.pl?code=0048151623426&ingredients_text=
                $("#p_actions_del_"+local_code).click(function(){
                    //deleteProductField(productCode, field);
                    var _code = $(this).attr("value");
                    var _url = document.location.protocol + "//" + document.location.host + "/cgi/product_jqm2.pl?code=" + _code + "&ingredients_text=";
                    console.log("getJSONList(urlList) > "+_url);
                    var _d = $.getJSON(_url, function() {
                        console.log("getJSONList(urlList) > Delete product ingredients");
                    })
                        .done(function(jqm2) {
                            console.log(jqm2["status_verbose"]);
                            console.log(jqm2);
                            $("#i"+_code).empty();
                        })
                        .fail(function() {
                            console.log("getJSONList(urlList) > fail");
                        });
                });
            });
            return data;
        });
    }


    // Show pop-up
    function showPowerUserInfo(message) {
        console.log("showPowerUserInfo(message) > "+$("#power-user-help"));
        // Inspiration: http://christianelagace.com
        // If not already exists, create div for popup
        if($("#power-user-help").length === 0) {
            $('body').append('<div id="power-user-help" title="Information"></div>');
            $("#power-user-help").dialog({autoOpen: false});
        }

        $("#power-user-help").html(message);

        // transforme la division en popup
        var popup = $("#power-user-help").dialog({
            autoOpen: true,
            width: 400,
            dialogClass: 'dialogstyleperso',
        });
        // add style if necessarry
        //$("#power-user-help").prev().addClass('ui-state-information');
        return popup;
    }



    function toggleIngredientsMode() {
        //
        console.log("Ingredients mode");
        $('.example, .note').hide();
        //$("div").attr("style", "padding-top: 0.1rem!important; padding-bottom: 0.1rem!important; margin-top: 0.1rem!important; margin-bottom: 0.1rem!important");
        $("#main_column, #main_column label, #main_column input").attr("style", "padding-top: 0.1rem!important; padding-bottom: 0.1rem!important; margin-top: 0.1rem!important; margin-bottom: 0.1rem!important");
        $(".upload_image_div").attr("style", "display:none !important");
        $("#top-bar").hide();
        $(".medium-4").hide();
        $(".sidebar").hide();
        $("#main_column > div > div > div, #donate_banner, h1, #barcode_paragraph").hide();
        $("#label_new_code, #new_code, #obsolete, label[for='obsolete'], #obsolete_since_date, label[for='obsolete_since_date']").hide();
        $("#warning_3rd_party_content, #licence_accept").hide();
        $("#manage_images_accordion").hide();

        $(".img_input, .upload_image_div, #imgupload_front_fr").hide();

        $("#generic_name_fr, label[for='generic_name_fr']").hide();

        // From "Product caracteristics until Ingredient
        $("#quantity, label[for='quantity']").hide();
        $("div.fieldset:nth-child(16) > tags:nth-child(8), #packaging, label[for='packaging']").hide();
        $("div.fieldset:nth-child(16) > tags:nth-child(13), #brands, label[for='brands']").hide();
        $("div.fieldset:nth-child(16) > tags.tagify:nth-child(17), #categories, label[for='categories']").hide();
        $("div.fieldset:nth-child(16) > tags.tagify:nth-child(22), #labels, label[for='labels']").hide();
        $("div.fieldset:nth-child(16) > tags.tagify:nth-child(27), #manufacturing_places, label[for='manufacturing_places']").hide();
        $("div.fieldset:nth-child(16) > tags.tagify:nth-child(31), #emb_codes, label[for='emb_codes']").hide();
        $("#link, label[for='link']").hide();
        $("#expiration_date, label[for='expiration_date']").hide();
        $("div.fieldset:nth-child(16) > tags.tagify:nth-child(41), #purchase_places, label[for='purchase_places']").hide();
        $("div.fieldset:nth-child(16) > tags.tagify:nth-child(45), #stores, label[for='stores']").hide();
        $("div.fieldset:nth-child(16) > tags.tagify:nth-child(49), #countries, label[for='countries']").hide();
        $("div.fieldset:nth-child(16) > tags.tagify:nth-child(53), #environment_impact_level, label[for='environment_impact_level']").hide();

        $("#check").hide();

        // History and footer
        $("#history, #history_list").hide();
        $("footer").hide();

    }



    function toggleHelpers() {
        console.log("toggleHelpers() > Helpers: " + getLocalStorage("pus-helpers"));
        if(getLocalStorage("pus-helpers") === "unchecked") {
            $('#pus-helpers').removeAttr('checked');
            $('.note').hide();
            $('.example').hide();
        }
        // Hide/unhide field helpers
        $('#pus-helpers').change(function() {
            if(this.checked) {
                localStorage.setItem('pus-helpers', "checked");
                console.log("toggleHelpers() > Show helpers");
                $('.note').show();
                $('.example').show();
            }
            else {
                localStorage.setItem('pus-helpers', "unchecked");
                console.log("toggleHelpers() > Hide helpers");
                $('.note').hide();
                $('.example').hide();
            }
            //$('#textbox1').val(this.checked);
        });
    }


    // ***
    // * Flag this version
    // *
    function flagThisRevision() {
        // Extract contributor of the current version from /contributor/jaeulitt => jaeulitt
        $('.rev_contributor').attr('href') != undefined ?
            version_user = $('.rev_contributor').attr('href').match(/contributor\/(.*)/)[1]:
            version_user = "";
        // Extract revision number from URL:
        // https://us.openfoodfacts.org/product/0744473477111/coconut-milk-non-dairy-frozen-dessert-vanilla-bean-so-delicious-dairy-free?rev=8
        var rev = getURLParam("rev");
        if (rev !== null) {
            version_date = $("#rev_summary > p > time > time").attr("datetime");
            console.log("version_date: "); console.log(version_date);
            flagRevision(rev);
        }
        else {
            var _url = "/api/v0/product/" + code + ".json"
            $.getJSON(_url, function(data) {
                rev = data.product.rev;
                console.log("rev: "); console.log(rev);
                version_user = data.product.last_editor;
                console.log("version_user: "); console.log(version_user);
                var last_modified_t = new Date(data.product.last_modified_t*1000);
                version_date = last_modified_t.toISOString();
                console.log("version_date: "); console.log(version_date);
                flagRevision(rev);
            });
        }
    }


    // ***
    // * Flag revision
    // *
    function flagRevision(rev) {
        // Get connected user id
        var user_name = getConnectedUserID();

        // Submit data to a Google Spreadsheet, see:
        //   * https://gist.github.com/mhawksey/1276293
        //   * https://mashe.hawksey.info/2014/07/google-sheets-as-a-database-insert-with-apps-script-using-postget-methods-with-ajax-example/
        //   * https://medium.com/@dmccoy/how-to-submit-an-html-form-to-google-sheets-without-google-forms-b833952cc175
        // https://script.google.com/macros/s/AKfycbwi9tIOPc7zh2NggDuq8geTSZqdZ470unBWUi4KV4AwYzCTNO8/exec?code=123&issue=fhkshf
        // Debug CORS: https://www.test-cors.org/
        // CORS proxies:
        //   * https://crossorigin.me/ => GET only // 2020-04-10: site down?
        //   * https://cors.io? => sometimes down (3 days after first tries); can be installed on Heroku
        //   * https://cors-anywhere.herokuapp.com/ => ok
        var googleScriptURL = "https://cors-anywhere.herokuapp.com/https://script.google.com/macros/s/AKfycbwi9tIOPc7zh2NggDuq8geTSZqdZ470unBWUi4KV4AwYzCTNO8/exec";
        var flagWindow =
            '<div id="flag_dialog" title="Dialog Form">' +
            '<form name="flag_form">' +
            '<label>Issue:</label>' +
            '<select id="flag_issue" name="issue">' +
            '<option value="bug">bug</option>' +
            '<option value="copyright_issue(images...)">copyright_issue(images...)</option>' +
            '<option value="error_to_explain">error_to_explain</option>' +
            '<option value="spam">spam</option>' +
            '<option value="vandalism">vandalism</option>' +
            '<option disabled="disabled">----</option>'+
            '<option value="to_be_completed">to_be_completed</option>' +
            '<option value="to_be_controlled">to_be_controlled</option>' +
            '<option value="to_be_finished">to_be_finished</option>' +
            '<option value="ask_for_help">ask_for_help</option>' +
            '<option disabled="disabled">----</option>'+
            '<option value="emblematic_product">emblematic_product</option>' +
            '<option value="product_improvement">product_improvement</option>' +
            '<option disabled="disabled">----</option>'+
            '<option value="user_to_be_contacted">user_to_be_contacted</option>' +
            '<option value="pro_account">pro_account</option>' +
            '</select>' +
            '<label>Comments (optional):</label>' +
            '<input name="comments" type="text" value="">' +
            //'<label>Description:</label>' +
            //'<input id="flag_desc" name="description" type="text">' +
            '<input type="hidden" name="admin_user" value="'+ user_name + '">' +
            '<input type="hidden" name="code" value="'+ code + '">' +
            '<input type="hidden" name="version_nb" value="'+ rev + '">' +
            '<input type="hidden" name="version_date" value="'+ version_date + '">' +
            '<input type="hidden" name="version_user" value="'+ version_user + '">' +
            '<input type="hidden" name="url" value="'+ document.location + '">' +
            '<input id="transfer_submit" type="submit" value="Flag this version">' +
            '</form>' +
            '<div id="flag_result"></div>' +
            '</div>';
        showPowerUserInfo(flagWindow); // open a new window

        const form = document.forms['flag_form'];
        console.log(form);
        form.addEventListener('submit', e => {
            console.log("Submited rev "+rev);
            e.preventDefault();  // Do not submit the form
            fetch(googleScriptURL, {
                method: 'POST',
                mode: 'cors',
                body: new FormData(form)
            })
            .then(function(response) {
                console.log('Success!', response);
                var spreadsheetURL = 'https://docs.google.com/spreadsheets/d/1DE85Or0QiYwIXcG4vSVZyFSLMKvmJqOXM5ooJzxZr6Y/';
                $("#flag_result").append('<p style="margin-top:1rem;font-weight: bold;">' +
                                         '✅ Version ' +
                                         '<a href="' + spreadsheetURL + '" style="color:blue" target="_blank">' +
                                         'flagged</a>.</p>');
                return;})
            .catch(error => console.error('Error!', error.message));
        })
    }




    // https://fr.openfoodfacts.org/etat/marques-a-completer/code/506036745xxxx&json=1
    function getNumberOfProductsWithSimilardCodeAndWithoutBrand(codeToCheck) {
        //

    }


    /**
     * Display the quality tags in "product issues" section (#issues id)
     * Examples:
     *
     * @returns none
     */
    function addQualityTags() {
        $.getJSON(apiProductURL, function(data) {
            var qualityErrorsTagsArray = data.product.data_quality_errors_tags;
            console.log("addQualityTags() > qualityErrorsTagsArray: ");
            console.log(qualityErrorsTagsArray);
            //var list = '<ul><li>' + arr.join('</li><li>') + '</li></ul>';
            var list = (qualityErrorsTagsArray.length === 0 ?
                        ('<span style="color: green">No quality errors</span>') :
                        ('<span style="color: red">' + qualityErrorsTagsArray.join(' ◼ ') + '</span>'));
            $("#issues").append('<li id="qualityErrorsTags">Quality error tags: ' + list + '</li>');

            var qualityWarningsTagsArray = data.product.data_quality_warnings_tags;
            console.log("addQualityTags() > qualityWarningsTagsArray: ");
            console.log(qualityWarningsTagsArray);
            //var list = '<ul><li>' + arr.join('</li><li>') + '</li></ul>';
            list = (qualityWarningsTagsArray.length === 0 ?
                        ('<span style="color: green">No quality warnings</span>') :
                        ('<span style="color: red">' + qualityWarningsTagsArray.join(' ◼ ') + '</span>'));
            $("#issues").append('<li id="qualityWarningsTags">Quality warnings tags: ' + list + '</li>');
        });
    }


    /**
     * Display the "to be completed" state tags in "product issues" section (#issues id)
     * Examples: "To be completed (from "State tags"): ingredients ◼ characteristics ◼ categories ◼ packaging ◼ quantity ◼ photos to be validated
     *
     * @returns none
     */
    function addStateTags() { // TODO: merge with addQualityTags function?
        $.getJSON(apiProductURL, function(data) {
            var stateTagsArray = data.product.states_tags;
            console.log("addStateTags() > stateTagsArray: ");
            console.log(stateTagsArray);
            //var list = '<ul><li>' + arr.join('</li><li>') + '</li></ul>';
            var filteredStateTagsArray = keepMatching(stateTagsArray, /(.*)to-be(.*)/);
            var finalArray = replaceInsideArray(filteredStateTagsArray, /en\:/, '');
            finalArray = replaceInsideArray(finalArray, /to-be-completed/, '');
            finalArray = replaceInsideArray(finalArray, /\-/g, ' ');
            console.log(finalArray);
            var list = stateTagsArray.join(' ◼ ');
            $("#issues").append('<li><span>To be completed (from "State tags"): ' + list +
                                    ' </span>' +
                                    '</li>');
        });
    }


    /**
     * Display the number and the link to similar named products without a category
     *
     * @returns none
     */
    function isNbOfSimilarNamedProductsWithoutACategory() {
        // Get URL
        var url = getSimilarlyNamedProductsWithoutCategorySearchURL();
        console.log("isNbOfSimilarNamedProductsWithoutACategory() > url: " + url);
        $.getJSON(url + "&json=1", function(data) {
            var nbOfSimilarNamedProductsWithoutACategory = data.count;
            console.log("isNbOfSimilarNamedProductsWithoutACategory() > nbOfSimilarNamedProductsWithoutACategory: " + nbOfSimilarNamedProductsWithoutACategory);
            $("#going-further").append('<li><span id="nbOfSimilarNamedProductsWithoutACategory"><a href="' +
                                       url +
                                       '">' + nbOfSimilarNamedProductsWithoutACategory +
                                       ' products with a similar name but without a category</a></span>' +
                                       '</li>');
        });
    }


    /**
     * Build search URL that finds products with a similar name, without category; example:
     * https://world.openfoodfacts.org/cgi/search.pl?search_terms=beef%20jerky&tagtype_0=states&tag_contains_0=contains&tag_0=categories%20to%20be%20completed&sort_by=unique_scans_n
     *
     * @returns {String} - Returns an URL
     */
    function getSimilarlyNamedProductsWithoutCategorySearchURL() {
        var productName, similarProductsSearchURL;
        if (pageType !== "product view") { // script fail if productName below is undefined
            return;
        }
        // The productName below sometimes is undefined; TODO: get it with API? https://world.openfoodfacts.org/api/v0/product/3222475464430.json&fields=product_name
        productName = $('h1[property="food:name"]').html().match(/(.*?)(( - .*)|$)/)[1];
        similarProductsSearchURL = encodeURI(
            document.location.protocol + "//" + document.location.host +
            "/cgi/search.pl?search_terms=" + productName +
            "&tagtype_0=states&tag_contains_0=contains&tag_0=categories to be completed&sort_by=unique_scans_n");
        console.log("getSimilarlyNamedProductsWithoutCategorySearchURL() > productName: "+productName);
        console.log("getSimilarlyNamedProductsWithoutCategorySearchURL() > similarProductsSearchURL: "+similarProductsSearchURL);
        return similarProductsSearchURL;
    }


    /**
     * Read a given URL parameter
     * https://stackoverflow.com/questions/19491336/get-url-parameter-jquery-or-how-to-get-query-string-values-in-js
     *
     * @param   {String} name - paramater name; ex. "code" in http://example.org/index?code=839370889
     * @returns {String} Return either null if param doesn't exist, either content of the param
     */
    function getURLParam(name) {
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results === null) {
            return null;
        }
        return decodeURI(results[1]) || 0;
    }


    /**
     * isPageType: Detects which kind of page has been loaded
     *
     * @returns  {String} - Type of page: api|saved-product page|edit|list|search form|product view
     */
    function isPageType() {
        // Detect API page. Example: https://world.openfoodfacts.org/api/v0/product/3599741003380.json
        var regex_api = RegExp('api/v0/');
        if(regex_api.test(document.URL) === true) return "api";

        // Detect producers platform
        var regex_pro = RegExp('\.pro\.open');
        if(regex_pro.test(document.URL) === true) proPlatform = true;

        // Detect "edit" mode.
        var regex = RegExp('product.pl');
        if(regex.test(document.URL) === true) {
            if (!$("#sorted_langs").length) return "saved-product page"; // Detect "Changes saved." page
            else return "edit";
        }

        // Detect page containing a list of products (home page, search results...)
        if ($(".products")[0]) return "list";

        // Detect search form
        var regex_search = RegExp('cgi/search.pl$');
        if(regex_search.test(document.URL) === true) return "search form";

        // Detect recentchanges
        regex_search = RegExp('cgi/recent_changes.pl');
        if(regex_search.test(document.URL) === true) return "recent changes";

        //Detect if in the list of ingredients
        regex_search = RegExp('ingredients');
        if(regex_search.test(document.URL) === true) return "ingredients";


        // Finally, it's a product view
        if($("body").attr("typeof") === "food:foodProduct") return "product view";
    };



    /**
     * detectLanguages: detects which kind of page has been loaded
     *
     * @returns  {Array} - array of all languages available for a product; ex. ["de","fr","en"]
     */
    function detectLanguages() {
        console.log("detectLanguages() > detectLanguages: ");
        var array = $("#sorted_langs").val().split(",");
        console.log(array);
        return array;
    }


    /**
     * getIngredientsFromGCV: Get ingredients via Google Cloud Vision
     *
     * @param    {String} code - product code; ex. 7613035748699
     * @param    {String} lc   - language; ex. "fr"
     */
    function getIngredientsFromGCV(code,lc) {
        // https://world.openfoodfacts.org/cgi/ingredients.pl?code=7613035748699&id=ingredients_fr&process_image=1&ocr_engine=google_cloud_vision
        var ingredientsURL = document.location.protocol + "//" + document.location.host +
                "/cgi/ingredients.pl?code=" + code +
                "&id=ingredients_" + lc + "&process_image=1&ocr_engine=google_cloud_vision";
        console.log("getIngredientsFromGCV(code,lc) > ingredientsURL: "+ingredientsURL);
        $.getJSON(ingredientsURL, function(json) {
            $("#ingredientFromGCV").append(json.ingredients_text_from_image);
        });
    };


    /**
     * keepMatching: keep only matching strings of an array
     * @example  finalArray = keepMatching(["tomatoes","eggs"], /eggs/);
     * // => ["eggs"]
     *
     * @param    {Array}  originalArray - array to check
     * @param    {String} regex         - regex pattern
     * @returns  {Array}                - new array
     */
    function keepMatching(originalArray, regex) {
        var j = 0;
        while (j < originalArray.length) {
            if (regex.test(originalArray[j]) === false) {
                originalArray.splice(j, 1); // delete value at position j
            } else {
                j++;
            }
        }
        return originalArray;
    }


    /**
     * replaceInsideArray: replace some content by another in each string of an array
     * @example  finalArray = replaceInsideArray(["en:tomatoes","en:eggs"], /en:/, '');
     * // => ["tomatoes","eggs"]
     *
     * @param    {Array}  originalArray - array to check
     * @param    {String} regex         - regex pattern
     * @param    {string} target        - target content
     * @returns  {Array}                - new array
     */
    function replaceInsideArray(originalArray, regex, target) {
        var j = 0;
        while (j < originalArray.length) {
            originalArray[j] = originalArray[j].replace(regex, target);
            if (originalArray[j] === "") {
                originalArray.splice(j, 1); // delete value at position j
            } else {
                j++;
            }
        }
        return originalArray;
    }


    /**
     * getLocalStorage
     *
     * @param    {String}  key - key to check
     * @returns  {String}
     */
    function getLocalStorage(key) {
        var val = localStorage.getItem(key);
        return val ? val:"";
    }


    /**
     * getConnectedUserID: returns user id of the current connected user
     *
     * @param    none
     * @returns  {String} user id; Example: "charlesnepote"
     */
    function getConnectedUserID() {
        // Extract connected user_id by reading <span id="user_id">charlesnepote</span>
        var user_name = $("#user_id").text();
        console.log("getConnectedUserID() > user_name: "); console.log(user_name);
        return user_name;
    }


    /**
     * normalizeTagName: returns a normalized version of a tag
     *
     * @param    {string} tagName: tag to normalize;  eg. "Cereal bars"
     * @returns  {String} normalized tagName;         eg. "cereal-bars"
     */
    function normalizeTagName(tagName) {
        tagName = tagName.toLowerCase()
        tagName = tagName.replace(/ /mg, "-");
        console.log("normalizeTagName() - tagName: " + tagName);
        return tagName;
    }


    /**
     * productExists: check link status: 200 means the product exists, 404 means it doesn't
     *
     * @param    {string} urlToCheck: url to check; example: "https://world.openbeautyfacts.org/product/8008343200233"
     * @param    {string} id: HTML id where to publish the result; example: "obfLinkStatus"
     * @param    {string} userName: userName if the web server need an authentication
     * @param    {string} passWord: password if the web server need an authentication
     * @returns  none
     */
    function productExists(urlToCheck,id,userName,passWord){
        //console.log("productExists( "+urlToCheck+" )");
        $.ajax({
            url: urlToCheck,
            type: "GET",
            //xhrFields: { withCredentials: true },
            //             username: userName,
            //             password: passWord,
            headers: { // send auth headers, needed for .dev platform
                "Authorization": "Basic " + btoa(userName + ":" + passWord)
            },
            success: function(data, textStatus, xhr) {
                console.log("productExists( "+urlToCheck+" ) > success - xhr.status: " + xhr.status);
                if(xhr.status) $(id).text(xhr.status);
            },
            statusCode: {
                404: function(xhr, textStatus) {
                    console.log( "productExists( "+urlToCheck+" ) > 404 > " + xhr.status);
                    if(xhr.status) $(id).text(xhr.status);
                },
                200: function(xhr, textStatus) {
                    console.log( "productExists( "+urlToCheck+" ) > 200 > " + xhr.status);
                    if(xhr.status) $(id).text(xhr.status);
                }
            }
        })
            .always(function (xhr, textStatus) {
            console.log("productExists( "+urlToCheck+" ) > always - xhr.status: " + xhr.status);
            //console.log("productExists( "+urlToCheck+" ) > always - getAllResponseHeaders(): " + xhr.getAllResponseHeaders());
            if(xhr.status) $(id).text(xhr.status);
        });
    }


})();
