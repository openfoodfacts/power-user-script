// ==UserScript==
// @name        Open Food Facts power user script
// @description Helps power users in their day to day work. Key "?" shows help. This extension is a kind of sandbox to experiment features that could be added to Open Food Facts website.
// @namespace   openfoodfacts.org
// @version     2023-10-11T09:43
// @include     https://*.openfoodfacts.org/*
// @include     https://*.openproductsfacts.org/*
// @include     https://*.openbeautyfacts.org/*
// @include     https://*.openpetfoodfacts.org/*
// @include     https://*.pro.openfoodfacts.org/*
// @include     https://*.openfoodfacts.net/*
// @include     https://*.openfoodfacts.dev/*
// @include     http://*.productopener.localhost/*
// @include     http://*.openfoodfacts.localhost/*
// @include     http://*.openfoodfacts.localhost:8080/*
// @exclude     https://analytics.openfoodfacts.org/*
// @exclude     https://api.folksonomy.openfoodfacts.org/*
// @exclude     https://*.wiki.openfoodfacts.org/*
// @exclude     https://wiki.openfoodfacts.org/*
// @exclude     https://support.openfoodfacts.org/*
// @exclude     https://translate.openfoodfacts.org/*
// @exclude     https://donate.openfoodfacts.org/*
// @exclude     https://hunger.openfoodfacts.org/*
// @exclude     https://monitoring.openfoodfacts.org/*
// @exclude     https://forum.openfoodfacts.org/*
// @exclude     https://*blog.openfoodfacts.org/*
// @exclude     https://*connect.openfoodfacts.org/*
// @exclude     https://*connect-test.openfoodfacts.org/*
// @exclude     https://contents.openfoodfacts.org/*
// @exclude     https://mirabelle.openfoodfacts.org/*
//
// @icon        http://world.openfoodfacts.org/favicon.ico
// @updateURL   https://github.com/openfoodfacts/power-user-script/raw/master/OpenFoodFactsPower.user.js
// @grant       GM_getResourceText
// @require     http://code.jquery.com/jquery-latest.min.js
// @require     http://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @require     https://cdn.jsdelivr.net/npm/jsbarcode@latest/dist/JsBarcode.all.min.js
// @author      charles@openfoodfacts.org
// ==/UserScript==
/* eslint-env jquery */

// Product Opener (Open Food Facts web app) uses:
// * jQuery 2.1.4:                view-source:https://static.openfoodfacts.org/js/dist/jquery.js
//                                http://code.jquery.com/jquery-2.1.4.min.js
// * jQuery-UI 1.12.1:            view-source:https://static.openfoodfacts.org/js/dist/jquery-ui.js
//                                http://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// * Tagify 3.x:                  view-source:https://static.openfoodfacts.org/js/dist/tagify.min.js
//                                https://github.com/yairEO/tagify
// * Foundation 5 CSS Framework:  https://sudheerdev.github.io/Foundation5CheatSheet/
//                                https://get.foundation/sites/docs-v5/
//                                See also: https://github.com/openfoodfacts/openfoodfacts-server/pull/2987

(function() {
    'use strict';

    const log_to_console = true; // true if you want to log activity
    var version_user;
    var version_date;
    var proPlatform = false;     // TODO: to be included in isPageType()
    const pageType = isPageType(); // test page type
    const corsProxyURL = "";
    log("2023-10-11T09:43 - mode: " + pageType);

    // Disable extension if the page is an API result; https://world.openfoodfacts.org/api/v0/product/3222471092705.json
    if (pageType === "api") {
        // TODO: allow keyboard shortcut to get back to product view?
        var _code = window.location.href.match(/\/product\/(.*)\.json$/)[1];
        var viewURL = document.location.protocol + "//" + document.location.host + "/product/" + _code;
        log('press v to get back to product view: ' + viewURL);
        $(document).on('keydown', function(event) {
            if (event.key === 'v') {
                window.open(viewURL, "_blank"); // open a new window
                return;
            }
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

    // Firefox: add it via Greasemonkey or Tampermonkey extension: https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/
    // Chrome (not tested): add it with Tampermonkey: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo

    // Main features
    // * DESIGN (custom CSS with small improvements)
    //   * barcode highlighted with a sweet color
    //   * better distinguished sections
    //   * fields highlighted, current field highlighted
    //   * less margins for some elements
    //   * Smaller fixed validation bar
    // * UI
    //   * help screen called with button [?] or keyboard shortcut (?) or (h)
    //   * zoom every images with mouse wheel; see http://www.jacklmoore.com/zoom/
    //   * show/hide barcode; keyboard shortcut (shift+B)
    //     * see https://github.com/openfoodfacts/openfoodfacts-server/issues/1728
    //   * Edit mode:
    //     * show hide help comments for each field (see help screen)
    //     * Firefox: Nutrition facts picture takes all the place available
    //     * Add "History" anchor in the nav bar
    //   * Ingredient lists: external link for each ingredient (appear when hovering rows)
    //   * keyboard shortcut to API product page (a)
    //   * keyboard shortcut to get back to view mode (v)
    //   * keyboard shortcut to enter edit mode: (e) in the current window, (E) in a new window
    //     * see Add "Edit" keyboard shortcut for logged users: https://github.com/openfoodfacts/openfoodfacts-server/issues/1852
    //   * keyboard shortcuts to help modify data without a mouse: P(roduct), Q(uality), B(rands), C(ategories), L(abels), I(ngredients), (e)N(ergy), F(ibers)
    //   * Quick links in the sidebar: page translation, category translation, Recent Changes, Hunger Game, categorization opportunities...
    //   * dedicated to list screens (facets, search results...):
    //     * "n" keyboard shortcut to reload the list without cache (&nocache=1 parameter), if it's not already the case
    //     * [alpha] keyboard shortcut to list products as a table containing ingredients and options to edit or delete ingredients
    //               (shift+L) ["L" for "list"]
    //               The LanguageTool Firefox extension is recommanded because it detects automatically the language of each field.
    //               https://addons.mozilla.org/en-US/firefox/addon/languagetool/
    //     * Inline edit of ingredients in list mode
    //   * Option to set ingredient textareas to fixed width font, to make it easier to see bad OCR,
    //     such as when it confuses "m" and "rn" (e.g. corn), lowercase l/L and uppercase i/I, etc.
    //
    // * FEATURES
    //   * [beta] transfer data from a language to another (use *very* carefully); keyboard shortcut (shift+T)
    //   * [beta] easily delete ingredients, by entering the list by rows mode (shift+L)
    //   * [alpha] allow flagging products for later review (shift+S)
    //     * https://github.com/openfoodfacts/openfoodfacts-server/issues/1408
    //     * Ask charles@openfoodfacts.org
    //   * launch Google OCR if "Edit ingredients" is clicked in view mode
    //   * "[Products without brand that might be from this brand]" link, following product code
    //   * Links beside barcode number: Google and DuckDuckGo link for product barcode + Open Beauty Facts + Open Pet Food Facts + pro.openfoodfacts.dev
    //   * Product view: button to open an ingredient analysis popup
    //   * help screen: add "Similarly named products without a category" link
    //   * help screen: add "Product code search on Google" link
    //   * help screen: add links to Google/Yandex Reverse Image search (thanks Tacite for suggestion)
    //   * Edit mode:
    //     * Check serving size field
    //     * Add the ⇅ icon allowing to reverse kJ and kcals
    //     * Colorize icon ⇅ when kJ/kcal values are not coherent (ratio is displayed inside ⇅ tooltip)
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
    //   * identify problematic fields based on quality feedbacks; https://world.openfoodfacts.org/api/v0/product/7502271153193.json
    //     * see "data_quality_errors_tags" array
    //   * On the fly quality checks in the product edit form (javascript): https://github.com/openfoodfacts/openfoodfacts-server/issues/1905
    //   * Add automatic detection of nutriments, see: https://robotoff.openfoodfacts.org/api/v1/predict/nutrient?ocr_url=https://static.openfoodfacts.org/images/products/841/037/511/0228/nutrition_pt.12.json
    //   * Easily delete ingredients when too buggy
    //   * Add few informations on the confirmation page:
    //     * Nutri-Score and NOVA if just calculated?
    //     * unknown ingredients
    //   * Product of a brand from a particular country, that are not present in this country (see @teolemon)
    //   * Keyboard shortcut to get back to view mode (v) => target=_self + prevent leaving page if changes are not saved
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
textarea, .tagify, input[type=text] { background-color: LightYellow !important; }
input.nutriment_value { background-color: LightYellow; }
textarea:focus, .tagify__input:focus, .tagify:focus, input[type=text]:focus, input.nutriment_value:focus { background-color: lightblue !important; }

/* Small enhancements */
p { margin-bottom: 0.6rem; }
input[type=text] { margin: 1px 0; } /* reduce vertical space between fields and notes */
.note, .example { margin: 1px 0; }
label { margin-top: 10px; }
.data_table { margin-top: 7px; }
td { line-height: 1rem; }
input[type="checkbox"], input[type="radio"] { margin: 0; }
.data_table td, .data_table th { padding: .1rem .1rem .1rem .4rem; }
/*.data_table label { display: table-cell; }*/

#image_box_front { margin-bottom: 1rem !important; }

.unselectbuttondiv_front_fr {
    text-align: center !important;
}

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


/* --------------- Let panels use less space ----------------------- */
/* On the legacy website, in the "changes saved" page, the second panel is not seen without scrolling. */
.card-section { padding-top: 12px; padding-bottom: 10px; }
.panel_card { margin-bottom: 0.5rem !important }
.panel_title_card { margin-top: 0px; }
.panel_content_card { margin-top: 0px; }
.panel_title, .panel_content { padding-top: 0px !important; padding-bottom: 0.2rem !important; }


/* ---------------- Power User Script UI --------------------------- */
/* ------------------ Help box ------------------------------------- */
.pus_menu {
    font-size: 0.9rem;
}

/* checkboxes in popup */
.pus_menu label {
    margin-top: 0;
}
.pus_menu input[type=checkbox] {
    margin-bottom: 0;
}

.ui-widget-content a {
    color: #00f;
}

/* ------------------ Fixed menu buttons --------------------------- */
#pwe_help {
    position:fixed;
    left:0%;
    top:3rem;
    padding:0 0.7rem 0 0.7rem;
    font-size:1.5rem;
    background-color:red;
    border-radius: 0 10px 10px 0;
    z-index: 200;
}

#ing_analysis {
    position:fixed;
    left:0%;
    top:5rem;
    padding:0 0.7rem 0 0.7rem;
    font-size:1.1rem;
    width: 7rem;
    background-color:red;
    border-radius: 0 10px 10px 0;
    z-index: 200;
}
/* ---------------- /Power User Script UI -------------------------- */


/* ---------------- Height of input fields ------------------------- */
.tagify__input { margin: 4 px; } /* instead of 5px */


/* ---------------- Nutrition facts ------------------------- */

label[for="serving_size"] {
    float: left;
    margin-right: 10px;
}

#serving_size {
    width: 30%;
}

input.nutriment_value { height: 1.9rem !important; }
select.nutriment_unit {
    height: 1.9rem !important;
    padding: .1rem .3rem !important;
}

#nutriment_fruits-vegetables-nuts-estimate_tr :first-child { max-inline-size: 25em; }


/* ---- Edit mode: Nutrition image as tall as Nutrition facts table ---- */
/*      Works with Firefox, Chrome at least */
#nutrition_image_copy {
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
/* ---- /Edit mode: Nutrition image as tall as Nutrition facts table ---- */


/* ------------------- Smaller fixed validation bar ---------------------- */
.bottom-validation { padding-top: .3rem; }
.bottom-validation > div > div { height: 2rem; }


/* ----------------- Varia ------------------------- */
.productLink::before {
    content: " — ";
}

.hidden {
    display: none;
}

.ingredient_td:hover .hidden {
    display: inline;
}

/* ingredients box alternative font */
textarea.monospace {
    font-family: Consolas, Lucida Console, monospace;
}

.ul[id^='products_'].search_results a.with_barcode { margin-top: 0; padding-top: 0; }

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
        log("This is not a list.");
        var code;
        code = getURLParam("code")||$('span[property="food:code"]').html();

        if (code === undefined) {
            // product view needs more effort to get the product code.
            // Using e.g. <link rel="canonical" href="https://uk.openfoodfacts.org/product/00994835/black-forest-christmas-pudding-marks-spencer">
            // as it doesn't contain the code if the given code is not a valid entry.
            var code2 = $('link[rel="canonical"]').attr("href").match('product/\([0-9]+\)');
            if (code2 && code2[1]) {
                code = code2[1];
                //log("code2: "+ code2);
            }
        }

        // Horrible hack to prevent issue introduced by https://github.com/openfoodfacts/openfoodfacts-server/pull/8223
        if (pageType === "saved-product page") {
            //log(document.getElementById('changes_saved').getElementsByClassName("warning")[0].href.match(/code=(.*)/)[1]);
            code = document.getElementById('changes_saved').getElementsByClassName("warning")[0].href.match(/code=(.*)/)[1];
        }

        log("code: "+ code);
        // build API product link; example: https://world.openfoodfacts.org/api/v0/product/737628064502.json
        var apiProductURL = "/api/v0/product/" + code + ".json";
        log("API: " + apiProductURL);
        // build edit url
        var editURL = document.location.protocol + "//" + document.location.host + "/cgi/product.pl?type=edit&code=" + code;
    }



    // ***
    // * Every mode, except "api"
    // *
    // Add quick links in the sidebar: page translation, category translation, Recent Changes...
    if (pageType !== "api") {
        var pageLanguage = $("html").attr('lang');      // Get page language
        log("Page language: " + pageLanguage);
        if(pageLanguage === "en") {                     // Delete page language if "en" because we can't make the difference bewteen "en-GB" and "en-US"
            pageLanguage = "";
        }

        // Non contextual links
        // TODO: no more displayed since OFF redesign in 2022-10; put it elsewhere
        $("#match").before(
            `
            <section class="row" id="match"><div class="large-12 column"><div class="card"><div class="card-section">
            <p><a class="button tiny round secondary label" href="https://crowdin.com/project/openfoodfacts/${pageLanguage}">
            Help page translation
            </a>
					  &nbsp;
            <a class="button tiny round secondary label" href="/categories?translate=1">
                Help category translations</a>
            &nbsp;
            <a class="button tiny round secondary label" href="/cgi/recent_changes.pl?&page=1&page_size=100">
              Recent Changes
            </a>
            &nbsp;
            <p id="hungerGameLink"><a class="button tiny round secondary label" href="https://hunger.openfoodfacts.org">
              Hunger Game
            </a></p>
            </p>
            </div></div></div></section>`
        );

        // Hunger Game contextual link
        // TODO: display a number of opportunities.
        /*var hungerGameDeepLink =
            ($("div[itemtype='https://schema.org/Brand']").length) ? "questions?type=brand&value_tag=" + normalizeTagName($("h1[itemprop='name']").text())
            : (/label\/(.*)$/.test(document.URL) === true) ? "questions?type=label&value_tag=en:" +  normalizeTagName(RegExp.$1)
            : (($("div[itemtype='https://schema.org/Thing']").length) ? "questions?type=category&value_tag=en:" +  normalizeTagName($("h1[itemprop='name']").text())
            : "");
        $("h1[itemprop='name']").append(
            (hungerGameDeepLink ?
                ' <sup><a class="button tiny round secondary label" href="https://hunger.openfoodfacts.org/' + hungerGameDeepLink + '">' +
                'Hunger Game</a></sup>' : "")
        );*/
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


    // ***
    // * Every mode, except "api", "list", "search-form"
    // *
    if (pageType === "edit" ||
        pageType === "product view"||
        pageType === "saved-product page") {

        // Add product public link if we are on the pro platform
        if(proPlatform) {
            var publicURL = document.URL.replace(/\.pro\./gi, ".");
            log("publicURL: "+publicURL);
            $(".sidebar p:first").after('<p>> <a href="'+publicURL+'">Product public URL</a></p>');
        }

        // Add informations right after the barcode
        if ($("#barcode_paragraph") && code !== undefined) {

            // Icon for toggling graphical barcode
            $("#barcode_paragraph").append(' <span id="toggleBarcodeLink" class="productLink" title="Show/hide graphical barcode">📲</span>');
            $("#toggleBarcodeLink").on("click", function(){
                toggleSingleBarcode(code);
            });

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
            productExists(corsProxyURL+obfLink,"#obfLinkStatus","","");
            $("#barcode_paragraph")
                .append(' <span id="obfLink" class="productLink">[<a href="' + obfLink +
                        '">obf.org</a>] (<span id="obfLinkStatus"></span>)');
            // Link to Open Pet Food Facts
            var opffLink = 'https://world.openpetfoodfacts.org/product/' + code;
            productExists(corsProxyURL+opffLink,"#opffLinkStatus","","");
            $("#barcode_paragraph")
                .append(' <span id="opffLink" class="productLink">[<a href="' + opffLink +
                        '">opff.org</a>] (<span id="opffLinkStatus"></span>)');
            // Link to .pro.openfoodfacts.dev
            //var proDevLink = 'https://off:off@world.pro.openfoodfacts.dev/product/' + code;
            var proDevLink = 'https://world.pro.openfoodfacts.dev/product/' + code;
            productExists(corsProxyURL+proDevLink,"#proDevLinkStatus","off","off");
            $("#barcode_paragraph")
                .append(' <span id="devProPlatform" class="productLink">[<a href="' + proDevLink +
                        '">.pro.off.dev</a>] (<span id="proDevLinkStatus"></span>)');

            // https://fr.openfoodfacts.org/etat/marques-a-completer/code/506036745xxxx&json=1
            var sameBrandProductsJSON = sameBrandProductsURL + "&json=1";
            $.getJSON(sameBrandProductsJSON, function(data) {
                var nbOfSameBrandProducts = data.count;
                log("nbOfSameBrandProducts: " + nbOfSameBrandProducts);
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
               '<li><input class="pus-checkbox" type="checkbox" id="pus-helpers" checked><label for="pus-helpers">Field helpers</label></li>' +
               '<li><input class="pus-checkbox" type="checkbox" id="pus-dist-free"><label for="pus-dist-free">Distraction free mode</label></li>':
               "") +
            ((pageType === "edit" || pageType === "list") ?
               '<li><input class="pus-checkbox" type="checkbox" id="pus-ingredients-font"><label for="pus-ingredients-font">Ingredients fixed-width font</label></li>':
               "") +
            ((pageType === "product view" || pageType === "edit") ?
               "<li>(Shift+b): show/hide <strong>barcode</strong></li>" +
               "<li>(Alt+shift+key): direct access to (P)roduct name, (Q)uality, (B)rands, (C)ategories, (L)abels, (I)ngredients, e(N)ergy, (F)ibers</li>" +
               "<hr>":
               "") +
            ((pageType === "product view" || pageType === "api") ?
              "<li>(e): edit current product in current window</li>" +
              "<li>(E): edit product in a new window</li>":
              "") +
            ((pageType === "product view" || pageType === "edit") ?
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
            togglePowerUserInfo(help);
            toggleHelpers();
            toggleIngredientsMonospace();
            toggleDFMode();
        });

        if (pageType === "edit"){

            //Ingredients analysis check - opens in new window
            $('body').append('<button id="ing_analysis">Ingredients analysis</button>');
            $("#ing_analysis").click(function(){
                //log("analyse");
                Copydata();
                submitToPopup(analyse_form);
            });
        }



        // Keyboard actions
        $(document).on('keydown', function(event) {
            log(event);
            // If the key is not pressed inside a input field (ex. search product field)
            if (
                !$(event.target).is(':input')
                && !$(event.target).is('span.tagify__input')
                && !$(event.target).is('span.tagify__tag-text')
            ) {
                // (Shift + B): toggle show/hide barcode
                if (event.key === 'B') {
                    toggleSingleBarcode(code);
                    return;
                }
                // (a): api page in a new window
                if ((pageType === "product view" || pageType == "edit") && event.key === 'a') {
                    window.open(apiProductURL, "_blank"); // open in an other window
                    return;
                }
                // (e): edit current product in current window
                if ((pageType === "product view" || pageType === "saved-product page") && event.key === 'e') {
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
                }
                // (?): open help box
                if (event.key === '?' || event.key === 'h') {
                    togglePowerUserInfo(help);
                    toggleHelpers();
                    toggleIngredientsMonospace();
                    toggleDFMode();
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
                    log("options_langs: "+options_langs);
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
                        log("transfert url: "+url);
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

        // Showing it directly on the product page, for emerging categories.
        // https://world.openfoodfacts.org/cgi/search.pl?action=process&sort_by=unique_scans_n&page_size=20&action=display&tagtype_0=states&tag_contains_0=contains&tag_0=categories%20to%20be%20completed&search_terms=lasagne
        var productName = $('h1[property="food:name"]').html().match(/(.*?)(( - .*)|$)/)[1]; // h1[property="food:name"] => Cerneaux noix de pécan - Vahiné - 50 g ℮
        log("productName: " + productName);
        var SearchUncategorizedProductsOpportunitiesDeepLink = encodeURI(productName);
        $("#hungerGameLink").after(
            ((SearchUncategorizedProductsOpportunitiesDeepLink) ? '<p>'+
            '> <a title="Categorization opportunities using Mass Edit"'+
            'href="/cgi/search.pl?action=process&sort_by=unique_scans_n&page_size=20&action=display&tagtype_0=states&tag_contains_0=contains&tag_0=categories%20to%20be%20completed&search_terms=' +
             SearchUncategorizedProductsOpportunitiesDeepLink + '">' +
            'Categorization opportunities</a>' +
            '</p>' : ""));


        // For each different brand, if any, add a deep link to Hunger Game
        // TODO: make this a parameter which can be saved from a session to another; something like:
        //       readParameter(isLinkToHungerGameForEachBrand)
        let isLinkToHungerGameForEachBrand = true;
        if(isLinkToHungerGameForEachBrand) {
            $('[itemprop="brand"]').each(function() {
                const brand = normalizeTagName($(this).text());
                $(this).after(' <sup>[<a href="https://hunger.openfoodfacts.org/questions?value_tag=' + brand + '&type=brand" title="Hunger Game">Hunger Game</a>]</sup>');
            });
        }


        // If ingredients are already entered, show results of the OCR
        if($("#editingredients")[0]) {
            // Looking for ingredients language
            var regex1 = new RegExp(/\((..)\)/);
            var ingredientsButton = $("#editingredients").html();
            //log($("#editingredients").html());
            var lc = regex1.exec(ingredientsButton)[1];
            log("Ingredients language: "+lc);

            // Show results of the OCR
            $('body').on('DOMNodeInserted', '#ingredients_list', function(e) {
                $(e.target).before( "<p>OCR results (not saved):</p>" );
                $(e.target).before( "<textarea id=\"ingredientFromGCV\" lang=\"" + lc + "\"></textarea>" );
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
        toggleIngredientsMonospace();
        toggleDFMode();

        // Add "History" anchor in the nav bar
        let newElement = document.createElement("li");
        newElement.innerHTML += `<a class="nav-link scrollto button small round white-button" href="#history"><span>History</span></a>`;
        newElement.className = "item-list";
        document.querySelector('#navbar ul').append(newElement);

        // TODO: add ingredients picture aside ingredients text area
        var ingredientsImage = $("#display_ingredients_es img");
        log("ingredientsImage: "+ ingredientsImage);
        $("#ingredients_text_es").after(ingredientsImage);
        $("#ingredients_text_es").css({
            "width": "50%",
            "float": "left",
        });
        // //$("#display_ingredients_es img").clone().after("#ingredients_text_es");


        // Check serving size field
        checkServingSize(document.getElementById("serving_size").value);
        document.getElementById("serving_size").addEventListener("input", function() {
            checkServingSize(this.value);
        });

        // Check fibers' field
        checkFiber($("#nutriment_fiber").attr("value"));
        $("#nutriment_fiber").on("input", function() {
            checkFiber($(this).val());
        });

        // Check energy (kJ and kcal) now and for any change
        checkKJ();
        $("#nutriment_energy-kj").on("input", function() {
            $("#nutriment_energy-kj").attr("value", $(this).val());
            checkKJ();
        });
        $("#nutriment_energy-kcal").on("input", function() {
            $("#nutriment_energy-kcal").attr("value", $(this).val());
            checkKJ();
        });

        // Compute and display energy in realtime, based on fat, carbs, fibers, proteins, polyols and alcohol
        const energySpan = '<span id="computed_kj" title="Energy computed from fat, carbs, fibers, proteins, polyols and alcohol" style="padding-left: 2em; color: #665;"></span>';
        document.querySelector('[for="nutriment_energy-kj"]').insertAdjacentHTML('afterend', energySpan);
        computeEnergy();
        const ids = ["nutriment_fat", "nutriment_carbohydrates", "nutriment_proteins", "nutriment_polyols", "nutriment_fiber", "nutriment_alcohol"];
        for (const id of ids) {
            const element = document.getElementById(id);
            element && element.addEventListener("input", computeEnergy);
        }
    }



    // ***
    // * Saved product page
    // *
    var nbOfSameBrandProducts;

    if(pageType === "saved-product page") {
        $("#main_column").append(
            '<section id="power_user_script" class="row">' +
            '<div class="card-section">' +
            '<div id="product_issues" class="panel_card radius">' +
            '<h2 class="panel_title_card text-medium">Power User Script</h2>' +
            '<p><strong>Product issues:</strong></p>' +
            '<ul id="issues" class="row" style="margin-bottom: 0.2rem; padding-left: 1rem;">' +
            '</ul>' +
            '<div class="row">→ <a href="'+editURL+'">Re-edit current product</a></div>' +
            '<div id="furthermore" class="row" style="margin-top: 10px;"><strong>Going further:</strong></div>' +
            '<ul id="going-further" class="row" style="padding-left: 1rem;">' +
            '</ul>' +
            '</div>' +
            '</div>' +
            '</section>'
        );
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
                $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
            });
            value == "" ? $("#main_column details").show() : $("#main_column details").hide();
        });
    }



    // ***
    // * "list" mode (when a page contains a list of products (home page, facets, search results...)
    // *
    if (pageType === "list") {
        // CSS injected by listByRows() when switching to list edit mode.
        var css_4_list =`
/*  */
#main_column              { height:auto !important; } /* Because main_column has an inline style with "height: 1220px" */
ul#products_match_all                 { /*display: table; /**/ border-collapse: collapse; /*float:none;/**/ }
ul.search_results                     { display: block; }
ul#products_match_all li              { position: static; display: table-row;  width: auto;    text-align: left; border: 1px solid black; float:none;  }

ul#products_match_all > li > a,
ul#products_match_all > li > a > div,
ul#products_match_all > li > a > span,
.ingr,
.p_actions { display: table-cell; }

ul#products_match_all > li > a { border: 1px solid black; }
.ingr, .p_actions { border: 0px solid black;/**/ }
.ingr { border-right: 0px; } .p_actions {border-left: 0px; }

ul#products_match_all > li > a        { display: table-cell; width:   30%;  vertical-align: middle; height: 6rem !important; }
ul#products_match_all > li > a > div  { display: table-cell; max-width:   35% !important; } /* */
.list_product_name                    { height: auto; }
ul#products_match_all > li > a > span { display: table-cell; width:   70%;  vertical-align: middle; padding-left: 1rem;} /* */

.wrap_ingr                { position: relative; line-height: 1rem !important; }
.ingr                     { display: table-cell; /*width: 800px;/**/ height:8rem; margin: 0; vertical-align: middle; padding: 0 0.6rem 0 0.6rem;}
.p_actions                 { display: table-cell; vertical-align: middle; padding: 0.5rem; line-height: 2rem !important; width: 4rem !important; }
.ingr, .p_actions > button { font-size: 0.9rem; vertical-align: middle; }
.save_needs_clicking { background-color: #ff952b; }
.p_actions > button { margin: 0 0 0 0; padding: 0.3rem 0.1rem 0.3rem 0.1rem; width: 6rem; }
.ingr_del { background-color: #ff2c2c; }
._lang { position: absolute; top:3rem; right:16px; font-size:3rem; opacity:0.4; }

#timed_alert, div.timed_alert { position:fixed; top:0; right:0; font-size: 8rem }
#timed_alert.failed, div.timed_alert.failed { color: red; }

`;

        // Help box based on page type: list
        var listhelp = `<ul class="pus_menu">
            <li>(?) or (h): this present help</li>
            <hr>
            <li><input class="pus-checkbox" type="checkbox" id="pus-ingredients-font"><label for="pus-ingredients-font">Ingredients fixed-width font</label></li>
            <hr>
            <li>(Shift+L): List edit mode</li>
            <li>(Shift+b): Show/hide barcodes</li>
            <li>(n): reload the page without cache (add &nocache=1)</li>
            </ul>`;

        // Help icon fixed
        $('body').append('<button id="pwe_help">?</button>');

        // User help dialog
        $("#pwe_help").click(function(){
            togglePowerUserInfo(listhelp);
            toggleIngredientsMonospace();
        });

        // detect product codes and add them as attributes
        addCodesToProductList();


        // Show an easier to read number of products
        /*
        var xxxProducts = $(".button-group li div").text(); log(xxxProducts); // 1009326 products
        var nbOfProducts = parseInt(xxxProducts.match(/(\d+)/g)[0]); //log(nbOfProducts); // 1009326
        nbOfProducts = nbOfProducts.toLocaleString(); //log(nbOfProducts); // 1 009 326
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
                    return;
                }

                // (n): reload and add &nocache=1 if not already the case
                if (event.key === 'n') {
                    let nocache = ((/\&nocache=1/.test(window.location)) ? "" : "&nocache=1");
                    window.open(window.location + nocache, "_self"); // reload in current window
                    return;
                }

                // (?): open help box
                if (event.key === '?' || event.key === 'h') {
                    togglePowerUserInfo(listhelp);
                    toggleIngredientsMonospace();
                    return;
                }

                // (Shift + B) - show/hide barcodes
                if (event.key === 'B') {
                    toggleListBarcodes();
                    return;
                }
            }

        });

    } // if list mode

    var langcodes_with_different_countrycodes = [ "af", "am", "ar", "bn", "cs", "da", "dv", "dz", "el", "et", "fa", "hy", "ja", "ka", "kl", "km", "ko", "lo", "ms", "my", "na", "nb", "ne", "ps", "si", "sl", "sq", "sr", "sv", "ta", "tk", "uk", "ur", "vi", "zh" ];

    //Copy data from the list textarea to the ingredients_text in the hidden form so it can be passed to the analyser
    //As the list can contain different languages we take the language from the textarea
    function CopyListData(_code, lang){
        log("Lang:" + lang);
        var cd = $("#i" + _code).val();
        log("Language Text:"+cd);
        var country = lang;

        // handle languages where the language code and country code differ.
        if (langcodes_with_different_countrycodes.includes(lang)) {
            country = "world-" + lang;
        }

        //Here we have to manipulate the language for regional languages
        if(lang === 'ca'){ country = 'es-ca'; } //Catalan
        if(lang === 'en'){
            country = 'world'; //English
        }

        //As target language can be different from the page language we have to create the full URL
        var URL = "//" + country + ".openfoodfacts.org/cgi/test_ingredients_analysis.pl";
        log("CopyListData() analyse url="+URL);
        analyse_form.action = URL;
        //analyse_form.setAttribute("action", URL);
        $("#ingredients_text").val(cd);
    }

    //Copy data from the language specific ingredients_text to the ingredients_text in the hidden form so it can be passed to the analyser
    //This is for single product page, list is handled differently
    function Copydata(){
        var lang = $('ul#tabs_ingredients_image > li.active').attr("data-language");
        var pageLanguage = $("html").attr('lang');      // Get page language
        var country = lang;

        //log("Lang:" + lang);
        var cd = $("#ingredients_text_"+lang).val();
        //log("Language Text:"+cd);

        // handle languages where the language code and country code differ.
        if (langcodes_with_different_countrycodes.includes(lang)) {
            country = "world-" + lang;
        }

        //Here we have to manipulate the language for regional languages
        if(lang === 'ca'){ country = 'es-ca'; } //Catalan
        if(lang === 'en'){
            if(pageLanguage === 'en'){
                country = 'uk';//English
            }
            else
            {
                country = pageLanguage + '-en'; //English from source language page
            }
        }

        //As target language can be different from the page language we have to create the full URL
        var URL = "//" + country + ".openfoodfacts.org/cgi/test_ingredients_analysis.pl";
        //analyse_form.setAttribute("action", "/cgi/test_ingredients_analysis.pl");
        log("Copydata() analyse url="+URL);
        analyse_form.setAttribute("action", URL);
        $("#ingredients_text").val(cd);
    }



    function submitToPopup(f) {
        log("submitToPopup");
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
        log("listByRows() > List by rows -------------");
        listByRowsMode = true;
        log("listByRows() > listByRowsMode: " + listByRowsMode);
        var s = document.createElement('style');
        s.type = 'text/css';
        s.innerHTML = css_4_list;
        document.documentElement.appendChild(s);

        var urlList = document.URL;
        var prods = getJSONList(urlList);
        //log(prods);

        $(".off").hide();
        $(".app").hide();
        $(".project").hide();
        $(".community").hide();
    }



    /***
     * getJSONList
     *
     * @param   : var, url of the list; example: https://world.openfoodfacts.org/cgi/search.pl?search_terms=banania&search_simple=1
     * @return  : object, JSON list of products
     */
    function getJSONList(urlList) {
        // Test URLs:
        // https://world.dev.openfoodfacts.org/quality/ingredients-100-percent-unknown
        // https://fr.openfoodfacts.org/quality/ingredients-100-percent-unknown/quality/ingredients-ingredient-tag-length-greater-than-50/200 (
        var ingr = "";
        $.getJSON( urlList + "&json=1&page_size=100", function(data) {
            log("getJSONList(urlList) > Data from products' page: " + urlList);
            log(data);

            var data_by_code = {};
            for (let aproduct of data.products) {
                //log(aproduct);
                data_by_code[aproduct.code] = aproduct;
            }
            //log(data_by_code);

            var local_code, editIngUrl;
            $( "ul#products_match_all > li" ).each(function( index ) {
                //log( index + ": " + $( this ).text() );
                //$( this ).find(">:first-child").append('<span class="ingr">'+data["products"][index]["ingredients_text"]+'</span>');
                //local_code = data.products[index].code;
                local_code = $(this).attr('data-code');
                if (data_by_code[local_code] === undefined) {
                    return;
                }

                //log("local_code: " + local_code );
                var _lang = data_by_code[local_code].lang;
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
                if (data_by_code[local_code].ingredients_text == null) {
                    data_by_code[local_code].ingredients_text = '';
                }
                $( this ).append('<div class="wrap_ingr">'+
                                 '<textarea class="ingr" id="i'+local_code+'" lang="'+_lang+'">'+
                                 data_by_code[local_code].ingredients_text+
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
                                 'Edit [↗]'+
                                 '</button>'+

                                 "<button title=\"Ingredients analysis\" "+
                                 ' id="p_actions_analysis_'+local_code+'" value="'+local_code+'">'+
                                 'Analysis'+
                                 '</button>'+

                                 "<button title=\"Move to open beauty\" "+
                                 ' id="p_actions_obf_'+local_code+'" value="'+local_code+'">'+
                                 '->OBF'+
                                 '</button>'+

                                 "<button title=\"Move to open products\" "+
                                 ' id="p_actions_opf_'+local_code+'" value="'+local_code+'">'+
                                 '->OPF'+
                                 '</button>'+

                                 "<button title=\"Move to open pet food\" "+
                                 ' id="p_actions_opff_'+local_code+'" value="'+local_code+'">'+
                                 '->OPetFF'+
                                 '</button>'+

                                 '</div>');

                $("#i"+local_code).attr('lang', _lang);
                // Edit ingredient field inline
                //$("#i"+local_code).dblclick(function() {
                //    log("dblclick on: "+$(this).attr("id"));
                //});

                $("#i"+local_code).on("change", function() {
                    var _code = $(this).attr("id").replace('i','p_actions_sav_');
                    $("#"+_code).addClass("save_needs_clicking");
                });

                //Ingredients analysis check - opens in new window
                $("#p_actions_analysis_"+local_code).click(function(){
                    //log("analyse");
                    var _code = $(this).attr("value");

                    CopyListData(_code, _lang);
                    submitToPopup(analyse_form);
                });

                //Move product to OBF
                $("#p_actions_obf_"+local_code).click(function(){
                    moveProductToSite( $(this).attr("value"), 'obf' );
                });

                //Move product to OPF
                $("#p_actions_opf_"+local_code).click(function(){
                    moveProductToSite( $(this).attr("value"), 'opf' );
                });

                //Move product to OPFF
                $("#p_actions_opff_"+local_code).click(function(){
                    moveProductToSite( $(this).attr("value"), 'opff' );
                });

                // Save ingredients
                $("#p_actions_sav_"+local_code).click(function(){
                    //saveProductField(productCode, field);
                    var _code = $(this).attr("value");
                    var _url = document.location.protocol + "//" + encodeURIComponent(document.location.host) +
                                         "/cgi/product_jqm2.pl?code=" + encodeURIComponent(_code) +
                                         "&ingredients_text_" + encodeURIComponent(_lang) +
                                         "=" + encodeURIComponent($("#i" + _code).val());
                    log("getJSONList(urlList) > "+_url);
                    $("body").append('<div id="timed_alert_save_' + _code + '" class="timed_alert">Saving</div>');
                    var _d = $.getJSON(_url, function() {
                        log("getJSONList(urlList) > Save product ingredients");
                    })
                        .done(function(jqm2) {
                            log(jqm2.status_verbose);
                            log(jqm2);
                            $("#p_actions_sav_"+_code).removeClass("save_needs_clicking");
                            $("#timed_alert_save_" + _code).html('Saved!');
                            $("#timed_alert_save_" + _code).fadeOut(3000, function () { $(this).remove(); });
                        })
                        .fail(function() {
                            log("getJSONList(urlList) > fail");
                            $("#timed_alert_save_" + _code).html('Failed!');
                            $("#timed_alert_save_" + _code).addClass('failed');
                            $("#timed_alert_save_" + _code).fadeOut(3000, function () { $(this).remove(); });
                        });
                });

                // Delete ingredients field: https://world.openfoodfacts.net/cgi/product_jqm2.pl?code=0048151623426&ingredients_text=
                $("#p_actions_del_"+local_code).click(function(){
                    //deleteProductField(productCode, field);
                    var _code = $(this).attr("value");
                    var _url = document.location.protocol + "//" + document.location.host + "/cgi/product_jqm2.pl?code=" + _code + "&ingredients_text=";
                    log("getJSONList(urlList) > "+_url);
                    var _d = $.getJSON(_url, function() {
                        log("getJSONList(urlList) > Delete product ingredients");
                    })
                        .done(function(jqm2) {
                            log(jqm2.status_verbose);
                            log(jqm2);
                            $("#i"+_code).empty();
                        })
                        .fail(function() {
                            log("getJSONList(urlList) > fail");
                        });
                });
            });
            toggleIngredientsMonospace();
            return data;
        });
    }


    // Show pop-up
    function showPowerUserInfo(message) {
        log("showPowerUserInfo(message) > "+$("#power-user-help"));
        // Inspiration: http://christianelagace.com
        // If not already exists, create div for popup
        if($("#power-user-help").length === 0) {
            $('body').append('<div id="power-user-help" title="Information"></div>');
            $("#power-user-help").dialog({autoOpen: false});
        }

        $("#power-user-help").html(message);

        // transforme la division en popup
        let popup = $("#power-user-help").dialog({
            autoOpen: true,
            width: 400,
            dialogClass: 'dialogstyleperso',
        });
        // add style if necessarry
        //$("#power-user-help").prev().addClass('ui-state-information');
        return popup;
    }


    // Toggle popup
    function togglePowerUserInfo(message) {
        if ($("#power-user-help").dialog( "isOpen" ) === true) {
            $("#power-user-help").dialog( "close" );
            return false;
        } else {
            return showPowerUserInfo(message);
        }
    }



    function toggleIngredientsMode() {
        //
        log("Ingredients mode");
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



    /**
     * Hide/show example text below editing fields,
     * and store the setting from the popup checkbox in local storage.
     */
    function toggleDFMode() {

        // read setting from local storage
        log("toggleDFMode() > DFMode: " + getLocalStorage("pus-dist-free"));
        if(getLocalStorage("pus-dist-free") === "checked") {
            $('#pus-dist-free').removeAttr('checked'); // set checkbox state
            $('#offNav').hide();
            $('#prodNav').css("margin-top", "0px");
        }

        // hide/unhide field helpers on toggling the checkbox
        $('#pus-dist-free').change(function() {
            if(this.checked) {
                localStorage.setItem('pus-dist-free', "checked");
                log("toggleDFMode() > DFMode on");
                $('#offNav').hide();
                $('#prodNav').css("margin-top", "0px");
            }
            else {
                localStorage.setItem('pus-dist-free', "unchecked");
                log("toggleDFMode() > DFMode off");
                $('#offNav').show();
                $('#prodNav').css("margin-top", "82px");
            }
        });
    }



    /**
     * Hide/show example text below editing fields,
     * and store the setting from the popup checkbox in local storage.
     */
    function toggleHelpers() {

        // read setting from local storage
        log("toggleHelpers() > Helpers: " + getLocalStorage("pus-helpers"));
        if(getLocalStorage("pus-helpers") === "unchecked") {
            $('#pus-helpers').removeAttr('checked'); // set checkbox state
            $('.note').hide();
            $('.example').hide();
        }

        // hide/unhide field helpers on toggling the checkbox
        $('#pus-helpers').change(function() {
            if(this.checked) {
                localStorage.setItem('pus-helpers', "checked");
                log("toggleHelpers() > Show helpers");
                $('.note').show();
                $('.example').show();
            }
            else {
                localStorage.setItem('pus-helpers', "unchecked");
                log("toggleHelpers() > Hide helpers");
                $('.note').hide();
                $('.example').hide();
            }
        });
    }


    /**
     * Optionally set the ingredients box font to monospace,
     * to more easily see OCR errors like "com" vs "corn", uppercase "I" vs lowercase "l", etc.
     * and store the setting from the popup checkbox in local storage.
     */
    function toggleIngredientsMonospace() {

        // read setting from local storage
        log("toggleIngredientsMonospace() > Monospace: " + getLocalStorage("pus-ingredients-font"));
        if(getLocalStorage("pus-ingredients-font") === "monospace") {
            $('#pus-ingredients-font').prop("checked", true); // set checkbox state
            $("textarea[id^='ingredients_text_']").addClass("monospace"); // edit view
            $("div.wrap_ingr > textarea.ingr").addClass("monospace"); // list view
        }

        // change the textarea font on toggling the checkbox
        $('#pus-ingredients-font').change(function() {
            if(this.checked) {
                localStorage.setItem('pus-ingredients-font', "monospace");
                log("toggleIngredientsMonospace() > monospace font");
                $("textarea[id^='ingredients_text_']").addClass("monospace"); // edit view
                $("div.wrap_ingr > textarea.ingr").addClass("monospace"); // list view
            }
            else {
                localStorage.setItem('pus-ingredients-font', "default");
                log("toggleIngredientsMonospace() > default font");
                $("textarea[id^='ingredients_text_']").removeClass("monospace"); // edit view
                $("div.wrap_ingr > textarea.ingr").removeClass("monospace"); // list view
            }

        });
    }


    /**
     * Show/hide a graphical barcode on the product view
     */
    function showSingleBarcode(code) {
        if ($("#barcode_draw").length) { return; }

        $('<svg id="barcode_draw"></svg>').insertAfter('#barcode_paragraph');

        let barcode_format = 'CODE128';
        switch (code.length) {
            case 13:
                barcode_format = 'EAN13';
                break;
            case 12:
                barcode_format = 'UPC';
                break;
            case 8:
                barcode_format = 'EAN8';
                break;
        }

        JsBarcode("#barcode_draw", code, {
            format: barcode_format,
            lineColor: "black",
            width: 3,
            height: 60,
            displayValue: true,
        });
    }

    function hideSingleBarcode(code) {
        $("#barcode_draw").remove();
    }

    function toggleSingleBarcode(code) {
        if ($("#barcode_draw").length) {
            hideSingleBarcode(code);
        } else {
            showSingleBarcode(code);
        }
    }


    /**
     * Show/hide graphical barcodes on the list view
     */
    function toggleListBarcodes() {
        if ($("svg.list_barcode").length) {
            hideListBarcodes();
        } else {
            showListBarcodes();
        }
    }

    function showListBarcodes() {
        $("ul[id^='products_'].search_results li[data-code]").each(function(index, element) {
            let code = $(this).attr('data-code');
            if ($("#barcode_draw_" + code).length) { return; }

            $('<svg id="barcode_draw_' + code + '" class="list_barcode"></svg>').insertBefore( $('a.list_product_a', this) );

            let barcode_format = 'CODE128';

            switch (code.length) {
                case 13:
                    barcode_format = 'EAN13';
                    break;
                case 12:
                    barcode_format = 'UPC';
                    break;
                case 8:
                    barcode_format = 'EAN8';
                    break;
            }

			try {            
				JsBarcode("#barcode_draw_" + code, code, {
					format: barcode_format,
					flat: true,
					fontSize: 10,
					lineColor: "black",
					width: 1,
					height: 40,
					displayValue: true,
				});
			}catch(error){
                console.error(error);
            }


            $('a.list_product_a', this).addClass('with_barcode');
        });
    }


    function hideListBarcodes() {
        $("svg.list_barcode").remove();
        $('ul[id^="products_"].search_results .with_barcode').removeClass('with_barcode');
    }


    /**
     * The product list view has no easy way to get the barcode for each entry,
     * so detect them from the link, and add an attribute to the LI tag recording the barcode for later use.
     */
    function addCodesToProductList() {
        //log("in addCodesToProductList()");
        $("ul[id^='products_'].search_results li").each(function() {
            //log(this);
            let product_url = $("a.list_product_a", this).attr('href'); // find URL within "this"
            let product_code = product_url.match(/\/([0-9]+)(\/|$)/); // find a number surrounded by slashes
            if (product_code && product_code[1]) {
                $(this).attr('data-code', product_code[1]);
            }
        });
    }


    /**
     * Get an array of barcodes for the current list view.
     * Read barcodes out of data attributes added by addCodesToProductList()
     * @return {Array}
     */
    /*
    function getCodesFromProductList() {
        let product_codes = new Array();
        $("ul.products li").each(function() {
            product_codes.push($(this).attr('data-code'));
        });
        return product_codes;
    }
    */


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
            log("version_date: "); log(version_date);
            flagRevision(rev);
        }
        else {
            var _url = "/api/v0/product/" + code + ".json";
            $.getJSON(_url, function(data) {
                rev = data.product.rev;
                log("rev: "); log(rev);
                version_user = data.product.last_editor;
                log("version_user: "); log(version_user);
                var last_modified_t = new Date(data.product.last_modified_t*1000);
                version_date = last_modified_t.toISOString();
                log("version_date: "); log(version_date);
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
        var googleScriptURL = corsProxyURL+"https://script.google.com/macros/s/AKfycbwi9tIOPc7zh2NggDuq8geTSZqdZ470unBWUi4KV4AwYzCTNO8/exec";
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
        log(form);
        form.addEventListener('submit', e => {
            log("Submited rev "+rev);
            e.preventDefault();  // Do not submit the form
            fetch(googleScriptURL, {
                method: 'POST',
                mode: 'cors',
                body: new FormData(form)
            })
            .then(function(response) {
                log('Success!', response);
                var spreadsheetURL = 'https://docs.google.com/spreadsheets/d/1DE85Or0QiYwIXcG4vSVZyFSLMKvmJqOXM5ooJzxZr6Y/';
                $("#flag_result").append('<p style="margin-top:1rem;font-weight: bold;">' +
                                         '✅ Version ' +
                                         '<a href="' + spreadsheetURL + '" style="color:blue" target="_blank">' +
                                         'flagged</a>.</p>');
                return;})
            .catch(error => console.error('Error!', error.message));
        });
    }




    // https://fr.openfoodfacts.org/etat/marques-a-completer/code/506036745xxxx&json=1
    function getNumberOfProductsWithSimilardCodeAndWithoutBrand(codeToCheck) {
        //

    }



    /**
     * Display the quality tags in "product issues" section (#issues id)
     * Examples:
     * * Quality error tags: No quality errors
     * * Quality warnings tags: en:ecoscore-origins-of-ingredients-origins-are-100-percent-unknown ◼ en:ecoscore-packaging-packaging-data-missing
     *
     * See also: https://github.com/openfoodfacts/openfoodfacts-server/issues/7718
     *
     * @returns none
     */
    function addQualityTags() {
        // TODO: use fetch instead of $.getJSON (faster + no dependencies)
        $.getJSON(apiProductURL, function(data) {
            var qualityErrorsTagsArray = data.product.data_quality_errors_tags;
            log("addQualityTags() > qualityErrorsTagsArray: ");
            log(qualityErrorsTagsArray);
            var list = (qualityErrorsTagsArray.length === 0 ?
                        ('<span style="color: green">No quality errors</span>') :
                        //('<span style="color: red">' + qualityErrorsTagsArray.join(' ◼ ') + '</span>')
                        ('')
                       );
            $("#issues").append('<li id="qualityErrorsTags">Quality error tags: ' + list + '</li>');

            var qualityWarningsTagsArray = data.product.data_quality_warnings_tags;
            log("addQualityTags() > qualityWarningsTagsArray: ");
            log(qualityWarningsTagsArray);
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
     * See also: https://github.com/openfoodfacts/openfoodfacts-server/issues/7718
     *
     * @returns none
     */
    function addStateTags() { // TODO: merge with addQualityTags function?
        // TODO: use fetch instead of $.getJSON (faster + no dependencies)
        $.getJSON(apiProductURL, function(data) {
            var stateTagsArray = data.product.states_tags;
            log("addStateTags() > stateTagsArray: ");
            log(stateTagsArray);
            //var list = '<ul><li>' + arr.join('</li><li>') + '</li></ul>';
            var filteredStateTagsArray = keepMatching(stateTagsArray, /(.*)to-be(.*)/);
            var finalArray = replaceInsideArray(filteredStateTagsArray, /en\:/, '');
            finalArray = replaceInsideArray(finalArray, /to-be-completed/, '');
            finalArray = replaceInsideArray(finalArray, /\-/g, ' ');
            log(finalArray);
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
        log("isNbOfSimilarNamedProductsWithoutACategory() > url: " + url);
        $.getJSON(url + "&json=1", function(data) {
            var nbOfSimilarNamedProductsWithoutACategory = data.count;
            log("isNbOfSimilarNamedProductsWithoutACategory() > nbOfSimilarNamedProductsWithoutACategory: " + nbOfSimilarNamedProductsWithoutACategory);
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
        log("getSimilarlyNamedProductsWithoutCategorySearchURL() > productName: "+productName);
        log("getSimilarlyNamedProductsWithoutCategorySearchURL() > similarProductsSearchURL: "+similarProductsSearchURL);
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
     * See also https://github.com/openfoodfacts/openfoodfacts-server/pull/4533/files
     *
     * @returns  {String} - Type of page: api|saved-product page|edit|list|search form|product view|error page
     */
    function isPageType() {
        // Detect API page. Example: https://world.openfoodfacts.org/api/v0/product/3599741003380.json
        var regex_api = RegExp('api/v0/');
        if(regex_api.test(document.URL) === true) return "api";

        // Detect producers platform
        var regex_pro = RegExp('\.pro\.open');
        if(regex_pro.test(document.URL) === true) proPlatform = true;

        // Detect "edit" mode.
        var regex = RegExp('product\\.pl');
        if(regex.test(document.URL) === true) {
            if ($("body").hasClass("error_page")) return "error page"; // perhaps a more specific test for product-not-found?
            if (!$("#sorted_langs").length) return "saved-product page"; // Detect "Changes saved." page
            else return "edit";
        }

        // Detect other error pages
        if ($("body").hasClass("error_page")) return "error page";

        // Detect page containing a list of products (home page, search results...)
        if ($("body").hasClass("products_page") || $("body").hasClass("list_of_products_page")) return "list";

        // Detect search form
        var regex_search = RegExp('cgi/search.pl$');
        if(regex_search.test(document.URL) === true) return "search form";

        // Detect recentchanges
        if ($("body").hasClass("recent_changes_page")) return "recent changes";

        //Detect if in the list of ingredients
        regex_search = RegExp('ingredients');
        if(regex_search.test(document.URL) === true) return "ingredients";

        // Finally, it's a product view
        if ($("body").hasClass("product_page")) return "product view";
    }



    /**
     * detectLanguages: detects which kind of page has been loaded
     *
     * @returns  {Array} - array of all languages available for a product; ex. ["de","fr","en"]
     */
    function detectLanguages() {
        log("detectLanguages() > detectLanguages: ");
        var array = $("#sorted_langs").val().split(",");
        log(array);
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
        log("getIngredientsFromGCV(code,lc) > ingredientsURL: "+ingredientsURL);
        $.getJSON(ingredientsURL, function(json) {
            $("#ingredientFromGCV").append(json.ingredients_text_from_image);
        });
    }


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
        log("getConnectedUserID() > user_name: "); log(user_name);
        return user_name;
    }



    /**
     * normalizeTagName: returns a normalized version of a tag
     *
     * @param    {string} tagName: tag to normalize;  eg. "Cereal bars", "Marque Repère", "Trader Joe's"
     * @returns  {String} normalized tagName;         eg. "cereal-bars", "marque-repere", "trader-joe-s"
     */
    function normalizeTagName(tagName) {
        tagName = tagName.toLowerCase();
        tagName = tagName.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Accentued chars
        tagName = tagName.replace(/[ '"&]/mg, "-");   // "Kellog's" => kellog-s
        tagName = tagName.replace(/-+/mg, "-");       // "Elle & Vire" => "elle-vire"
        log("normalizeTagName() - tagName: " + tagName);
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
        //log("productExists( "+urlToCheck+" )");
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
                log("productExists( "+urlToCheck+" ) > success - xhr.status: " + xhr.status);
                if(xhr.status) $(id).text(xhr.status);
            },
            statusCode: {
                404: function(xhr, textStatus) {
                    log( "productExists( "+urlToCheck+" ) > 404 > " + xhr.status);
                    if(xhr.status) $(id).text(xhr.status);
                },
                200: function(xhr, textStatus) {
                    log( "productExists( "+urlToCheck+" ) > 200 > " + xhr.status);
                    if(xhr.status) $(id).text(xhr.status);
                }
            }
        })
            .always(function (xhr, textStatus) {
            log("productExists( "+urlToCheck+" ) > always - xhr.status: " + xhr.status);
            //log("productExists( "+urlToCheck+" ) > always - getAllResponseHeaders(): " + xhr.getAllResponseHeaders());
            if(xhr.status) $(id).text(xhr.status);
        });
    }


    /**
     * Move products between sites
     */
    function moveProductToSite(_code, newSite) {
        if (/^(obf|off|opf|opff)$/.test(newSite) !== true) {
            log("moveProductToSite() > invalid site: " + newSite);
            return false;
        }

        if (!_code) {
            log("moveProductToSite() > missing barcode");
            return false;
        }

        var _url = encodeURI(document.location.protocol + "//" + document.location.host +
                             "/cgi/product_jqm.pl?type=edit&code=" + _code + "&new_code=" + newSite);
        log("api call-> "+_url);
        $("body").append('<div id="timed_alert_move_' + _code + '" class="timed_alert">Moving</div>');
        var _d = $.getJSON(_url, function() {
            log("getJSONList(urlList) > Move to " + newSite );
        })
        .done(function(jqm2) {
            log(jqm2.status_verbose);
            log(jqm2);
            if (jqm2.status == 1 || jqm2.status_verbose == 'not modified') {
                $("#timed_alert_move_" + _code).html('Moved!');
            } else {
                $("#timed_alert_move_" + _code).html('Failed!');
                $("#timed_alert_move_" + _code).addClass('failed');
            }
            $("#timed_alert_move_" + _code).fadeOut(3000, function () { $(this).remove(); });
        })
        .fail(function() {
            log("getJSONList(urlList) > fail");
            $("#timed_alert_move_" + _code).html('Failed!');
            $("#timed_alert_move_" + _code).addClass('failed');
            $("#timed_alert_move_" + _code).fadeOut(3000, function () { $(this).remove(); });
        });
    }


    /* *****************************************************************************************
     * Edition context. Below are functions which are useful in edition mode.
     */

    /***
     * computeEnergy:
     *                The energy of a given product is computed based on INCO european regulation (see Annex XIV).
     *                The formula is: ((carb - polyols)*17) + (polyols * 10) + (proteins * 17) + (fat * 37) + (fiber * 8) + (alcohol * 29)
     *                or: ((carb - polyols)*4) + (polyols * 2.4) + (proteins * 4) + (fat * 9) + (fiber * 2) + (alcohol * 7)
     *
     * @param {string} servingSize: value of the servingSize
     * @returns: none
     */
    function computeEnergy() {
        //log("computeEnergy");
        let fat = readAndNormalizeNutrient("nutriment_fat");
        let carb = readAndNormalizeNutrient("nutriment_carbohydrates");
        let proteins = readAndNormalizeNutrient("nutriment_proteins");
        let polyols = readAndNormalizeNutrient("nutriment_polyols");
        let fiber = readAndNormalizeNutrient("nutriment_fiber");
        let alcohol = readAndNormalizeNutrient("nutriment_alcohol");
        let computed_kj = ((carb - polyols)*17) + (polyols * 10) + (proteins * 17) + (fat * 37) + (fiber * 8) + (alcohol * 29);
        computed_kj = computed_kj % 1 !== 0 ? computed_kj.toFixed(2) : computed_kj.toString();
        // Display computed KJ near "Energy (kJ)*" label
        document.getElementById("computed_kj").innerText = "["+computed_kj+"]";
    }



    /***
     * readAndNormalizeNutrient: read nutrient from its field and remove "<" or "-"
     *                           or return 0 to allow its use in computations.
     *
     * @param {string} nutrient: id of the nutrient
     * @returns {int} value of the nutrient or 0
     */
    function readAndNormalizeNutrient(nutrient) {
        let nutrientValue = (document.getElementById(nutrient) || {}).value || "0";
        nutrientValue = (nutrientValue == "-") ? "0" : nutrientValue;
        return parseFloat(nutrientValue.trim().replace("<", ""));
    }



    /***
     * checkServingSize: check if serving size contains a right value; otherwise, highlight the field
     *                   and add a interrogation mark associated with a tooltip.
     *
     * @param {string} servingSize: value of the servingSize
     * @returns: none
     */
    function checkServingSize(servingSize) {
        log("checkServingSize - serving size val: " + servingSize);
        const servingSizeElement = document.getElementById("serving_size");
        if (servingSize.length == 0) {
            servingSizeElement.style.setProperty("background-color", "LightYellow", "important");
            document.getElementById("serving_size_help") != null ? document.getElementById("serving_size_help").remove() : false;
            return;
        }
        const regex = /\d+(\.\d+)? ?(kg|g|dg|cg|mg|mcg|l|dl|cl|ml|fl|oz)(\W+.*)?$/gi; // Examples matching: 60 g, 12 oz, 20cl, 2 fl oz
        if (regex.test(servingSize) === false) {
            log("checkServingSize - serving size is not correct!");
            servingSizeElement.style.setProperty("background-color", "orange", "important");
            servingSizeElement.style.setProperty("display", "inline");
            if(document.getElementById("serving_size_help") == null) {
                const servingSizeHelp = '<strong id="serving_size_help" href="#serving_size_help" title="Serving size needs a value. Leave it empty otherwise."> (?) <br></strong>';
                servingSizeElement.insertAdjacentHTML("afterend", servingSizeHelp);
                document.getElementById("serving_size_help").style.setProperty("cursor", "pointer");
            }
        }
        else {
            servingSizeElement.style.setProperty("background-color", "LightYellow", "important");
            document.getElementById("serving_size_help") != null ? document.getElementById("serving_size_help").remove() : false;
        }
    }



    /***
     * checkFiber
     *
     * @param {string} f: value of fiber
     * @returns: none
     */
    function checkFiber(f) {
        log("fiber val: " + f);
        if (f.length == 0) {
            log("fiber empty!");
            $("#nutriment_fiber").css({"background-color": "orange"});
            if($('#fiber_help').length == 0) {
                $("#nutriment_fiber").after('<strong id="fiber_help" href="#fiber_help" title="Put a hyphen (-) if no fibers are on the packaging"> (?) </strong>');
                $('#fiber_help').css('cursor', 'pointer');
            }
        }
        else {
            $("#nutriment_fiber").css({"background-color": "LightYellow"});
            if($('#fiber_help').length != 0) {
                $("#fiber_help").remove();
            }
        }
    }



    /***
     * reverseKJKcal
     *
     * @returns  none
     */
    function reverseKJKcal() {
        log("reverseKJKcal()");
        // Read the values
        let joules = document.getElementById('nutriment_energy-kj').value;
        let calories = document.getElementById('nutriment_energy-kcal').value;
        // Change the values
        document.getElementById("nutriment_energy-kj").value = calories;
        document.getElementById("nutriment_energy-kcal").value = joules;
        // After change, check if kJ and Kcal are coherent
        checkKJ();
    }



    /***
     * checkKJ
     *
     * @returns  none
     */
    function checkKJ() {
        // If not already displayed, add the small icon to allow changing kJ to Kcal: ⇅
        if(!document.getElementById('kjtokcal')) {
            const reverseIcon = '<strong id="kjtokcal" href="#kjtokcal" title="Reverse the kj/kcal values"> ⇅ </strong>';
            document.getElementById("nutriment_energy-kj").insertAdjacentHTML("afterend", reverseIcon);
            document.getElementById('kjtokcal').style.setProperty("cursor", "pointer");
            document.getElementById("kjtokcal").addEventListener("click", function() {
            //document.getElementById('kjtokcal').click(function(){
                reverseKJKcal();
            });
        }
        const j = document.getElementById('nutriment_energy-kj').value;
        const c = document.getElementById('nutriment_energy-kcal').value;
        log("checkKJ() - kJ: " + j + ", kcal: " + c);
        // If either KJ or Kcal does not exist: compute the missing value
        if (j == "" && c != "") {
            const cj = (c * 4.4).toFixed();
            document.getElementById('kjtokcal').title = "Reverse the kj/kcal values -- kcal: " + c + "; computed kJ: ~" + cj;
        }
        if (c == "" && j != "") {
            const cc = (j / 4.4).toFixed();
            document.getElementById('kjtokcal').title = "Reverse the kj/kcal values -- kJ: " + j + "; computed kcal: ~" + cc;
        }
        if (c != "" && j != "") {
            const ratio = (j / c).toFixed(1);
            document.getElementById("kjtokcal").title = "Reverse the kj/kcal values -- ratio Kj/kcal (should be 4.4): " + ratio;
            (ratio >= 4.8 || ratio <= 4.0) ?
                document.getElementById('kjtokcal').style.color = "red" : document.getElementById('kjtokcal').style.color = "black";
        }
        // CAREFUL: all of this might be false if values are per serving!!!!
        /*
        if (parseInt(j) < parseInt(c)) {
            log("kj < kcal: " + j + " < " + c);
            $("#nutriment_energy-kj").css({"background-color": "orange"});
            $("#nutriment_energy-kcal").css({"background-color": "orange"});
            /*if($('#kjtokcal').length == 0) {
                $("#nutriment_energy-kj").after('<strong id="kjtokcal" href="#kjtokcal" title="Reverse the kj/kcal values"> ⇅ </strong>');
            }
            $('#kjtokcal').css('cursor', 'pointer');
            $("#kjtokcal").click(function(){
                $("#nutriment_energy-kj").attr("value", c);
                $("#nutriment_energy-kcal").attr("value", j);
                kj   = $("#nutriment_energy-kj").attr("value");
                kcal = $("#nutriment_energy-kcal").attr("value");
                checkKJ(kj, kcal);
            });/*
        }
        log(typeof $("#nutriment_energy-kcal").attr("value") + ", " + typeof $("#nutriment_energy-kj").attr("value"));
        if ($("#nutriment_energy-kcal").attr("value") === "" || (parseInt(j) > parseInt(c) && $("#nutriment_energy-kcal").attr("value") < 910)) {
            log("ok");
            $("#nutriment_energy-kcal").css({"background-color": "LightYellow"});
        }
        if ($("#nutriment_energy-kj").attr("value") === "" || (parseInt(j) > parseInt(c) && $("#nutriment_energy-kj").attr("value") < 3800)) {
            $("#nutriment_energy-kj").css({"background-color": "LightYellow"});
        }/**/
    }



    /* *****************************************************************************************
     * Functions which are useful in any context
     */

    /***
     * Log things
     * @param    {string} id: HTML id where to publish the result; example: "obfLinkStatus"
     * @returns  none
     */
    function log(thing) {
        // Log data if "log" variable set to true,
        // and add "[PUS]" to allow filtering in the browser console
        if (log_to_console) {
            console.log("[PUS]", thing);
        }
    }

})();
